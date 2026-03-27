"""
models/mf_xray.py
MF Portfolio X-Ray models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MFHolding(BaseModel):
    scheme_name: str
    isin: str
    units: float
    avg_nav: float
    current_nav: float
    invested_amount: float
    current_value: float
    xirr: Optional[float] = None
    expense_ratio: Optional[float] = None
    category: str = ""


class OverlapPair(BaseModel):
    fund_a: str
    fund_b: str
    overlap_percent: float
    common_stocks: list[str]


class MFXRayResult(BaseModel):
    total_invested: float
    total_current_value: float
    overall_xirr: Optional[float] = None
    # Nifty 50 benchmark tiers — percent p.a., SIP XIRR basis, TRI
    # Conservative: bad decade / 20yr+ horizon | Base: 10yr realistic | Optimistic: strong decade
    benchmark_conservative: float = 9.5
    benchmark_base: float = 11.5
    benchmark_optimistic: float = 13.0
    xirr_vs_benchmark: Optional[float] = None  # vs base; positive = outperforming
    absolute_return_pct: float
    holdings: list[MFHolding]
    overlapping_pairs: list[OverlapPair]
    category_breakdown: dict[str, float]
    high_expense_funds: list[str]
    rebalancing_suggestions: list[str]
