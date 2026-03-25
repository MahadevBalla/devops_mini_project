"""
tests/test_mf_xray.py — deterministic, no LLM/DB/network.
"""

import os
import sys
from datetime import date

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from finance.mf_xray import (
    _csv_rows_to_holdings,
    _infer_category,
    analyse_portfolio,
    compute_xirr,
    detect_overlap,
    generate_rebalancing_suggestions,
    parse_cams_csv,
)
from models.schemas import MFHolding


def make_holding(
    scheme_name="Test Fund",
    isin="INF000001234",
    units=100.0,
    avg_nav=100.0,
    current_nav=120.0,
    category="Equity",
    expense_ratio=None,
) -> MFHolding:
    return MFHolding(
        scheme_name=scheme_name,
        isin=isin,
        units=units,
        avg_nav=avg_nav,
        current_nav=current_nav,
        invested_amount=units * avg_nav,
        current_value=units * current_nav,
        category=category,
        expense_ratio=expense_ratio,
    )


# Category inference
class TestInferCategory:
    def test_liquid(self):
        assert _infer_category("Parag Parikh Liquid Fund") == "Liquid"

    def test_debt(self):
        assert _infer_category("HDFC Short Duration Debt Fund") == "Debt"

    def test_index(self):
        assert _infer_category("UTI Nifty 50 Index Fund") == "Index/ETF"

    def test_smallcap(self):
        assert _infer_category("Nippon Small Cap Fund") == "Small Cap"

    def test_largecap(self):
        assert _infer_category("Axis Bluechip Fund") == "Large Cap"

    def test_hybrid(self):
        assert _infer_category("ICICI Balanced Advantage Fund") == "Hybrid"

    def test_default(self):
        assert _infer_category("Random Growth Opportunities Fund") == "Equity"


# XIRR
class TestXIRR:
    def test_single_cashflow_returns_none(self):
        assert compute_xirr([(date(2023, 1, 1), -100_000)]) is None

    def test_empty_returns_none(self):
        assert compute_xirr([]) is None

    def test_positive_return(self):
        xirr = compute_xirr([(date(2022, 1, 1), -100_000), (date(2023, 1, 1), 112_000)])
        assert xirr is not None and xirr == pytest.approx(0.12, abs=0.01)

    def test_negative_return(self):
        xirr = compute_xirr([(date(2022, 1, 1), -100_000), (date(2023, 1, 1), 90_000)])
        assert xirr is not None and xirr < 0

    def test_multi_cashflow_positive(self):
        cf = [
            (date(2020, 1, 1), -50_000),
            (date(2021, 1, 1), -50_000),
            (date(2023, 1, 1), 130_000),
        ]
        xirr = compute_xirr(cf)
        assert xirr is not None and xirr > 0


# XIRR edge cases
class TestXIRREdgeCases:
    def test_all_negative_cash_flows_returns_none(self):
        """Only outflows with no redemption/current-value row — XIRR undefined."""
        cf = [(date(2022, 1, 1), -100_000), (date(2023, 1, 1), -50_000)]
        assert compute_xirr(cf) is None

    def test_all_positive_cash_flows_returns_none(self):
        """All inflows — no purchase leg — XIRR undefined."""
        cf = [(date(2022, 1, 1), 100_000), (date(2023, 1, 1), 50_000)]
        assert compute_xirr(cf) is None

    def test_very_high_return_converges(self):
        """
        5× return in 6 months ≈ 3,000%+ annualised XIRR.
        The dynamic upper-bound widening must find and converge to this.
        """
        cf = [(date(2023, 1, 1), -10_000), (date(2023, 7, 1), 50_000)]
        xirr = compute_xirr(cf)
        assert xirr is not None, "Expected XIRR to converge for high-return case"
        assert xirr > 1.0, f"Expected XIRR > 100% annualised, got {xirr:.2%}"

    def test_breakeven_cashflows(self):
        """Exactly equal outflow and inflow 1 year apart → XIRR ≈ 0."""
        cf = [(date(2022, 1, 1), -100_000), (date(2023, 1, 1), 100_000)]
        xirr = compute_xirr(cf)
        assert xirr is not None and abs(xirr) < 0.01


