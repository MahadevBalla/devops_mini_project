"""tests/test_mf_xray.py — deterministic, no LLM/DB/network."""
import os
import sys
from datetime import date

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from finance.mf_xray import (
    _infer_category,
    analyse_portfolio,
    compute_xirr,
    detect_overlap,
    generate_rebalancing_suggestions,
)
from models.schemas import MFHolding


def make_holding(scheme_name="Test Fund", isin="INF000001234", units=100.0, avg_nav=100.0, current_nav=120.0, category="Equity", expense_ratio=None) -> MFHolding:
    return MFHolding(scheme_name=scheme_name, isin=isin, units=units, avg_nav=avg_nav, current_nav=current_nav, invested_amount=units * avg_nav, current_value=units * current_nav, category=category, expense_ratio=expense_ratio)


class TestInferCategory:
    def test_liquid(self): assert _infer_category("Parag Parikh Liquid Fund") == "Liquid"
    def test_debt(self): assert _infer_category("HDFC Short Duration Debt Fund") == "Debt"
    def test_index(self): assert _infer_category("UTI Nifty 50 Index Fund") == "Index/ETF"
    def test_smallcap(self): assert _infer_category("Nippon Small Cap Fund") == "Small Cap"
    def test_largecap(self): assert _infer_category("Axis Bluechip Fund") == "Large Cap"
    def test_hybrid(self): assert _infer_category("ICICI Balanced Advantage Fund") == "Hybrid"
    def test_default(self): assert _infer_category("Random Growth Opportunities Fund") == "Equity"


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
        cf = [(date(2020, 1, 1), -50_000), (date(2021, 1, 1), -50_000), (date(2023, 1, 1), 130_000)]
        xirr = compute_xirr(cf)
        assert xirr is not None and xirr > 0


class TestDetectOverlap:
    def test_same_large_cap_flagged_65pct(self):
        h = [make_holding("HDFC Top 100", isin="INF001", category="Large Cap"),
             make_holding("Axis Bluechip", isin="INF002", category="Large Cap")]
        pairs = detect_overlap(h)
        assert len(pairs) == 1 and pairs[0].overlap_percent == pytest.approx(65.0)

    def test_index_funds_80pct_overlap(self):
        h = [make_holding("UTI Nifty 50", isin="INF001", category="Index/ETF"),
             make_holding("HDFC Index Nifty", isin="INF002", category="Index/ETF")]
        assert detect_overlap(h)[0].overlap_percent == pytest.approx(80.0)

    def test_different_categories_no_overlap(self):
        h = [make_holding("UTI Nifty 50", isin="INF001", category="Index/ETF"),
             make_holding("HDFC Small Cap", isin="INF002", category="Small Cap")]
        assert len(detect_overlap(h)) == 0

    def test_debt_funds_excluded(self):
        h = [make_holding("Fund A", isin="INF001", category="Debt"),
             make_holding("Fund B", isin="INF002", category="Debt")]
        assert len(detect_overlap(h)) == 0


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
        assert any("expense" in s.lower() for s in generate_rebalancing_suggestions([], [], ["Fund: 1.5% TER"]))

    def test_clean_portfolio_no_fund_count_warning(self):
        h = [make_holding("Nifty 50 Index", category="Index/ETF"),
             make_holding("Debt Fund", isin="INF002", category="Debt")]
        assert not any("funds" in s for s in generate_rebalancing_suggestions(h, [], []))


class TestAnalysePortfolio:
    def test_absolute_return_correct(self):
        r = analyse_portfolio([make_holding(avg_nav=100.0, current_nav=120.0, units=100.0)])
        assert r.absolute_return_pct == pytest.approx(20.0)

    def test_zero_invested_no_error(self):
        r = analyse_portfolio([make_holding(avg_nav=0.0, current_nav=0.0, units=0.0)])
        assert r.absolute_return_pct == pytest.approx(0.0)

    def test_category_breakdown_sums_to_total(self):
        h = [make_holding("Eq", category="Equity", units=100, current_nav=100),
             make_holding("Debt", isin="INF002", category="Debt", units=50, current_nav=100)]
        r = analyse_portfolio(h)
        assert sum(r.category_breakdown.values()) == pytest.approx(r.total_current_value)

    def test_high_expense_fund_identified(self):
        h = [make_holding("Expensive Fund", expense_ratio=1.5),
             make_holding("Cheap Fund", isin="INF002", expense_ratio=0.2)]
        r = analyse_portfolio(h)
        assert "Expensive Fund" in r.high_expense_funds
        assert "Cheap Fund" not in r.high_expense_funds

    def test_xirr_none_without_cashflows(self):
        assert analyse_portfolio([make_holding()]).overall_xirr is None

    def test_xirr_computed_with_cashflows(self):
        cf = [(date(2022, 1, 1), -100_000), (date(2023, 1, 1), 112_000)]
        assert analyse_portfolio([make_holding()], cash_flows=cf).overall_xirr is not None
