"""
finance/life_event.py
Life Event Financial Advisor — deterministic allocation logic for
bonus, inheritance, marriage, new baby, job loss, home purchase.
"""
from __future__ import annotations

from core.config import settings
from finance.tax_constants import CURRENT as TAX
from models.schemas import (
    LifeEventAllocation,
    LifeEventInput,
    LifeEventResult,
    LifeEventType,
    UserProfile,
)


def _analyse_bonus(profile: UserProfile, amount: float) -> list[LifeEventAllocation]:
    """Allocate bonus: high-interest debt first, then emergency fund, then investments."""
    allocations: list[LifeEventAllocation] = []
    remaining = amount

    # 1. High-interest unsecured debt (>18% p.a.) — always kill first
    for debt in sorted(profile.debts, key=lambda d: d.interest_rate, reverse=True):
        if debt.interest_rate > 18 and not debt.is_secured and remaining > 0:
            pay = min(debt.outstanding, remaining)
            allocations.append(LifeEventAllocation(
                category="Debt Payoff",
                amount=pay,
                rationale=f"Prepay {debt.name} ({debt.interest_rate:.0f}% p.a.) — guaranteed {debt.interest_rate:.0f}% return",
            ))
            remaining -= pay

    # 2. Emergency fund top-up
    ef_needed = profile.monthly_expenses * settings.EMERGENCY_FUND_MONTHS - profile.emergency_fund
    if ef_needed > 0 and remaining > 0:
        top_up = min(ef_needed, remaining * 0.3)
        allocations.append(LifeEventAllocation(
            category="Emergency Fund",
            amount=top_up,
            rationale=f"Top up emergency fund to {settings.EMERGENCY_FUND_MONTHS}-month target",
        ))
        remaining -= top_up

    # 3. 80C top-up if unused
    unused_80c = TAX.sec_80c_limit - profile.tax_deductions.section_80c
    if unused_80c > 0 and remaining > 0:
        invest_80c = min(unused_80c, remaining * 0.2)
        allocations.append(LifeEventAllocation(
            category="Tax-Saving Investment (80C)",
            amount=invest_80c,
            rationale=f"₹{invest_80c:,.0f} in ELSS/PPF reduces taxable income under old regime",
        ))
        remaining -= invest_80c

    # 4. Long-term equity investment
    if remaining > 0:
        allocations.append(LifeEventAllocation(
            category="Long-term Equity Investment",
            amount=remaining,
            rationale="Deploy via lump-sum + STP into equity index funds for long-term wealth",
        ))

    return allocations


def _analyse_inheritance(profile: UserProfile, amount: float) -> list[LifeEventAllocation]:
    allocations = []
    remaining = amount

    # Inheritance is usually significant — build full plan
    # 1. Emergency fund
    ef_needed = profile.monthly_expenses * settings.EMERGENCY_FUND_MONTHS - profile.emergency_fund
    if ef_needed > 0:
        top_up = min(ef_needed, remaining)
        allocations.append(LifeEventAllocation(category="Emergency Fund", amount=top_up, rationale="Fully fund 6-month emergency buffer first"))
        remaining -= top_up

    # 2. Clear all high-interest debt
    for debt in sorted(profile.debts, key=lambda d: d.interest_rate, reverse=True):
        if debt.interest_rate > 10 and remaining > 0:
            pay = min(debt.outstanding, remaining)
            allocations.append(LifeEventAllocation(category="Debt Clearance", amount=pay, rationale=f"Eliminate {debt.name} at {debt.interest_rate:.0f}%"))
            remaining -= pay

    # 3. Term insurance if not covered
    if not profile.insurance.has_term_life and remaining > 50_000:
        allocations.append(LifeEventAllocation(category="Term Insurance Premium (first year)", amount=min(25_000, remaining), rationale="Buy ₹1Cr+ term cover immediately"))
        remaining -= min(25_000, remaining)

    # 4. Invest remainder with STP
    if remaining > 0:
        allocations.append(LifeEventAllocation(
            category="Wealth Building (Lump Sum + STP)",
            amount=remaining,
            rationale="Park in liquid fund, STP over 12 months into equity index funds to average cost",
        ))

    return allocations


def _analyse_marriage(profile: UserProfile) -> tuple[list[LifeEventAllocation], list[str]]:
    insurance_gaps = []
    if not profile.insurance.has_term_life:
        insurance_gaps.append("No term life cover — marriage creates financial dependents, buy ₹1Cr+ cover now")
    if not profile.insurance.has_health:
        insurance_gaps.append("No health insurance — add family floater plan after marriage")
    return [], insurance_gaps