# CAMS CSV parsing edge cases
class TestParseCAMSCSV:
    def test_empty_csv_returns_no_holdings(self):
        """Header-only CSV produces no holdings."""
        csv_bytes = b"scheme_name,isin,units\n"
        rows = parse_cams_csv(csv_bytes)
        assert _csv_rows_to_holdings(rows) == []

    def test_zero_unit_rows_are_skipped(self):
        """
        A row with closing_unit_balance=0.0 is a fully redeemed folio.
        It must not appear in the holdings list.
        """
        csv_bytes = (
            b"scheme_name,isin,closing_unit_balance,average_cost\nMy Fund,INF001A01234,0.0,100.0\n"
        )
        rows = parse_cams_csv(csv_bytes)
        assert len(_csv_rows_to_holdings(rows)) == 0

    def test_valid_row_produces_holding(self):
        csv_bytes = (
            b"scheme_name,isin,closing_unit_balance,average_cost\n"
            b"UTI Nifty 50 Index Fund,INF789F01234,50.0,200.0\n"
        )
        rows = parse_cams_csv(csv_bytes)
        holdings = _csv_rows_to_holdings(rows)
        assert len(holdings) == 1
        assert holdings[0].units == pytest.approx(50.0)
        assert holdings[0].invested_amount == pytest.approx(50.0 * 200.0)

    def test_mixed_zero_and_nonzero_rows(self):
        """Only non-zero rows should be returned."""
        csv_bytes = (
            b"scheme_name,isin,closing_unit_balance,average_cost\n"
            b"Fund A,INF001,100.0,150.0\n"
            b"Fund B,INF002,0.0,120.0\n"
            b"Fund C,INF003,75.5,180.0\n"
        )
        rows = parse_cams_csv(csv_bytes)
        holdings = _csv_rows_to_holdings(rows)
        assert len(holdings) == 2
        assert all(h.units > 0 for h in holdings)


# Overlap detection
class TestDetectOverlap:
    def test_same_large_cap_flagged_65pct(self):
        h = [
            make_holding("HDFC Top 100", isin="INF001", category="Large Cap"),
            make_holding("Axis Bluechip", isin="INF002", category="Large Cap"),
        ]
        pairs = detect_overlap(h)
        assert len(pairs) == 1 and pairs[0].overlap_percent == pytest.approx(65.0)

    def test_index_funds_80pct_overlap(self):
        h = [
            make_holding("UTI Nifty 50", isin="INF001", category="Index/ETF"),
            make_holding("HDFC Index Nifty", isin="INF002", category="Index/ETF"),
        ]
        assert detect_overlap(h)[0].overlap_percent == pytest.approx(80.0)

    def test_different_categories_no_overlap(self):
        h = [
            make_holding("UTI Nifty 50", isin="INF001", category="Index/ETF"),
            make_holding("HDFC Small Cap", isin="INF002", category="Small Cap"),
        ]
        assert len(detect_overlap(h)) == 0

    def test_debt_funds_excluded(self):
        h = [
            make_holding("Fund A", isin="INF001", category="Debt"),
            make_holding("Fund B", isin="INF002", category="Debt"),
        ]
        assert len(detect_overlap(h)) == 0


# Rebalancing suggestions
class TestRebalancingSuggestions:
    def test_too_many_funds_flagged(self):
        h = [make_holding(f"Fund {i}", isin=f"INF00{i}") for i in range(8)]
        assert any("8 funds" in s for s in generate_rebalancing_suggestions(h, [], []))

    def test_no_index_fund_flagged(self):
        h = [make_holding("Active Large Cap", category="Large Cap")]
        assert any("index" in s.lower() for s in generate_rebalancing_suggestions(h, [], []))

    def test_no_debt_flagged(self):
        h = [make_holding("Equity Fund", category="Equity")]
        assert any("debt" in s.lower() for s in generate_rebalancing_suggestions(h, [], []))

    def test_high_expense_flagged(self):
        assert any(
            "expense" in s.lower()
            for s in generate_rebalancing_suggestions([], [], ["Fund: 1.5% TER"])
        )

    def test_clean_portfolio_no_fund_count_warning(self):
        h = [
            make_holding("Nifty 50 Index", category="Index/ETF"),
            make_holding("Debt Fund", isin="INF002", category="Debt"),
        ]
        assert not any("funds" in s for s in generate_rebalancing_suggestions(h, [], []))


# Portfolio analysis
class TestAnalysePortfolio:
    def test_absolute_return_correct(self):
        r = analyse_portfolio([make_holding(avg_nav=100.0, current_nav=120.0, units=100.0)])
        assert r.absolute_return_pct == pytest.approx(20.0)

    def test_zero_invested_no_error(self):
        r = analyse_portfolio([make_holding(avg_nav=0.0, current_nav=0.0, units=0.0)])
        assert r.absolute_return_pct == pytest.approx(0.0)

    def test_category_breakdown_sums_to_total(self):
        h = [
            make_holding("Eq", category="Equity", units=100, current_nav=100),
            make_holding("Debt", isin="INF002", category="Debt", units=50, current_nav=100),
        ]
        r = analyse_portfolio(h)
        assert sum(r.category_breakdown.values()) == pytest.approx(r.total_current_value)

    def test_high_expense_fund_identified(self):
        h = [
            make_holding("Expensive Fund", expense_ratio=1.5),
            make_holding("Cheap Fund", isin="INF002", expense_ratio=0.2),
        ]
        r = analyse_portfolio(h)
        assert "Expensive Fund" in r.high_expense_funds
        assert "Cheap Fund" not in r.high_expense_funds

    def test_xirr_none_without_cashflows(self):
        assert analyse_portfolio([make_holding()]).overall_xirr is None

    def test_xirr_computed_with_cashflows(self):
        cf = [(date(2022, 1, 1), -100_000), (date(2023, 1, 1), 112_000)]
        assert analyse_portfolio([make_holding()], cash_flows=cf).overall_xirr is not None
