"""
finance/tax.py
India Tax Wizard — old vs new regime comparison, missing deductions analysis.
All statutory constants imported from finance.tax_constants — NOTHING hardcoded here.
"""

from __future__ import annotations

from finance.tax_constants import CURRENT as TAX
from finance.tax_constants import IndiaFiscalYearConstants
from models import TaxDeductions, TaxRegime, TaxRegimeComparison, UserProfile


def _apply_slabs(taxable: float, constants: IndiaFiscalYearConstants, regime: TaxRegime) -> float:
    slabs = constants.old_slabs if regime == TaxRegime.OLD else constants.new_slabs
    tax = 0.0
    for slab in slabs:
        if taxable <= slab.lower:
            break
        band = min(taxable, slab.upper) - slab.lower
        tax += band * slab.rate
    return max(tax, 0.0)


def _apply_rebate(
    taxable: float, base_tax: float, regime: TaxRegime, constants: IndiaFiscalYearConstants
) -> float:
    if regime == TaxRegime.OLD:
        if taxable <= constants.old_rebate_limit:
            rebate = min(base_tax, constants.old_rebate_max)
            return max(0.0, base_tax - rebate)
    else:
        if taxable <= constants.new_rebate_limit:
            rebate = min(base_tax, constants.new_rebate_max)
            return max(0.0, base_tax - rebate)
    return base_tax


def _apply_surcharge(
    income: float, base_tax: float, regime: TaxRegime, constants: IndiaFiscalYearConstants
) -> float:
    thresholds = constants.surcharge_old if regime == TaxRegime.OLD else constants.surcharge_new
    for t in reversed(thresholds):
        if income > t.lower:
            surcharge = base_tax * t.rate
            # Marginal relief: surcharge cannot push total tax increase above
            # the incremental income over the threshold.
            marginal_limit = income - t.lower
            surcharge = min(surcharge, marginal_limit)
            return max(surcharge, 0.0)
    return 0.0


def _total_tax(
    taxable: float, gross: float, regime: TaxRegime, constants: IndiaFiscalYearConstants
) -> float:
    base = _apply_slabs(taxable, constants, regime)
    after_rebate = _apply_rebate(taxable, base, regime, constants)
    surcharge = _apply_surcharge(gross, after_rebate, regime, constants)
    return after_rebate + surcharge + (after_rebate + surcharge) * constants.cess_rate


def _old_taxable(
    gross: float, deductions: TaxDeductions, constants: IndiaFiscalYearConstants
) -> float:
    total = (
        constants.standard_deduction_old
        + min(deductions.section_80c, constants.sec_80c_limit)
        + min(deductions.section_80d_self, constants.sec_80d_self_limit)
        + min(deductions.section_80d_parents, constants.sec_80d_parents_limit)
        + min(deductions.nps_80ccd_1b, constants.nps_80ccd_1b_limit)
        + deductions.hra_claimed
        + min(deductions.home_loan_interest, constants.home_loan_interest_limit)
        + deductions.other_deductions
    )
    return max(gross - total, 0.0)


def _new_taxable(gross: float, constants: IndiaFiscalYearConstants) -> float:
    return max(gross - constants.standard_deduction_new, 0.0)


def compute_old_regime_tax(
    gross: float, deductions: TaxDeductions, constants: IndiaFiscalYearConstants = TAX
) -> float:
    taxable = _old_taxable(gross, deductions, constants)
    return round(_total_tax(taxable, gross, TaxRegime.OLD, constants), 2)


def compute_new_regime_tax(gross: float, constants: IndiaFiscalYearConstants = TAX) -> float:
    taxable = _new_taxable(gross, constants)
    return round(_total_tax(taxable, gross, TaxRegime.NEW, constants), 2)


def analyse_missing_deductions(
    deductions: TaxDeductions, constants: IndiaFiscalYearConstants = TAX
) -> tuple[list[str], float]:
    missing: list[str] = []
    potential = 0.0

    unused_80c = constants.sec_80c_limit - deductions.section_80c
    if unused_80c > 0:
        missing.append(
            f"Section 80C: ₹{unused_80c:,.0f} unused — PPF, ELSS, EPF top-up, LIC premium"
        )
        potential += unused_80c

    unused_80d_self = constants.sec_80d_self_limit - deductions.section_80d_self
    if unused_80d_self > 0:
        missing.append(f"Section 80D (self/family health): ₹{unused_80d_self:,.0f} unused")
        potential += unused_80d_self

    unused_80d_parents = constants.sec_80d_parents_limit - deductions.section_80d_parents
    if unused_80d_parents > 0:
        missing.append(f"Section 80D (parents' health): ₹{unused_80d_parents:,.0f} unused")
        potential += unused_80d_parents

    unused_nps = constants.nps_80ccd_1b_limit - deductions.nps_80ccd_1b
    if unused_nps > 0:
        missing.append(f"NPS 80CCD(1B): ₹{unused_nps:,.0f} unused — additional NPS over 80C limit")
        potential += unused_nps

    if deductions.hra_claimed == 0:
        missing.append("HRA: not claimed — submit rent receipts to employer if paying rent")

    if deductions.home_loan_interest == 0:
        missing.append(
            f"Sec 24(b): home loan interest up to ₹{constants.home_loan_interest_limit:,.0f} deductible"
        )

    return missing, round(potential, 0)


def compare_tax_regimes(
    profile: UserProfile, constants: IndiaFiscalYearConstants = TAX
) -> TaxRegimeComparison:
    gross = profile.annual_gross_income
    old_tax = compute_old_regime_tax(gross, profile.tax_deductions, constants)
    new_tax = compute_new_regime_tax(gross, constants)
    recommended = TaxRegime.OLD if old_tax < new_tax else TaxRegime.NEW
    missing, potential = analyse_missing_deductions(profile.tax_deductions, constants)
    return TaxRegimeComparison(
        gross_income=gross,
        old_regime_tax=old_tax,
        new_regime_tax=new_tax,
        recommended_regime=recommended,
        savings_by_switching=round(abs(new_tax - old_tax), 0),
        effective_rate_old=round(old_tax / gross * 100, 2) if gross > 0 else 0.0,
        effective_rate_new=round(new_tax / gross * 100, 2) if gross > 0 else 0.0,
        missing_deductions=missing,
        deduction_potential=potential,
    )
