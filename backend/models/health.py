"""
models/health.py
Money Health Score result models.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DimensionScore(BaseModel):
    name: str
    score: float = Field(..., ge=0, le=100)
    label: str
    insight: str


class MoneyHealthResult(BaseModel):
    overall_score: float
    grade: str
    dimensions: list[DimensionScore]
    monthly_surplus: float
    total_net_worth: float
