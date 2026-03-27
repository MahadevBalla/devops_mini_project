"""
models/fire.py
FIRE planner result models.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SIPGoal(BaseModel):
    goal_label: str
    target_amount: float
    target_year: int
    required_monthly_sip: float
    required_stepup_sip: float = 0.0
    stepup_rate: float = 0.10
    current_on_track: bool


class YearlyProjection(BaseModel):
    year: int
    age: int
    sip: float
    corpus: float
    invested: float


class FIREPlan(BaseModel):
    fi_corpus_required: float
    current_corpus: float
    corpus_gap: float
    required_monthly_sip: float
    required_stepup_sip: float = 0.0
    stepup_rate: float = 0.10
    projected_fi_age: Optional[float] = None
    years_to_fi: float
    monthly_retirement_expense: float
    sip_goals: list[SIPGoal]
    on_track: bool
    yearly_projections: list[YearlyProjection] = Field(default_factory=list)
