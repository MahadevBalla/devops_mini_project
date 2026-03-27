"""
models/life_event.py
Life event planner models.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from models.common import LifeEventType
from models.user import UserProfile


class LifeEventInput(BaseModel):
    profile: UserProfile
    event_type: LifeEventType
    event_amount: float = Field(0.0, ge=0)
    event_details: dict = Field(default_factory=dict)


class LifeEventAllocation(BaseModel):
    category: str
    amount: float
    rationale: str


class LifeEventResult(BaseModel):
    event_type: LifeEventType
    event_amount: float
    allocations: list[LifeEventAllocation]
    tax_impact: float
    insurance_gaps: list[str]
    priority_actions: list[str]
