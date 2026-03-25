"""tests/test_life_event.py — deterministic, no LLM/DB/network."""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from finance.life_event import analyse_life_event
from models.schemas import (
    DebtItem,
    InsuranceCoverage,
    LifeEventInput,
    LifeEventType,
    RiskProfile,
    UserProfile,
)


def make_profile(**ov) -> UserProfile:
    d = {
        "age": 30,
        "city": "Mumbai",
        "monthly_gross_income": 100_000,
        "monthly_expenses": 50_000,
        "emergency_fund": 300_000,
        "retirement_age": 60,
        "risk_profile": RiskProfile.MODERATE,
    }
    d.update(ov)
    return UserProfile(**d)


def make_event(t, amount=500_000, details=None, **ov) -> LifeEventInput:
    return LifeEventInput(
        profile=make_profile(**ov), event_type=t, event_amount=amount, event_details=details or {}
    )


class TestBonusAllocation:
    def test_high_interest_unsecured_debt_paid_first(self):
        p = make_profile(
            debts=[
                DebtItem(
                    name="PL", outstanding=200_000, emi=8_000, interest_rate=24, is_secured=False
                )
            ]
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.BONUS, event_amount=500_000, event_details={}
            )
        )
        cats = [a.category for a in r.allocations]
        assert "Debt Payoff" in cats
        assert next(
            a for a in r.allocations if a.category == "Debt Payoff"
        ).amount == pytest.approx(200_000)

    def test_secured_debt_not_prepaid(self):
        p = make_profile(
            debts=[
                DebtItem(
                    name="HL", outstanding=3_000_000, emi=30_000, interest_rate=8.5, is_secured=True
                )
            ]
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.BONUS, event_amount=500_000, event_details={}
            )
        )
        assert "Debt Payoff" not in [a.category for a in r.allocations]

    def test_ef_topped_up_when_low(self):
        r = make_event(LifeEventType.BONUS, emergency_fund=0)
        assert "Emergency Fund" in [a.category for a in analyse_life_event(r).allocations]

    def test_ef_not_topped_when_full(self):
        r = make_event(LifeEventType.BONUS, emergency_fund=300_000)
        assert "Emergency Fund" not in [a.category for a in analyse_life_event(r).allocations]

    def test_remaining_goes_to_equity(self):
        r = make_event(LifeEventType.BONUS, emergency_fund=300_000)
        assert "Long-term Equity Investment" in [
            a.category for a in analyse_life_event(r).allocations
        ]

    def test_total_allocation_equals_amount(self):
        r = analyse_life_event(make_event(LifeEventType.BONUS, amount=500_000))
        assert sum(a.amount for a in r.allocations) == pytest.approx(500_000, rel=0.01)

    def test_tax_impact_positive_for_large_bonus(self):
        assert analyse_life_event(make_event(LifeEventType.BONUS, amount=1_000_000)).tax_impact > 0

    def test_priority_actions_populated(self):
        assert len(analyse_life_event(make_event(LifeEventType.BONUS)).priority_actions) > 0


class TestInheritanceAllocation:
    def test_clears_high_interest_debt(self):
        p = make_profile(
            emergency_fund=0,
            debts=[
                DebtItem(
                    name="PL", outstanding=300_000, emi=10_000, interest_rate=18, is_secured=False
                )
            ],
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p,
                event_type=LifeEventType.INHERITANCE,
                event_amount=2_000_000,
                event_details={},
            )
        )
        assert "Debt Clearance" in [a.category for a in r.allocations]

    def test_remainder_goes_to_stp(self):
        r = analyse_life_event(make_event(LifeEventType.INHERITANCE, amount=2_000_000))
        assert "Wealth Building (Lump Sum + STP)" in [a.category for a in r.allocations]


class TestMarriageEvent:
    def test_insurance_gap_when_no_term(self):
        p = make_profile(
            insurance=InsuranceCoverage(has_term_life=False, has_health=True, health_cover=500_000)
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.MARRIAGE, event_amount=0, event_details={}
            )
        )
        assert len(r.insurance_gaps) > 0

    def test_no_term_gap_when_covered(self):
        p = make_profile(
            insurance=InsuranceCoverage(
                has_term_life=True, term_cover=10_000_000, has_health=True, health_cover=500_000
            )
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.MARRIAGE, event_amount=0, event_details={}
            )
        )
        assert not any("term" in g.lower() for g in r.insurance_gaps)

    def test_priority_actions_populated(self):
        assert (
            len(analyse_life_event(make_event(LifeEventType.MARRIAGE, amount=0)).priority_actions)
            > 0
        )


class TestJobLossEvent:
    def test_runway_in_actions(self):
        p = make_profile(emergency_fund=300_000, monthly_expenses=50_000)
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.JOB_LOSS, event_amount=0, event_details={}
            )
        )
        assert any("6.0" in a for a in r.priority_actions)

    def test_health_gap_when_no_insurance(self):
        p = make_profile(
            insurance=InsuranceCoverage(has_term_life=True, term_cover=10_000_000, has_health=False)
        )
        r = analyse_life_event(
            LifeEventInput(
                profile=p, event_type=LifeEventType.JOB_LOSS, event_amount=0, event_details={}
            )
        )
        assert len(r.insurance_gaps) > 0


class TestHomePurchaseEvent:
    def test_down_payment_allocation_created(self):
        e = LifeEventInput(
            profile=make_profile(),
            event_type=LifeEventType.HOME_PURCHASE,
            event_amount=0,
            event_details={"property_value": 5_000_000},
        )
        assert "Down Payment" in [a.category for a in analyse_life_event(e).allocations]

    def test_down_payment_is_20_pct(self):
        e = LifeEventInput(
            profile=make_profile(),
            event_type=LifeEventType.HOME_PURCHASE,
            event_amount=0,
            event_details={"property_value": 5_000_000},
        )
        dp = next(a for a in analyse_life_event(e).allocations if a.category == "Down Payment")
        assert dp.amount == pytest.approx(1_000_000)
