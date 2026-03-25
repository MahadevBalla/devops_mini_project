"""
finance/health.py
Money Health Score engine.
Pure deterministic functions — ZERO LLM calls here.
Every function is independently unit-testable.
"""

from __future__ import annotations

from core.config import settings
from models.schemas import (
    AssetAllocation,
    DimensionScore,
    MoneyHealthResult,
    UserProfile,
)


# Helpers
def _score_label(score: float) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Fair"
    return "Poor"


def _grade(overall: float) -> str:
    if overall >= 80:
        return "A"
    if overall >= 65:
        return "B"
    if overall >= 50:
        return "C"
    if overall >= 35:
        return "D"
    return "F"


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


# Dimension scorers
def score_emergency_fund(profile: UserProfile) -> DimensionScore:
    needed = profile.monthly_expenses * settings.EMERGENCY_FUND_MONTHS
    if needed == 0:
        ratio = 1.0
    else:
        ratio = profile.emergency_fund / needed

    score = _clamp(ratio * 100)
    months_covered = (
        profile.emergency_fund / profile.monthly_expenses if profile.monthly_expenses > 0 else 0
    )

    if ratio >= 1.0:
        insight = f"Emergency fund covers {months_covered:.1f} months — you're fully covered."
    else:
        shortfall = needed - profile.emergency_fund
        insight = (
            f"You have {months_covered:.1f}mo covered; "
            f"₹{shortfall:,.0f} short of the recommended 6-month buffer."
        )

    return DimensionScore(
        name="Emergency Fund", score=score, label=_score_label(score), insight=insight
    )


def score_debt_health(profile: UserProfile) -> DimensionScore:
    if not profile.debts:
        return DimensionScore(
            name="Debt Health",
            score=100.0,
            label="Excellent",
            insight="No outstanding debts — great position.",
        )

    emi_ratio = (
        profile.total_emi / profile.monthly_gross_income
        if profile.monthly_gross_income > 0
        else 1.0
    )
    has_high_interest = any(d.interest_rate > 18 and not d.is_secured for d in profile.debts)

    # EMI-to-income scoring: <20% = 100, 20-40% = 60, 40-60% = 30, >60% = 0
    if emi_ratio < 0.20:
        base_score = 100.0
    elif emi_ratio < 0.40:
        base_score = 60.0 + (0.40 - emi_ratio) / 0.20 * 40.0
    elif emi_ratio < 0.60:
        base_score = 30.0 + (0.60 - emi_ratio) / 0.20 * 30.0
    else:
        base_score = 0.0

    if has_high_interest:
        base_score = max(0, base_score - 20)

    score = _clamp(base_score)
    pct = emi_ratio * 100

    insight = f"EMIs are {pct:.1f}% of income." + (
        " High-interest unsecured debt detected — prioritise payoff." if has_high_interest else ""
    )

    return DimensionScore(
        name="Debt Health", score=score, label=_score_label(score), insight=insight
    )


def score_investment_diversification(assets: AssetAllocation) -> DimensionScore:
    total = assets.total
    if total == 0:
        return DimensionScore(
            name="Diversification",
            score=0.0,
            label="Poor",
            insight="No investments recorded. Start with equity mutual funds via SIPs.",
        )

    equity_pct = assets.equity / total
    cash_pct = assets.cash / total
    gold_pct = assets.gold / total

    penalties = 0.0
    flags = []

    # Too much cash is drag
    if cash_pct > 0.30:
        penalties += 25
        flags.append(f"{cash_pct * 100:.0f}% in cash is too high")

    # Equity overconcentration
    if equity_pct > 0.85:
        penalties += 15
        flags.append("equity overweight >85%")

    # Zero equity for moderate/aggressive is bad
    if equity_pct == 0:
        penalties += 30
        flags.append("no equity allocation")

    # Gold overconcentration
    if gold_pct > 0.20:
        penalties += 10
        flags.append("gold >20%")

    score = _clamp(100 - penalties)
    insight = "Well-diversified portfolio." if not flags else "Issues: " + "; ".join(flags) + "."
    return DimensionScore(
        name="Diversification", score=score, label=_score_label(score), insight=insight
    )


