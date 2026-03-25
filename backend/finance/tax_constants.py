"""
finance/tax_constants.py

India Finance Act constants for FY 2025-26 (AY 2026-27).

WHY THIS FILE EXISTS
--------------------
Tax slabs, rebate thresholds, and deduction ceilings are statutory constants
defined by the Finance Act. They are NOT environment variables (they don't
change between dev/staging/prod) and NOT magic numbers scattered in functions.

When Budget 2026 changes a slab, update ONLY this file.
Every other module imports from here — nothing else hard-codes these values.

VERSIONING CONVENTION
---------------------
Each fiscal year gets its own frozen dataclass. The `CURRENT` alias always
points to the active year so all callers stay unchanged when we add FY26.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TaxSlab:
    """A single progressive tax band: income above `lower` up to `upper` is taxed at `rate`."""
    lower: float
    upper: float        # use float('inf') for the top band
    rate: float         # fraction, e.g. 0.30 for 30%


@dataclass(frozen=True)
class SurchargeThreshold:
    lower: float
    upper: float
    rate: float         # fraction applied to base tax


@dataclass(frozen=True)
class IndiaFiscalYearConstants:
    fy: str             # e.g. "2025-26"

    # Standard deductions
    standard_deduction_old: int
    standard_deduction_new: int

    # Old regime slabs
    old_slabs: tuple[TaxSlab, ...]

    # Old regime rebate (87A)
    old_rebate_limit: float         # taxable income ceiling for full rebate
    old_rebate_max: float           # max rebate amount (≤ actual tax)

    # New regime slabs
    new_slabs: tuple[TaxSlab, ...]

    # New regime rebate (87A)
    new_rebate_limit: float
    new_rebate_max: float

    # Surcharge (common to both regimes, except top rate differs)
    surcharge_old: tuple[SurchargeThreshold, ...]
    surcharge_new: tuple[SurchargeThreshold, ...]

    # Cess
    cess_rate: float                # health & education cess

    # Deduction ceilings (old regime)
    sec_80c_limit: int
    sec_80d_self_limit: int
    sec_80d_self_senior_limit: int
    sec_80d_parents_limit: int
    sec_80d_parents_senior_limit: int
    nps_80ccd_1b_limit: int
    home_loan_interest_limit: int   # section 24(b)

    # Misc
    ltcg_exemption: int             # section 112A


# FY 2025-26  (Budget 2025, effective 1-Apr-2025)
FY2025_26 = IndiaFiscalYearConstants(
    fy="2025-26",

    standard_deduction_old=50_000,
    standard_deduction_new=75_000,

    # Old regime: nil / 5% / 20% / 30%
    old_slabs=(
        TaxSlab(lower=0,          upper=2_50_000,    rate=0.00),
        TaxSlab(lower=2_50_000,   upper=5_00_000,    rate=0.05),
        TaxSlab(lower=5_00_000,   upper=10_00_000,   rate=0.20),
        TaxSlab(lower=10_00_000,  upper=float("inf"), rate=0.30),
    ),
    old_rebate_limit=5_00_000,
    old_rebate_max=12_500,

    # New regime: nil / 5% / 10% / 15% / 20% / 30%
    new_slabs=(
        TaxSlab(lower=0,          upper=3_00_000,    rate=0.00),
        TaxSlab(lower=3_00_000,   upper=7_00_000,    rate=0.05),
        TaxSlab(lower=7_00_000,   upper=10_00_000,   rate=0.10),
        TaxSlab(lower=10_00_000,  upper=12_00_000,   rate=0.15),
        TaxSlab(lower=12_00_000,  upper=15_00_000,   rate=0.20),
        TaxSlab(lower=15_00_000,  upper=float("inf"), rate=0.30),
    ),
    new_rebate_limit=7_00_000,
    new_rebate_max=25_000,          # full tax rebate up to ₹25k

    # Surcharge — old regime allows 37% at highest; new regime capped at 25%
    surcharge_old=(
        SurchargeThreshold(lower=50_00_000,  upper=1_00_00_000,  rate=0.10),
        SurchargeThreshold(lower=1_00_00_000, upper=2_00_00_000, rate=0.15),
        SurchargeThreshold(lower=2_00_00_000, upper=5_00_00_000, rate=0.25),
        SurchargeThreshold(lower=5_00_00_000, upper=float("inf"), rate=0.37),
    ),
    surcharge_new=(
        SurchargeThreshold(lower=50_00_000,  upper=1_00_00_000,  rate=0.10),
        SurchargeThreshold(lower=1_00_00_000, upper=2_00_00_000, rate=0.15),
        SurchargeThreshold(lower=2_00_00_000, upper=float("inf"), rate=0.25),  # capped at 25%
    ),

    cess_rate=0.04,

    sec_80c_limit=1_50_000,
    sec_80d_self_limit=25_000,
    sec_80d_self_senior_limit=50_000,
    sec_80d_parents_limit=25_000,
    sec_80d_parents_senior_limit=50_000,
    nps_80ccd_1b_limit=50_000,
    home_loan_interest_limit=2_00_000,
    ltcg_exemption=1_25_000,
)


# Active year alias
# Change this one line when FY rolls over.
CURRENT: IndiaFiscalYearConstants = FY2025_26
