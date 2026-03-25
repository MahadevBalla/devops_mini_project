"""
finance/mf_xray.py
MF Portfolio X-Ray — parse CAMS/KFintech statements, compute XIRR,
detect overlap, expense drag, and generate rebalancing suggestions.

Supports:
  - CSV statements (CAMS consolidated)
  - PDF statements via pdfplumber (basic text extraction)
"""

from __future__ import annotations

import csv
import io
import logging
import re
from datetime import date
from typing import Optional

import numpy_financial as npf
import pdfplumber
from scipy.optimize import brentq

from models.schemas import MFHolding, MFXRayResult, OverlapPair

logger = logging.getLogger(__name__)

# High expense ratio detection
_HIGH_EXPENSE_THRESHOLD = 1.0  # % — anything above this is flagged


# XIRR
def compute_xirr(cash_flows: list[tuple[date, float]]) -> Optional[float]:
    """
    Compute XIRR from a list of (date, amount) pairs.
    Negative = outflow (purchase), Positive = inflow (redemption / current value).
    Returns annualised rate as a fraction (e.g. 0.15 for 15%) or None on failure.
    """
    if len(cash_flows) < 2:
        return None

    sorted_cf = sorted(cash_flows, key=lambda x: x[0])
    base_date = sorted_cf[0][0]
    dates_days = [(cf[0] - base_date).days for cf in sorted_cf]
    amounts = [cf[1] for cf in sorted_cf]

    # If all cash flows are the same sign, there is no valid XIRR solution
    if all(a >= 0 for a in amounts) or all(a <= 0 for a in amounts):
        return None

    def npv(rate: float) -> float:
        return sum(
            amt / ((1 + rate) ** (d / 365.0)) for amt, d in zip(amounts, dates_days) if d >= 0
        )

    # A fixed ceiling of 10.0 (1000%) fails for micro-cap funds or very
    # short investment periods with large gains (e.g. 5× in 6 months).
    # Double hi until NPV flips sign or we hit a safe ceiling of 1000.
    try:
        hi = 10.0
        while npv(hi) > 0 and hi < 1000:
            hi *= 2

        # Verify sign flip exists before calling brentq.
        # npv(-0.999) and npv(hi) must have opposite signs; if not, no root.
        if npv(-0.999) * npv(hi) >= 0:
            return None

        xirr = brentq(npv, -0.999, hi, maxiter=500)
        return round(xirr, 4) if -0.999 < xirr < hi else None
    except Exception:
        pass

    # Fallback: monthly-interpolated IRR via numpy_financial
    try:
        total_months = max(dates_days) // 30 or 1
        monthly = [0.0] * (total_months + 1)

        for amt, d in zip(amounts, dates_days):
            idx = min(d // 30, total_months)
            monthly[idx] += amt
        irr = npf.irr(monthly)

        # Explicit None + NaN guard + sanity range check
        if irr is None or irr != irr or not (-1 < irr < 100):
            return None
        return round((1 + irr) ** 12 - 1, 4)
    except Exception:
        return None


# CAMS CSV parser
def parse_cams_csv(content: bytes) -> list[dict]:
    """
    Parse CAMS consolidated account statement CSV.
    Returns list of raw transaction dicts.
    """
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for row in reader:
        normalised = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items()}
        rows.append(normalised)
    return rows


def _csv_rows_to_holdings(rows: list[dict]) -> list[MFHolding]:
    """
    Convert normalised CAMS CSV rows to MFHolding objects.
    Rows with zero or missing closing_unit_balance are skipped — they
    represent fully redeemed folios and contribute nothing to X-Ray analysis.
    """
    holdings = []
    for row in rows:
        try:
            units = float(row.get("closing_unit_balance", 0) or 0)
        except (ValueError, TypeError):
            units = 0.0

        if units <= 0:
            continue

        try:
            avg_nav = float(row.get("average_cost", 0) or 0)
            holdings.append(
                MFHolding(
                    scheme_name=row.get("scheme_name", "Unknown Fund"),
                    isin=row.get("isin", ""),
                    units=units,
                    avg_nav=avg_nav,
                    current_nav=avg_nav,
                    invested_amount=units * avg_nav,
                    current_value=units * avg_nav,
                    category=_infer_category(row.get("scheme_name", "")),
                )
            )
        except Exception as e:
            logger.warning("Skipping malformed CSV row: %s — %s", row, e)

    return holdings


# PDF parser
def parse_cams_pdf(content: bytes) -> str:
    """Extract raw text from CAMS PDF using pdfplumber."""
    try:
        text_parts = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts)
    except Exception as e:
        logger.warning("pdfplumber extraction failed: %s", e)
        return ""


def _parse_pdf_holdings(text: str) -> list[MFHolding]:
    """
    Heuristic extraction of holdings from CAMS PDF text.
    Looks for patterns like:
      SCHEME NAME  ISIN  UNITS  NAV  VALUE
    """
    holdings = []
    isin_pattern = re.compile(r"(IN[A-Z0-9]{10})")
    lines = text.split("\n")

    for i, line in enumerate(lines):
        isin_match = isin_pattern.search(line)
        if not isin_match:
            continue
        isin = isin_match.group(1)
        numbers = re.findall(r"[\d,]+\.?\d*", line)
        floats = []
        for n in numbers:
            try:
                floats.append(float(n.replace(",", "")))
            except ValueError:
                pass
        if len(floats) >= 3:
            units, nav, value = floats[-3], floats[-2], floats[-1]
            scheme_name = line[: isin_match.start()].strip()
            holdings.append(
                MFHolding(
                    scheme_name=scheme_name or f"Fund ({isin})",
                    isin=isin,
                    units=units,
                    avg_nav=nav,
                    current_nav=nav,
                    invested_amount=value,
                    current_value=value,
                    category=_infer_category(scheme_name),
                )
            )
    return holdings


