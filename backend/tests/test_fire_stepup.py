"""tests/test_fire_stepup.py — Step-up SIP + projected FI age."""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from finance.fire import (
    future_value_sip,
    future_value_stepup_sip,
    projected_fi_age,
    required_stepup_sip,
)


class TestStepUpSIP:
    def test_stepup_fv_exceeds_flat_fv(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.10) > future_value_sip(10_000, 0.12, 10)

    def test_zero_stepup_approximates_flat(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.0) == pytest.approx(future_value_sip(10_000, 0.12, 10), rel=0.05)

    def test_required_stepup_lower_than_flat(self):
        from finance.fire import required_monthly_sip
        assert required_stepup_sip(10_000_000, 0, 0.12, 15, 0.10) < required_monthly_sip(10_000_000, 0, 0.12, 15)

    def test_already_funded_returns_zero(self):
        assert required_stepup_sip(1_000_000, 10_000_000, 0.12, 10) == pytest.approx(0.0)

    def test_higher_stepup_rate_gives_higher_fv(self):
        assert future_value_stepup_sip(10_000, 0.12, 10, 0.15) > future_value_stepup_sip(10_000, 0.12, 10, 0.05)


class TestProjectedFIAge:
    def test_higher_sip_reaches_fi_earlier(self):
        assert projected_fi_age(30, 500_000, 50_000, 50_000_000, 0.10) < projected_fi_age(30, 500_000, 20_000, 50_000_000, 0.10)

    def test_fi_age_not_below_current_age(self):
        assert projected_fi_age(30, 500_000, 5_000, 50_000_000, 0.10) >= 30

    def test_already_funded_corpus_immediate_fi(self):
        assert projected_fi_age(30, 100_000_000, 10_000, 50_000_000, 0.10) <= 31