def score_retirement_readiness(profile: UserProfile) -> DimensionScore:
    from finance.fire import calculate_fi_corpus, compound_growth_value

    corpus_needed = calculate_fi_corpus(profile)
    current_corpus = profile.assets.total + profile.emergency_fund
    years = profile.years_to_retirement

    if corpus_needed == 0:
        return DimensionScore(
            name="Retirement Readiness",
            score=100.0,
            label="Excellent",
            insight="Retirement corpus goal met.",
        )

    projected = compound_growth_value(current_corpus, settings.DEFAULT_EQUITY_RETURN, years)
    ratio = min(projected / corpus_needed, 1.0)
    score = _clamp(ratio * 100)

    insight = (
        f"Projected corpus ₹{projected:,.0f} vs. needed ₹{corpus_needed:,.0f} "
        f"({ratio * 100:.0f}% funded)."
    )
    return DimensionScore(
        name="Retirement Readiness",
        score=score,
        label=_score_label(score),
        insight=insight,
    )


def score_insurance_coverage(profile: UserProfile) -> DimensionScore:
    flags = []
    score = 100.0

    # Term life: recommended 10–15× annual income
    recommended_term = profile.annual_gross_income * 10
    if not profile.insurance.has_term_life:
        score -= 40
        flags.append("no term life cover")
    elif profile.insurance.term_cover < recommended_term:
        score -= 20
        flags.append(
            f"term cover ₹{profile.insurance.term_cover:,.0f} < recommended ₹{recommended_term:,.0f}"
        )

    # Health insurance
    if not profile.insurance.has_health:
        score -= 35
        flags.append("no health insurance")
    elif profile.insurance.health_cover < 500_000:
        score -= 10
        flags.append("health cover below ₹5L — consider topping up")

    score = _clamp(score)
    insight = "Adequate insurance coverage." if not flags else "Gaps: " + "; ".join(flags) + "."
    return DimensionScore(
        name="Insurance Coverage",
        score=score,
        label=_score_label(score),
        insight=insight,
    )


def score_tax_efficiency(profile: UserProfile) -> DimensionScore:
    from finance.tax import compare_tax_regimes

    result = compare_tax_regimes(profile)
    total_potential = result.deduction_potential

    # Score based on deductions used vs available
    if total_potential == 0:
        score = 100.0
    else:
        score = _clamp(100 - (total_potential / profile.annual_gross_income) * 100 * 2)

    on_wrong_regime = result.savings_by_switching > 5000
    if on_wrong_regime:
        score = max(0, score - 20)

    insight = (
        f"₹{result.savings_by_switching:,.0f} tax savings possible by switching to {result.recommended_regime.value} regime."
        if on_wrong_regime
        else "Tax regime is optimised."
    )
    return DimensionScore(
        name="Tax Efficiency", score=score, label=_score_label(score), insight=insight
    )


# Composite scorer
DIMENSION_WEIGHTS = {
    "Emergency Fund": 0.20,
    "Debt Health": 0.20,
    "Diversification": 0.15,
    "Retirement Readiness": 0.20,
    "Insurance Coverage": 0.15,
    "Tax Efficiency": 0.10,
}


def calculate_money_health_score(profile: UserProfile) -> MoneyHealthResult:
    """
    Entry point for the Money Health Score feature.
    Returns a fully populated MoneyHealthResult with per-dimension breakdowns.
    """
    dimensions = [
        score_emergency_fund(profile),
        score_debt_health(profile),
        score_investment_diversification(profile.assets),
        score_retirement_readiness(profile),
        score_insurance_coverage(profile),
        score_tax_efficiency(profile),
    ]

    for d in dimensions:
        d.score = round(d.score, 2)

    overall = sum(d.score * DIMENSION_WEIGHTS[d.name] for d in dimensions)
    overall = _clamp(overall)

    total_assets = profile.assets.total + profile.emergency_fund
    total_liabilities = sum(d.outstanding for d in profile.debts)

    return MoneyHealthResult(
        overall_score=round(overall, 1),
        grade=_grade(overall),
        dimensions=dimensions,
        monthly_surplus=profile.monthly_savings - profile.total_emi,
        total_net_worth=total_assets - total_liabilities,
    )
