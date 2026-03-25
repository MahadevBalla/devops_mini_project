"""tests/test_couple.py — deterministic, no LLM/DB/network."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from finance.couple import _hra_benefit, _net_worth, optimise_couple_finances
from models.schemas import (
    AssetAllocation,
    CoupleProfile,
    DebtItem,
    InsuranceCoverage,
    RiskProfile,
    TaxDeductions,
    UserProfile,
)


def make_profile(**ov) -> UserProfile:
    d = {
        "age": 30,
        "city": "Mumbai",
        "monthly_gross_income": 100_000,
        "monthly_expenses": 40_000,
        "emergency_fund": 240_000,
        "retirement_age": 60,
        "risk_profile": RiskProfile.MODERATE
    }
    d.update(ov)
    return UserProfile(**d)

def make_couple(**ov) -> CoupleProfile:
    return CoupleProfile(
        partner_a=ov.get("partner_a", make_profile()),
        partner_b=ov.get("partner_b", make_profile(age=28, monthly_gross_income=80_000)),
        is_married=ov.get("is_married", True), joint_goals=ov.get("joint_goals", []),
    )


class TestNetWorth:
    def test_net_worth_assets_minus_liabilities(self):
        p = make_profile(assets=AssetAllocation(equity=500_000, cash=100_000), emergency_fund=300_000, debts=[DebtItem(name="L", outstanding=200_000, emi=5_000, interest_rate=10)])
        assert _net_worth(p) == pytest.approx(700_000)

    def test_zero_debt(self):
        p = make_profile(assets=AssetAllocation(equity=500_000), emergency_fund=200_000)
        assert _net_worth(p) == pytest.approx(700_000)


class TestHRABenefit:
    def test_metro_hra_gte_non_metro(self):
        assert _hra_benefit(make_profile(city="Mumbai")) >= _hra_benefit(make_profile(city="Jaipur"))

    def test_claimed_hra_returned_as_is(self):
        p = make_profile(tax_deductions=TaxDeductions(hra_claimed=120_000))
        assert _hra_benefit(p) == pytest.approx(120_000)


class TestCoupleOptimisation:
    def test_combined_net_worth_sum_of_both(self):
        a = make_profile(assets=AssetAllocation(equity=500_000), emergency_fund=200_000)
        b = make_profile(assets=AssetAllocation(equity=300_000), emergency_fund=150_000)
        r = optimise_couple_finances(CoupleProfile(partner_a=a, partner_b=b, is_married=True, joint_goals=[]))
        assert r.combined_net_worth == pytest.approx(_net_worth(a) + _net_worth(b))

    def test_higher_income_partner_gets_more_sip(self):
        a = make_profile(monthly_gross_income=150_000, monthly_expenses=50_000)
        b = make_profile(monthly_gross_income=60_000, monthly_expenses=40_000)
        r = optimise_couple_finances(CoupleProfile(partner_a=a, partner_b=b, is_married=True, joint_goals=[]))
        assert r.partner_a_sip >= r.partner_b_sip

    def test_nps_benefit_positive_when_unused(self):
        a = make_profile(tax_deductions=TaxDeductions(nps_80ccd_1b=0))
        b = make_profile(tax_deductions=TaxDeductions(nps_80ccd_1b=0))
        r = optimise_couple_finances(CoupleProfile(partner_a=a, partner_b=b, is_married=True, joint_goals=[]))
        assert r.nps_matching_benefit > 0

    def test_nps_benefit_zero_when_maxed(self):
        a = make_profile(tax_deductions=TaxDeductions(nps_80ccd_1b=50_000))
        b = make_profile(tax_deductions=TaxDeductions(nps_80ccd_1b=50_000))
        r = optimise_couple_finances(CoupleProfile(partner_a=a, partner_b=b, is_married=True, joint_goals=[]))
        assert r.nps_matching_benefit == pytest.approx(0.0)

    def test_insurance_gap_flagged_for_uncovered_partner(self):
        a = make_profile(insurance=InsuranceCoverage(has_term_life=False, has_health=True, health_cover=500_000))
        b = make_profile(insurance=InsuranceCoverage(has_term_life=True, term_cover=10_000_000, has_health=True, health_cover=500_000))
        r = optimise_couple_finances(CoupleProfile(partner_a=a, partner_b=b, is_married=True, joint_goals=[]))
        assert "Partner A" in r.joint_insurance_recommendation

    def test_recommendations_list_populated(self):
        assert len(optimise_couple_finances(make_couple()).recommendations) >= 3

    def test_joint_tax_saving_non_negative(self):
        r = optimise_couple_finances(make_couple())
        assert r.joint_tax_saving >= 0
