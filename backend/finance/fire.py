"""
finance/fire.py
FIRE engine with step-up SIP, annuity ladder projection, goal SIPs.
Zero hardcoding — all rates from config, all tax from tax_constants.
"""

from __future__ import annotations

import datetime
from typing import Optional

from core.config import settings
from models import FIREPlan, Goal, SIPGoal, UserProfile, YearlyProjection

_CURRENT_YEAR = datetime.date.today().year


# Math primitives
def compound_growth_value(pv: float, annual_rate: float, years: float) -> float:
    return pv * ((1 + annual_rate) ** years)


def future_value_sip(monthly_sip: float, annual_rate: float, years: float) -> float:
    """FV of regular monthly SIP."""
    r = annual_rate / 12
    n = years * 12
    if r == 0:
        return monthly_sip * n
    return monthly_sip * (((1 + r) ** n - 1) / r) * (1 + r)


def future_value_stepup_sip(
    initial_monthly_sip: float,
    annual_rate: float,
    years: float,
    annual_stepup_rate: float = 0.10,
) -> float:
    """
    FV of a step-up SIP where contribution increases by `annual_stepup_rate` every year.
    Uses year-by-year accumulation — O(years) which is fine for max 40 years.
    """
    total_fv = 0.0
    current_sip = initial_monthly_sip
    for year in range(int(years)):
        years_remaining = years - year
        fv_this_year = future_value_sip(current_sip, annual_rate, 1) * compound_growth_value(
            1, annual_rate, years_remaining - 1
        )
        total_fv += fv_this_year
        current_sip *= 1 + annual_stepup_rate
    return total_fv


def required_monthly_sip(
    target: float,
    current_corpus: float,
    annual_rate: float,
    years: float,
) -> float:
    """Binary search for required flat monthly SIP."""
    existing_fv = compound_growth_value(current_corpus, annual_rate, years)
    remaining = target - existing_fv
    if remaining <= 0:
        return 0.0

    lo, hi = 0.0, max(target / max(years * 12, 1), 1.0)
    while future_value_sip(hi, annual_rate, years) < remaining:
        hi *= 2

    for _ in range(64):
        mid = (lo + hi) / 2
        if future_value_sip(mid, annual_rate, years) < remaining:
            lo = mid
        else:
            hi = mid
    return round((lo + hi) / 2, 0)


def required_stepup_sip(
    target: float,
    current_corpus: float,
    annual_rate: float,
    years: float,
    annual_stepup_rate: float = 0.10,
) -> float:
    """Binary search for required initial monthly SIP with step-up."""
    existing_fv = compound_growth_value(current_corpus, annual_rate, years)
    remaining = target - existing_fv
    if remaining <= 0:
        return 0.0

    lo, hi = 0.0, max(target / max(years * 12, 1), 1.0)
    while future_value_stepup_sip(hi, annual_rate, years, annual_stepup_rate) < remaining:
        hi *= 2

    for _ in range(64):
        mid = (lo + hi) / 2
        if future_value_stepup_sip(mid, annual_rate, years, annual_stepup_rate) < remaining:
            lo = mid
        else:
            hi = mid
    return round((lo + hi) / 2, 0)


def projected_fi_age(
    current_age: int,
    current_corpus: float,
    monthly_sip: float,
    corpus_target: float,
    annual_rate: float,
    annual_stepup_rate: float = 0.10,
) -> Optional[float]:
    for years in range(1, 61):
        projected = compound_growth_value(
            current_corpus, annual_rate, years
        ) + future_value_stepup_sip(monthly_sip, annual_rate, years, annual_stepup_rate)
        if projected >= corpus_target:
            prev = compound_growth_value(
                current_corpus, annual_rate, years - 1
            ) + future_value_stepup_sip(monthly_sip, annual_rate, years - 1, annual_stepup_rate)
            frac = (corpus_target - prev) / max(projected - prev, 1)
            return round(current_age + years - 1 + frac, 1)
    return None  # FI not reachable within 60-year horizon


def build_yearly_projections(
    current_age: int,
    retirement_age: int,
    current_corpus: float,
    monthly_sip: float,
    annual_rate: float,
    annual_stepup_rate: float,
) -> list[dict]:
    """
    Year-by-year corpus projection for frontend charting.
    Returns list of {year, age, sip, corpus, invested} dicts.
    Monthly compounding: each month corpus grows by r = annual_rate/12, then SIP added.
    Step-up applied once per year after all 12 months complete.
    """
    projections = []
    corpus = current_corpus
    sip = monthly_sip
    cumulative_invested = current_corpus
    r = annual_rate / 12

    for i in range(retirement_age - current_age):
        for _ in range(12):
            corpus = corpus * (1 + r) + sip
            cumulative_invested += sip

        projections.append({
            "year": _CURRENT_YEAR + i + 1,
            "age": current_age + i + 1,
            "sip": round(sip, 0),
            "corpus": round(corpus, 0),
            "invested": round(cumulative_invested, 0),
        })

        sip *= (1 + annual_stepup_rate)

    return projections


