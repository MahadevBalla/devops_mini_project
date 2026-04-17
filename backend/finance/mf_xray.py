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
from datetime import date, timedelta
from typing import Optional

import numpy_financial as npf
import pdfplumber
from scipy.optimize import brentq

from core.config import settings
from finance.amfi import enrich_holding_nav
from models import MFHolding, MFXRayResult, OverlapPair

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


def _synthesize_cash_flows(holdings: list[MFHolding]) -> list[tuple[date, float]]:
    """Approximate cash flows when no transaction history is available."""
    fallback = date.today() - timedelta(days=365)
    flows = [(fallback, -h.invested_amount) for h in holdings]
    flows.append((date.today(), sum(h.current_value for h in holdings)))
    return sorted(flows, key=lambda x: x[0])


# NAV enrichment helper
def _enrich(isin: str, scheme_name: str, units: float, avg_nav: float) -> dict:
    """
    Return current_nav, invested_amount, current_value with live NAV where available.
    Cost basis (invested_amount) always uses avg_nav from statement — never overwritten.
    """
    live_nav = enrich_holding_nav(isin, scheme_name, avg_nav)
    return {
        "current_nav": live_nav,
        "invested_amount": round(units * avg_nav, 2),
        "current_value": round(units * live_nav, 2),
    }


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


# Parse helpers
def _extract_float(row: dict, keys: list[str], default: str = "0") -> float:
    """Extract and convert a float value from row using fallback keys."""
    value = next((row.get(key) for key in keys if row.get(key)), default)
    return float(str(value).replace(",", ""))


def _extract_string(row: dict, keys: list[str], default: str = "") -> str:
    """Extract a string value from row using fallback keys."""
    return next((row.get(key) for key in keys if row.get(key)), default)


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


def _row_to_holding(row: dict, holding_index: int) -> MFHolding | None:
    """Parse a single normalised CSV row into an MFHolding, or return None to skip."""
    scheme = _extract_string(row, ["scheme_name", "scheme", "fund_name"], "Unknown Fund")
    isin = _extract_string(row, ["isin", "isin_div_reinv_flag"], f"UNKNOWN_{holding_index}")
    units = _extract_float(row, ["closing_unit_balance", "units"])
    csv_avg_nav = _extract_float(row, ["average_cost", "avg_nav", "purchase_nav"])
    csv_current_nav = _extract_float(row, ["nav", "current_nav", "latest_nav"])
    invested = _extract_float(row, ["cost_value", "invested_amount"])
    current = _extract_float(row, ["market_value", "current_value"])

    expense_ratio_raw = _extract_float(row, ["expense_ratio", "ter", "expense_ratio_%"], "0")
    expense_ratio = expense_ratio_raw if expense_ratio_raw > 0 else None

    if units == 0 and invested == 0:
        return None

    # derive avg_nav from cost data if not directly in CSV
    avg_nav = csv_avg_nav
    if avg_nav == 0 and units > 0 and invested > 0:
        avg_nav = round(invested / units, 4)

    # current_nav — AMFI live first, CSV nav fallback, never 0
    fallback_nav = csv_current_nav if csv_current_nav > 0 else avg_nav
    live_nav = enrich_holding_nav(isin, scheme, fallback_nav)
    if live_nav > 0:
        current_nav = live_nav
    elif csv_current_nav > 0:
        current_nav = csv_current_nav
    else:
        current_nav = avg_nav

    # current_value — prefer CSV market value, else compute
    current_value = current if current > 0 else round(units * current_nav, 2)

    return MFHolding(
        scheme_name=scheme,
        isin=isin,
        units=units,
        avg_nav=avg_nav,
        current_nav=current_nav,
        invested_amount=invested if invested > 0 else round(units * avg_nav, 2),
        current_value=current_value,
        category=_infer_category(scheme),
        expense_ratio=expense_ratio,
    )


def csv_rows_to_holdings(rows: list[dict]) -> list[MFHolding]:
    """Convert normalised CAMS CSV rows → MFHolding objects."""
    holdings: list[MFHolding] = []
    for row in rows:
        try:
            holding = _row_to_holding(row, len(holdings))
            if holding is not None:
                holdings.append(holding)
        except (ValueError, KeyError):
            continue
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


