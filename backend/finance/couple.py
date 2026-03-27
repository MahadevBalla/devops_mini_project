"""
finance/couple.py
Couple's Money Planner — joint financial optimisation.
Optimises: HRA claims, NPS matching, SIP split, insurance, tax efficiency.
"""

from __future__ import annotations

from core.config import settings
from finance.fire import required_monthly_sip
from finance.tax import compute_old_regime_tax
from models import CoupleOptimisation, CoupleProfile, UserProfile


def _net_worth(profile: UserProfile) -> float:
    total_assets = profile.assets.total + profile.emergency_fund
    total_liabilities = sum(d.outstanding for d in profile.debts)
    return total_assets - total_liabilities


def _hra_benefit(profile: UserProfile) -> float:
    """
    HRA exemption = min(actual HRA, 50% of basic for metro/40% for non-metro, actual rent - 10% basic).
    Simplified: if hra_claimed > 0, that's already reflected in deductions.
    We estimate additional HRA benefit possible if not claimed.
    """
    if profile.tax_deductions.hra_claimed > 0:
        return profile.tax_deductions.hra_claimed
    # Estimate: assume basic = 40% of gross, rent = 25% of gross
    basic = profile.monthly_gross_income * 0.4
    rent = profile.monthly_gross_income * 0.25
    metro_cities = {
        "mumbai",
        "delhi",
        "kolkata",
        "chennai",
        "bangalore",
        "bengaluru",
        "hyderabad",
        "pune",
    }
    is_metro = profile.city.lower() in metro_cities
    hra_component = basic * (0.50 if is_metro else 0.40)
    rent_minus_10 = max(rent - basic * 0.10, 0)
    return min(hra_component, rent_minus_10) * 12  # annual


def _better_hra_claimant(a: UserProfile, b: UserProfile) -> tuple[str, float]:
    """
    The partner who gets more HRA benefit should claim it.
    Return (partner_label, annual_savings).
    """
    hra_a = _hra_benefit(a)
    hra_b = _hra_benefit(b)
    if hra_a >= hra_b:
        return "partner_a", hra_a
    return "partner_b", hra_b


def _nps_matching_benefit(a: UserProfile, b: UserProfile) -> float:
    """
    NPS 80CCD(1B) gives extra ₹50,000 deduction over 80C.
    Estimate combined benefit if both use it fully.
    """
    from finance.tax_constants import CURRENT as TAX

    benefit_a = max(0, TAX.nps_80ccd_1b_limit - a.tax_deductions.nps_80ccd_1b)
    benefit_b = max(0, TAX.nps_80ccd_1b_limit - b.tax_deductions.nps_80ccd_1b)
    # Tax saving = deduction × marginal rate (approximate 30% + cess for simplicity)
    marginal_rate = 0.312  # 30% + 4% cess
    return (benefit_a + benefit_b) * marginal_rate


def _optimise_sip_split(a: UserProfile, b: UserProfile, joint_goals) -> tuple[float, float]:
    """
    Split SIP proportionally to investable surplus.
    Higher-income partner invests more; keeps 80C utilisation balanced.
    """
    surplus_a = max(0.0, a.monthly_savings - a.total_emi)
    surplus_b = max(0.0, b.monthly_savings - b.total_emi)
    total_surplus = surplus_a + surplus_b

    # Estimate total SIP needed for joint retirement
    combined_expenses = a.monthly_expenses + b.monthly_expenses
    avg_age = (a.age + b.age) // 2
    avg_retirement = (a.retirement_age + b.retirement_age) // 2
    years_left = max(avg_retirement - avg_age, 1)

    fake_corpus = (
        combined_expenses
        * 12
        * (1 + settings.DEFAULT_INFLATION_RATE) ** years_left
        / settings.DEFAULT_SAFE_WITHDRAWAL_RATE
    )
    total_sip_needed = required_monthly_sip(
        fake_corpus, a.assets.total + b.assets.total, 0.10, years_left
    )

    if total_surplus == 0:
        return 0.0, 0.0

    ratio_a = surplus_a / total_surplus
    sip_a = min(total_sip_needed * ratio_a, surplus_a)
    sip_b = min(total_sip_needed * (1 - ratio_a), surplus_b)
    return round(sip_a, 0), round(sip_b, 0)


