"""
tests/test_fire_stepup.py — Step-up SIP + projected FI age.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from finance.fire import (
    build_fire_plan,
    future_value_sip,
    future_value_stepup_sip,
    projected_fi_age,
    required_monthly_sip,
    required_stepup_sip,
)
from models import RiskProfile, UserProfile


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


# Step-up SIP math
class TestStepUpSIP:
    def test_stepup_fv_exceeds_flat_fv(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.10) > future_value_sip(10_000, 0.12, 10)

    def test_zero_stepup_approximates_flat(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.0) == pytest.approx(
            future_value_sip(10_000, 0.12, 10), rel=0.05
        )

    def test_required_stepup_lower_than_flat(self):
        assert required_stepup_sip(10_000_000, 0, 0.12, 15, 0.10) < required_monthly_sip(
            10_000_000, 0, 0.12, 15
        )

    def test_already_funded_returns_zero(self):
        assert required_stepup_sip(1_000_000, 10_000_000, 0.12, 10) == pytest.approx(0.0)

    def test_higher_stepup_rate_gives_higher_fv(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.15) > future_value_stepup_sip(
            10_000, 0.12, 10, 0.05
        )


# Projected FI age
class TestProjectedFIAge:
    def test_higher_sip_reaches_fi_earlier(self):
        assert projected_fi_age(30, 500_000, 50_000, 50_000_000, 0.10) < projected_fi_age(
            30, 500_000, 20_000, 50_000_000, 0.10
        )

    def test_fi_age_not_below_current_age(self):
        result = projected_fi_age(30, 500_000, 5_000, 50_000_000, 0.10)
        # May be None (not reachable) or a float ≥ 30
        assert result is None or result >= 30

    def test_already_funded_corpus_immediate_fi(self):
        result = projected_fi_age(30, 100_000_000, 10_000, 50_000_000, 0.10)
        assert result is not None and result <= 31


# projected_fi_age and build_fire_plan edge cases
class TestProjectedFIAgeEdgeCases:
    def test_returns_none_when_sip_is_zero_and_corpus_insufficient(self):
        """
        Zero corpus, zero SIP → corpus stays 0 forever → FI never reached.
        Must return None, not a misleading age like 90.
        """
        result = projected_fi_age(30, 0, 0, 100_000_000, 0.12)
        assert result is None, f"Expected None for unreachable FI, got {result}"

    def test_returns_none_when_corpus_grows_but_never_reaches_target(self):
        """
        Even with growth, if the target is astronomically large relative to
        corpus + SIP, the function should return None within the 60-year window.
        """
        result = projected_fi_age(30, 1_000, 100, 1_000_000_000_000, 0.12)
        assert result is None

    def test_returns_float_when_reachable(self):
        """High SIP against moderate target must return a concrete age."""
        result = projected_fi_age(30, 10_00_000, 1_00_000, 5_00_00_000, 0.12)
        assert result is not None
        assert isinstance(result, float)
        assert result >= 30

    def test_fire_plan_projected_fi_age_is_none_when_sip_is_zero(self):
        """
        A profile with zero savings → projected_fi_age=None in the plan.
        (income = expenses → investable = 0)
        """
        profile = make_profile(
            monthly_gross_income=50_000,
            monthly_expenses=50_000,  # zero savings
        )
        plan = build_fire_plan(profile)
        assert plan.projected_fi_age is None
        assert plan.on_track is False

    def test_fire_plan_very_short_horizon(self):
        """
        retirement_age = age + 1 (1-year horizon) → very large required SIP.
        Must not crash and must return valid non-negative values.
        """
        profile = make_profile(age=29, retirement_age=30, monthly_expenses=50_000)
        plan = build_fire_plan(profile)
        assert plan.required_monthly_sip >= 0
        assert plan.fi_corpus_required > 0
        assert plan.on_track is False  # almost certainly not on track in 1 year

    def test_fire_plan_on_track_false_when_fi_age_is_none(self):
        """on_track must be False when projected_fi_age is None."""
        profile = make_profile(
            monthly_gross_income=50_000,
            monthly_expenses=50_000,
        )
        plan = build_fire_plan(profile)
        if plan.projected_fi_age is None:
            assert plan.on_track is False