def parse_pdf_holdings(text: str) -> list[MFHolding]:
    """
    Heuristic extraction of holdings from CAMS PDF text.
    Looks for lines containing a valid ISIN and at least 3 numeric values.
    Live NAV from AMFI is injected via _enrich(); falls back to statement NAV silently.
    """
    holdings = []
    isin_pattern = re.compile(r"(IN[A-Z0-9]{10})")
    lines = text.split("\n")

    for line in lines:
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
            units, nav = floats[-3], floats[-2]
            scheme_name = line[: isin_match.start()].strip()
            holdings.append(
                MFHolding(
                    scheme_name=scheme_name or f"Fund ({isin})",
                    isin=isin,
                    units=units,
                    avg_nav=nav,
                    category=_infer_category(scheme_name),
                    **_enrich(isin, scheme_name or "", units, nav),
                )
            )
    return holdings


# Overlap detection
def detect_overlap(holdings: list[MFHolding]) -> list[OverlapPair]:
    """Category-based overlap heuristic.

    Cross-category rules added:
    - Index/ETF + Large Cap: ~65% overlap (both track Nifty 100 universe)
    - Index/ETF + Flexi Cap: ~45% overlap
    - Large Cap + Flexi Cap: ~40% overlap
    """
    equity_funds = [h for h in holdings if h.category not in ("Liquid", "Debt")]
    pairs: list[OverlapPair] = []
    _LARGE_CAP_STOCKS = ["HDFC Bank", "Reliance", "ICICI Bank", "Infosys", "TCS"]

    _OVERLAP_MATRIX: dict[tuple[str, str], float] = {
        ("Large Cap", "Large Cap"): 65.0,
        ("Index/ETF", "Index/ETF"): 80.0,
        ("Flexi/Multi Cap", "Flexi/Multi Cap"): 45.0,
        # Cross-category
        ("Index/ETF", "Large Cap"): 65.0,
        ("Large Cap", "Index/ETF"): 65.0,
        ("Index/ETF", "Flexi/Multi Cap"): 45.0,
        ("Flexi/Multi Cap", "Index/ETF"): 45.0,
        ("Large Cap", "Flexi/Multi Cap"): 40.0,
        ("Flexi/Multi Cap", "Large Cap"): 40.0,
    }

    for i in range(len(equity_funds)):
        for j in range(i + 1, len(equity_funds)):
            a, b = equity_funds[i], equity_funds[j]
            overlap_pct = _OVERLAP_MATRIX.get((a.category, b.category))
            if overlap_pct is not None:
                pairs.append(
                    OverlapPair(
                        fund_a=a.scheme_name,
                        fund_b=b.scheme_name,
                        overlap_percent=overlap_pct,
                        common_stocks=_LARGE_CAP_STOCKS,
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

    # Only suggest switching to direct if not already on direct plans
    regular_plan_funds = [
        h
        for h in holdings
        if "direct" not in h.scheme_name.lower()
        and h.expense_ratio is not None
        and h.expense_ratio > 0.5
    ]
    if regular_plan_funds and not high_expense:
        suggestions.append(
            f"{len(regular_plan_funds)} fund(s) appear to be regular plans — switch to direct to save ~0.5–1% p.a."
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

    overall_xirr = compute_xirr(cash_flows if cash_flows else _synthesize_cash_flows(holdings))
    overall_xirr_pct = round(overall_xirr * 100, 2) if overall_xirr is not None else None

    overlap_pairs = detect_overlap(holdings)
    high_expense = flag_high_expense(holdings)
    rebalancing = generate_rebalancing_suggestions(holdings, overlap_pairs, high_expense)

    category_breakdown: dict[str, float] = {}
    for h in holdings:
        category_breakdown[h.category] = category_breakdown.get(h.category, 0.0) + h.current_value

    return MFXRayResult(
        total_invested=round(total_invested, 0),
        total_current_value=round(total_current, 0),
        overall_xirr=overall_xirr_pct,
        benchmark_conservative=settings.BENCHMARK_NIFTY50_CONSERVATIVE,
        benchmark_base=settings.BENCHMARK_NIFTY50_BASE,
        benchmark_optimistic=settings.BENCHMARK_NIFTY50_OPTIMISTIC,
        xirr_vs_benchmark=(
            round(overall_xirr_pct - settings.BENCHMARK_NIFTY50_BASE, 2)
            if overall_xirr_pct is not None
            else None
        ),
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
