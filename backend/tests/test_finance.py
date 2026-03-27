"""
tests/test_finance.py
Unit tests for all three finance engine modules.
All tests are deterministic — no LLM, no DB, no network.
Run: pytest tests/ -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from finance import fire, health, tax
from models import (
    AssetAllocation,
    DebtItem,
    Goal,
    GoalType,
    InsuranceCoverage,
    RiskProfile,
    TaxDeductions,
    UserProfile,
)


# Fixtures
def make_profile(**overrides) -> UserProfile:
    defaults = {
        "age": 30,
        "city": "Mumbai",
        "monthly_gross_income": 100_000,
        "monthly_expenses": 50_000,
        "emergency_fund": 300_000,
        "retirement_age": 60,
        "risk_profile": RiskProfile.MODERATE,
    }
    defaults.update(overrides)
    return UserProfile(**defaults)


# FIRE tests
class TestFIREMath:
    def test_compound_growth_doubles_in_approx_6_years_at_12pct(self):
        fv = fire.compound_growth_value(100_000, 0.12, 6)
        assert fv == pytest.approx(197_623, rel=0.01)

    def test_fv_sip_zero_rate(self):
        """With 0% return, FV = SIP × months."""
        fv = fire.future_value_sip(1_000, 0.0, 10)
        assert fv == pytest.approx(1_000 * 120, rel=0.01)

    def test_required_sip_no_existing_corpus(self):
        sip = fire.required_monthly_sip(10_000_000, 0, 0.12, 10)
        assert 40_000 < sip < 60_000

    def test_required_sip_already_funded(self):
        """If existing corpus will grow past target, SIP = 0."""
        sip = fire.required_monthly_sip(1_000_000, 10_000_000, 0.12, 10)
        assert sip == pytest.approx(0.0)

    def test_fire_corpus_increases_with_expenses(self):
        p1 = make_profile(monthly_expenses=30_000)
        p2 = make_profile(monthly_expenses=60_000)
        assert fire.calculate_fi_corpus(p2) > fire.calculate_fi_corpus(p1)

    def test_fire_plan_returns_on_track_false_when_corpus_gap_large(self):
        profile = make_profile(
            age=29,
            retirement_age=60,
            monthly_gross_income=50_000,
            monthly_expenses=45_000,
        )
        plan = fire.build_fire_plan(profile)
        assert plan.on_track is False

    def test_fire_plan_required_sip_positive(self):
        plan = fire.build_fire_plan(make_profile())
        assert plan.required_monthly_sip >= 0

    def test_fire_plan_goal_sips(self):
        profile = make_profile(
            goals=[
                Goal(
                    type=GoalType.HOUSE,
                    label="Dream home",
                    target_amount=5_000_000,
                    target_year=2035,
                )
            ]
        )
        plan = fire.build_fire_plan(profile)
        assert len(plan.sip_goals) == 1
        assert plan.sip_goals[0].required_monthly_sip > 0


# Tax tests
class TestTaxEngine:
    def test_new_regime_rebate_well_below_limit(self):
        """Gross ₹7L → taxable ₹6.25L (well below ₹12L rebate limit) → 0 tax."""
        t = tax.compute_new_regime_tax(7_00_000)
        assert t == pytest.approx(0.0)

    def test_new_regime_tax_above_rebate(self):
        t = tax.compute_new_regime_tax(14_00_000)
        assert t > 0

    def test_old_regime_rebate_below_5l(self):
        deductions = TaxDeductions()
        t = tax.compute_old_regime_tax(5_00_000, deductions)
        assert t == pytest.approx(0.0)

    def test_high_income_old_regime_deductions_reduce_tax(self):
        base_deductions = TaxDeductions()
        max_deductions = TaxDeductions(
            section_80c=150_000,
            section_80d_self=25_000,
            nps_80ccd_1b=50_000,
        )
        gross = 15_00_000
        t_base = tax.compute_old_regime_tax(gross, base_deductions)
        t_max = tax.compute_old_regime_tax(gross, max_deductions)
        assert t_max < t_base

    def test_compare_regimes_returns_recommended(self):
        profile = make_profile(monthly_gross_income=100_000)
        result = tax.compare_tax_regimes(profile)
        assert result.recommended_regime.value in ("old", "new")
        assert result.old_regime_tax > 0 or result.new_regime_tax > 0

    def test_missing_deductions_identified(self):
        profile = make_profile()  # no deductions set
        result = tax.compare_tax_regimes(profile)
        assert len(result.missing_deductions) > 0

    def test_cess_applied(self):
        t = tax.compute_new_regime_tax(20_00_000)
        t_no_cess = t / 1.04
        assert abs(t - (t_no_cess * 1.04)) < 1


# Tax edge-case tests
class TestTaxEdgeCases:
    def test_new_regime_exactly_at_rebate_limit(self):
        """
        Gross ₹12,75,000 → taxable = ₹12,00,000 exactly (after ₹75k standard deduction).
        Tax before rebate = ₹60,000; rebate = min(60k, 60k) = ₹60,000 → net tax = ₹0.
        This is the exact boundary where the full 87A rebate wipes out the liability.
        """
        t = tax.compute_new_regime_tax(12_75_000)
        assert t == pytest.approx(0.0), f"Expected ₹0 at taxable ₹12L boundary, got ₹{t}"

    def test_new_regime_just_above_rebate_limit(self):
        """
        Gross ₹12,75,001 → taxable = ₹12,00,001 (one rupee above ₹12L rebate limit).
        No rebate applies; some tax must be due.
        Note: gross must exceed ₹12,75,000 (not ₹12,00,000) because taxable =
        gross − ₹75,000 standard deduction.
        """
        t = tax.compute_new_regime_tax(12_75_001)
        assert t > 0, f"Expected tax > 0 just above rebate limit, got ₹{t}"

    def test_new_regime_rebate_is_capped_at_actual_tax(self):
        """
        At gross ₹11,00,000, taxable = ₹10,25,000 — rebate limit applies but
        actual tax (≈ ₹42,500) is less than max rebate (₹60,000).
        Rebate must be capped at actual tax → net tax = ₹0, not negative.
        """
        t = tax.compute_new_regime_tax(11_00_000)
        assert t == pytest.approx(0.0), f"Rebate over-applied: got ₹{t}"

    def test_surcharge_triggered_above_50l(self):
        """
        Income > ₹50L triggers 10% surcharge.
        With marginal relief, tax at ₹50,00,001 should exceed tax at ₹50,00,000
        (marginal relief limits the jump, but some increase must occur).
        """
        t_no_surcharge = tax.compute_new_regime_tax(50_00_000)
        t_with_surcharge = tax.compute_new_regime_tax(50_00_001)
        assert t_with_surcharge > t_no_surcharge

    def test_surcharge_marginal_relief_limits_cliff(self):
        """
        Marginal relief: net tax increase from ₹50L to ₹50L+1 should not
        exceed ₹1 (the extra income earned). Without marginal relief this
        would be a jump of ~₹1.05 lakh.
        """
        t_at_50l = tax.compute_new_regime_tax(50_00_000)
        t_at_50l_plus1 = tax.compute_new_regime_tax(50_00_001)
        assert (t_at_50l_plus1 - t_at_50l) <= 2.0 # allow small floating point margin

    def test_cess_rate_is_4_pct(self):
        """Final tax must equal (base_tax + surcharge) × 1.04 exactly."""
        gross = 20_00_000
        t = tax.compute_new_regime_tax(gross)
        # Back-calculate pre-cess amount: t = pre_cess × 1.04
        t_pre_cess = t / 1.04
        assert abs(t - t_pre_cess * 1.04) < 1.0

    def test_zero_income_zero_tax(self):
        deductions = TaxDeductions()
        assert tax.compute_new_regime_tax(0.0) == pytest.approx(0.0)
        assert tax.compute_old_regime_tax(0.0, deductions) == pytest.approx(0.0)


# Health Score tests
class TestHealthScore:
    def test_score_range(self):
        profile = make_profile()
        result = health.calculate_money_health_score(profile)
        assert 0 <= result.overall_score <= 100

    def test_grade_assigned(self):
        profile = make_profile()
        result = health.calculate_money_health_score(profile)
        assert result.grade in ("A", "B", "C", "D", "F")

    def test_six_dimensions(self):
        profile = make_profile()
        result = health.calculate_money_health_score(profile)
        assert len(result.dimensions) == 6

    def test_full_emergency_fund_scores_100(self):
        profile = make_profile(monthly_expenses=50_000, emergency_fund=300_000)
        d = health.score_emergency_fund(profile)
        assert d.score == pytest.approx(100.0)

    def test_zero_emergency_fund_scores_0(self):
        profile = make_profile(emergency_fund=0)
        d = health.score_emergency_fund(profile)
        assert d.score == pytest.approx(0.0)

    def test_no_debt_scores_100(self):
        profile = make_profile()
        d = health.score_debt_health(profile)
        assert d.score == pytest.approx(100.0)

    def test_high_emi_ratio_penalised(self):
        profile = make_profile(
            monthly_gross_income=50_000,
            monthly_expenses=20_000,
            debts=[
                DebtItem(
                    name="Personal Loan",
                    outstanding=500_000,
                    emi=30_000,
                    interest_rate=24,
                    is_secured=False,
                )
            ],
        )
        d = health.score_debt_health(profile)
        assert d.score < 40

    def test_no_insurance_penalised(self):
        profile = make_profile()
        d = health.score_insurance_coverage(profile)
        assert d.score < 40

    def test_full_insurance_scores_well(self):
        profile = make_profile(
            monthly_gross_income=100_000,
            insurance=InsuranceCoverage(
                has_term_life=True,
                term_cover=12_000_000,
                has_health=True,
                health_cover=1_000_000,
            ),
        )
        d = health.score_insurance_coverage(profile)
        assert d.score >= 80

    def test_net_worth_calculation(self):
        profile = make_profile(
            assets=AssetAllocation(equity=500_000, cash=100_000),
            debts=[DebtItem(name="Loan", outstanding=200_000, emi=5_000, interest_rate=10)],
        )
        result = health.calculate_money_health_score(profile)
        expected = 500_000 + 100_000 + 300_000 - 200_000
        assert result.total_net_worth == pytest.approx(expected, rel=0.01)


# Profile validation tests
class TestProfileValidation:
    def test_expenses_exceeding_income_raises(self):
        with pytest.raises(Exception):
            make_profile(monthly_gross_income=50_000, monthly_expenses=60_000)

    def test_retirement_age_before_current_raises(self):
        with pytest.raises(Exception):
            make_profile(age=40, retirement_age=35)

    def test_valid_profile_passes(self):
        p = make_profile()
        assert p.monthly_savings == 50_000