def _joint_tax_saving(a: UserProfile, b: UserProfile) -> float:
    """
    Estimate combined tax saving if both partners fully optimise old-regime deductions.
    """
    from finance.tax_constants import CURRENT as TAX
    from models import TaxDeductions

    def max_deductions() -> TaxDeductions:
        return TaxDeductions(
            section_80c=float(TAX.sec_80c_limit),
            section_80d_self=float(TAX.sec_80d_self_limit),
            section_80d_parents=float(TAX.sec_80d_parents_limit),
            nps_80ccd_1b=float(TAX.nps_80ccd_1b_limit),
        )

    saving_a = compute_old_regime_tax(
        a.annual_gross_income, a.tax_deductions
    ) - compute_old_regime_tax(a.annual_gross_income, max_deductions())
    saving_b = compute_old_regime_tax(
        b.annual_gross_income, b.tax_deductions
    ) - compute_old_regime_tax(b.annual_gross_income, max_deductions())
    return round(max(saving_a, 0) + max(saving_b, 0), 0)


def _joint_insurance_recommendation(a: UserProfile, b: UserProfile) -> str:
    parts = []
    if not a.insurance.has_term_life:
        parts.append(f"Partner A needs ₹{a.annual_gross_income * 10:,.0f} term cover")
    if not b.insurance.has_term_life:
        parts.append(f"Partner B needs ₹{b.annual_gross_income * 10:,.0f} term cover")
    if not a.insurance.has_health or not b.insurance.has_health:
        parts.append(
            "Move to a joint family floater health plan — cheaper than two individual plans"
        )
    if not parts:
        return "Insurance adequate — review sum assured annually as income grows"
    return "; ".join(parts)


def _build_recommendations(a: UserProfile, b: UserProfile, result: CoupleOptimisation) -> list[str]:
    recs = [
        f"Optimise HRA claim under {result.better_hra_claimant.replace('_', ' ').title()} — saves ₹{result.hra_savings:,.0f}/yr",
        f"Both partners contribute ₹50,000 to NPS — saves ₹{result.nps_matching_benefit:,.0f}/yr in tax",
        f"Split SIPs: Partner A ₹{result.partner_a_sip:,.0f}/mo, Partner B ₹{result.partner_b_sip:,.0f}/mo",
        "Maintain separate emergency funds (6 months each) + one joint fund (3 months household expenses)",
        "Track combined net worth monthly — target 20% year-on-year growth",
    ]
    if a.dependents > 0 or b.dependents > 0:
        recs.append("With dependents, increase term cover to 20× annual household income")
    return recs


def optimise_couple_finances(couple: CoupleProfile) -> CoupleOptimisation:
    a, b = couple.partner_a, couple.partner_b

    nw_a = _net_worth(a)
    nw_b = _net_worth(b)

    hra_partner, hra_savings = _better_hra_claimant(a, b)
    nps_benefit = _nps_matching_benefit(a, b)
    sip_a, sip_b = _optimise_sip_split(a, b, couple.joint_goals)
    joint_saving = _joint_tax_saving(a, b)
    insurance_rec = _joint_insurance_recommendation(a, b)

    result = CoupleOptimisation(
        combined_net_worth=round(nw_a + nw_b, 0),
        combined_monthly_surplus=round(
            max(0, a.monthly_savings - a.total_emi) + max(0, b.monthly_savings - b.total_emi), 0
        ),
        better_hra_claimant=hra_partner,
        hra_savings=round(hra_savings, 0),
        nps_matching_benefit=round(nps_benefit, 0),
        partner_a_sip=sip_a,
        partner_b_sip=sip_b,
        joint_tax_saving=joint_saving,
        joint_insurance_recommendation=insurance_rec,
        recommendations=[],  # filled below
    )
    result.recommendations = _build_recommendations(a, b, result)
    return result