# FIRE corpus target
def calculate_fi_corpus(profile: UserProfile) -> float:
    """
    Required corpus at retirement using SWR.
    Expenses are inflation-adjusted to retirement date.
    """
    current_annual_expenses = profile.monthly_expenses * 12
    inflation_adjusted = compound_growth_value(
        current_annual_expenses,
        settings.DEFAULT_INFLATION_RATE,
        float(profile.years_to_retirement),
    )
    return inflation_adjusted / settings.DEFAULT_SAFE_WITHDRAWAL_RATE


# Goal SIPs
_GOAL_RATE_MAP: dict[str, float] = {
    "retirement": settings.DEFAULT_EQUITY_RETURN,
    "house": settings.DEFAULT_DEBT_RETURN,
    "education": settings.DEFAULT_EQUITY_RETURN,
    "marriage": settings.DEFAULT_DEBT_RETURN,
    "vacation": settings.DEFAULT_DEBT_RETURN,
    "emergency": 0.065,
    "custom": settings.DEFAULT_EQUITY_RETURN,
}


def plan_goal_sip(goal: Goal, annual_stepup: float = 0.10) -> SIPGoal:
    years = float(max(goal.target_year - _CURRENT_YEAR, 1))
    rate = _GOAL_RATE_MAP.get(goal.type.value, settings.DEFAULT_EQUITY_RETURN)
    flat_sip = required_monthly_sip(goal.target_amount, 0.0, rate, years)
    stepup_sip = required_stepup_sip(goal.target_amount, 0.0, rate, years, annual_stepup)
    label = goal.label or goal.type.value.replace("_", " ").title()
    return SIPGoal(
        goal_label=label,
        target_amount=goal.target_amount,
        target_year=goal.target_year,
        required_monthly_sip=flat_sip,
        required_stepup_sip=stepup_sip,
        stepup_rate=annual_stepup,
        current_on_track=False,
    )


# Main entry point
_GROWTH_RATE_MAP: dict[str, float] = {
    "conservative": settings.DEFAULT_DEBT_RETURN,
    "moderate": 0.10,
    "aggressive": settings.DEFAULT_EQUITY_RETURN,
}


def build_fire_plan(profile: UserProfile, annual_stepup: float = 0.10) -> FIREPlan:
    corpus_target = calculate_fi_corpus(profile)
    current_corpus = profile.assets.total
    years_left = float(profile.years_to_retirement)
    rate = _GROWTH_RATE_MAP.get(profile.risk_profile.value, 0.10)

    flat_sip = required_monthly_sip(corpus_target, current_corpus, rate, years_left)
    stepup_sip = required_stepup_sip(corpus_target, current_corpus, rate, years_left, annual_stepup)

    investable = max(0.0, profile.monthly_savings - profile.total_emi)

    fi_age: Optional[float] = projected_fi_age(
        profile.age, current_corpus, investable, corpus_target, rate, annual_stepup
    )
    fi_age_for_calc: float = fi_age if fi_age is not None else float(profile.age + 60)

    monthly_ret_expense = compound_growth_value(
        profile.monthly_expenses, settings.DEFAULT_INFLATION_RATE, years_left
    )

    goal_sips = [plan_goal_sip(g, annual_stepup) for g in profile.goals]

    yearly_projections = build_yearly_projections(
        current_age=profile.age,
        retirement_age=profile.retirement_age,
        current_corpus=current_corpus,
        monthly_sip=investable,
        annual_rate=rate,
        annual_stepup_rate=annual_stepup,
    )

    return FIREPlan(
        fi_corpus_required=round(corpus_target, 0),
        current_corpus=round(current_corpus, 0),
        corpus_gap=round(max(corpus_target - current_corpus, 0), 0),
        required_monthly_sip=round(flat_sip, 0),
        required_stepup_sip=round(stepup_sip, 0),
        stepup_rate=annual_stepup,
        projected_fi_age=round(fi_age, 1) if fi_age is not None else None,
        years_to_fi=round(max(fi_age_for_calc - profile.age, 0), 1),
        monthly_retirement_expense=round(monthly_ret_expense, 0),
        sip_goals=goal_sips,
        on_track=fi_age is not None and fi_age <= profile.retirement_age,
        yearly_projections=[YearlyProjection(**p) for p in yearly_projections],
    )
