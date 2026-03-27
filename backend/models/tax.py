"""
models/tax.py
Tax wizard result models.
"""

from __future__ import annotations

from pydantic import BaseModel

from models.common import TaxRegime


class TaxRegimeComparison(BaseModel):
    gross_income: float
    old_regime_tax: float
    new_regime_tax: float
    recommended_regime: TaxRegime
    savings_by_switching: float
    effective_rate_old: float
    effective_rate_new: float
    missing_deductions: list[str]
    deduction_potential: float