def _analyse_new_baby(profile: UserProfile) -> tuple[list[LifeEventAllocation], list[str]]:
    insurance_gaps = []
    allocations = [
        LifeEventAllocation(category="Child Education Fund", amount=profile.monthly_gross_income * 2, rationale="Start Sukanya Samriddhi (girl) or equity MF for 18yr education goal"),
        LifeEventAllocation(category="Enhanced Emergency Fund", amount=profile.monthly_expenses * 3, rationale="Increase emergency fund by 3 months for baby-related expenses"),
    ]
    if not profile.insurance.has_term_life:
        insurance_gaps.append("No term cover — critical now that you have a dependent child. Buy 20× annual income cover.")
    if not profile.insurance.has_health:
        insurance_gaps.append("Add child to family floater health plan immediately")
    insurance_gaps.append("Consider critical illness rider — parental illness = no income + caregiving costs")
    return allocations, insurance_gaps


def _tax_on_windfall(amount: float, profile: UserProfile) -> float:
    """Rough tax impact of a windfall on annual income (top marginal rate approximation)."""
    from finance.tax import compute_new_regime_tax, compute_old_regime_tax
    base_tax = min(
        compute_old_regime_tax(profile.annual_gross_income, profile.tax_deductions),
        compute_new_regime_tax(profile.annual_gross_income),
    )
    incremental_tax = min(
        compute_old_regime_tax(profile.annual_gross_income + amount, profile.tax_deductions),
        compute_new_regime_tax(profile.annual_gross_income + amount),
    ) - base_tax
    return max(incremental_tax, 0.0)


# Main entry point
def analyse_life_event(event_input: LifeEventInput) -> LifeEventResult:
    profile = event_input.profile
    event = event_input.event_type
    amount = event_input.event_amount

    allocations: list[LifeEventAllocation] = []
    insurance_gaps: list[str] = []
    priority_actions: list[str] = []
    tax_impact = 0.0

    if event == LifeEventType.BONUS:
        allocations = _analyse_bonus(profile, amount)
        tax_impact = _tax_on_windfall(amount, profile)
        priority_actions = [
            f"Your ₹{amount:,.0f} bonus will incur ~₹{tax_impact:,.0f} additional tax — review TDS",
            "Invest within 30 days to avoid lifestyle inflation",
        ]

    elif event == LifeEventType.INHERITANCE:
        allocations = _analyse_inheritance(profile, amount)
        priority_actions = [
            "Consult CA on inheritance tax treatment (India currently has no inheritance tax, but check state laws)",
            "Update Will and nominations across all accounts",
        ]

    elif event == LifeEventType.MARRIAGE:
        allocations, insurance_gaps = _analyse_marriage(profile)
        priority_actions = [
            "File joint HRA — can save ₹50,000–₹1,20,000/yr in taxes",
            "Start a joint SIP for house goal if planning within 5–7 years",
        ]

    elif event == LifeEventType.NEW_BABY:
        allocations, insurance_gaps = _analyse_new_baby(profile)
        priority_actions = [
            "Open Sukanya Samriddhi Yojana (girl child) or dedicated education MF immediately",
            "Increase term cover to account for child dependency",
            "Budget ₹5,000–15,000/month extra for first 3 years",
        ]

    elif event == LifeEventType.JOB_LOSS:
        months_runway = (
            profile.emergency_fund / profile.monthly_expenses
            if profile.monthly_expenses > 0 else 0
        )
        priority_actions = [
            f"Emergency fund gives {months_runway:.1f} months runway — activate cost-cutting immediately",
            "Pause all non-SIP investments; preserve liquidity",
            "File for EPFO benefits if applicable",
            "Avoid premature FD/MF redemptions — use emergency fund first",
        ]
        insurance_gaps = (
            ["Health insurance not active — buy individual plan immediately (employer cover lapsed)"]
            if not profile.insurance.has_health else []
        )

    elif event == LifeEventType.HOME_PURCHASE:
        down_payment = event_input.event_details.get("property_value", 0) * 0.20
        allocations = [
            LifeEventAllocation(category="Down Payment", amount=down_payment, rationale="20% down payment reduces loan, EMI, and interest burden"),
            LifeEventAllocation(category="Registration + Stamp Duty", amount=down_payment * 0.3, rationale="~6-8% of property value for registration and stamp duty"),
        ]
        priority_actions = [
            "Section 24(b): deduct up to ₹2L home loan interest under old regime",
            "Section 80C: principal repayment counts toward ₹1.5L limit",
            "Ensure EMI + all existing EMIs stay under 40% of gross income",
        ]

    return LifeEventResult(
        event_type=event,
        event_amount=amount,
        allocations=allocations,
        tax_impact=round(tax_impact, 0),
        insurance_gaps=insurance_gaps,
        priority_actions=priority_actions,
    )