# Category inference
def _infer_category(scheme_name: str) -> str:
    name = scheme_name.lower()
    if any(k in name for k in ["liquid", "overnight", "money market"]):
        return "Liquid"
    if any(k in name for k in ["debt", "bond", "gilt", "credit", "short duration", "low duration"]):
        return "Debt"
    if any(k in name for k in ["hybrid", "balanced", "asset alloc"]):
        return "Hybrid"
    if any(k in name for k in ["index", "nifty", "sensex", "etf"]):
        return "Index/ETF"
    if any(k in name for k in ["small cap", "smallcap"]):
        return "Small Cap"
    if any(k in name for k in ["mid cap", "midcap"]):
        return "Mid Cap"
    if any(
        k in name
        for k in [
            "large cap",
            "largecap",
            "bluechip",
            "top 100",
            "top100",
            "frontline",
            "focused 30",
            "top 200",
        ]
    ):
        return "Large Cap"
    if "flexi" in name or "multi cap" in name:
        return "Flexi/Multi Cap"
    return "Equity"


# Overlap detection (ISIN-based)

# Minimal overlap data — in production, fetch from MFAPI or amfiindia.com
# For hackathon: a small hardcoded overlap map for demo purposes
_KNOWN_OVERLAPS: dict[tuple[str, str], list[str]] = {
    # (isin_a, isin_b): [common_stock_names]
}


def detect_overlap(holdings: list[MFHolding]) -> list[OverlapPair]:
    """Category-based overlap heuristic (production: replace with MFAPI holdings data)."""
    equity_funds = [h for h in holdings if h.category not in ("Liquid", "Debt")]
    pairs: list[OverlapPair] = []

    for i in range(len(equity_funds)):
        for j in range(i + 1, len(equity_funds)):
            a, b = equity_funds[i], equity_funds[j]
            # Same category → likely high overlap
            if a.category == b.category and a.category in (
                "Large Cap",
                "Index/ETF",
                "Flexi/Multi Cap",
            ):
                if a.category == "Large Cap":
                    overlap_pct = 65.0
                elif a.category == "Index/ETF":
                    overlap_pct = 80.0
                else:
                    overlap_pct = 45.0
                pairs.append(
                    OverlapPair(
                        fund_a=a.scheme_name,
                        fund_b=b.scheme_name,
                        overlap_percent=overlap_pct,
                        common_stocks=["HDFC Bank", "Reliance", "ICICI Bank", "Infosys", "TCS"],
                    )
                )
    return pairs


def flag_high_expense(holdings: list[MFHolding]) -> list[str]:
    flagged = []
    for h in holdings:
        if h.expense_ratio and h.expense_ratio > _HIGH_EXPENSE_THRESHOLD:
            flagged.append(
                f"{h.scheme_name}: {h.expense_ratio:.2f}% TER — consider switching to direct plan or index fund"
            )
    return flagged


# Rebalancing suggestions
def generate_rebalancing_suggestions(
    holdings: list[MFHolding],
    overlap_pairs: list[OverlapPair],
    high_expense: list[str],
) -> list[str]:
    suggestions = []

    if len(holdings) > 6:
        suggestions.append(
            f"You hold {len(holdings)} funds — simplify to 4–5 core funds to reduce complexity and overlap"
        )

    if overlap_pairs:
        fund_names = ", ".join(p.fund_a.split()[0] for p in overlap_pairs[:2])
        suggestions.append(
            f"High overlap detected between {fund_names} — consolidate into one fund to reduce redundancy"
        )

    if high_expense:
        suggestions.append(
            f"{len(high_expense)} fund(s) have high expense ratios — switch to direct plans to save 0.5–1.5% p.a."
        )

    categories = {h.category for h in holdings}
    if "Index/ETF" not in categories:
        suggestions.append(
            "Add a Nifty 50 or Nifty Next 50 index fund for low-cost core equity exposure"
        )
    if "Debt" not in categories and "Liquid" not in categories:
        suggestions.append(
            "No debt allocation — add a short-duration debt fund for stability (10–20% of portfolio)"
        )

    return suggestions


# Main entry point
def analyse_portfolio(
    holdings: list[MFHolding],
    cash_flows: Optional[list[tuple[date, float]]] = None,
) -> MFXRayResult:
    total_invested = sum(h.invested_amount for h in holdings)
    total_current = sum(h.current_value for h in holdings)
    abs_return = (
        (total_current - total_invested) / total_invested * 100 if total_invested > 0 else 0.0
    )

    overall_xirr = compute_xirr(cash_flows) if cash_flows else None

    overlap_pairs = detect_overlap(holdings)
    high_expense = flag_high_expense(holdings)
    rebalancing = generate_rebalancing_suggestions(holdings, overlap_pairs, high_expense)

    category_breakdown: dict[str, float] = {}
    for h in holdings:
        category_breakdown[h.category] = category_breakdown.get(h.category, 0.0) + h.current_value

    return MFXRayResult(
        total_invested=round(total_invested, 0),
        total_current_value=round(total_current, 0),
        overall_xirr=round(overall_xirr * 100, 2) if overall_xirr is not None else None,
        absolute_return_pct=round(abs_return, 2),
        holdings=holdings,
        overlapping_pairs=overlap_pairs,
        category_breakdown={k: round(v, 0) for k, v in category_breakdown.items()},
        high_expense_funds=[
            h.scheme_name
            for h in holdings
            if h.expense_ratio and h.expense_ratio > _HIGH_EXPENSE_THRESHOLD
        ],
        rebalancing_suggestions=rebalancing,
    )
