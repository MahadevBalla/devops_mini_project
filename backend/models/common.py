"""
models/common.py
Shared enums and AgentAdvice used across multiple features.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RiskProfile(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class EmploymentType(str, Enum):
    SALARIED = "salaried"
    SELF_EMPLOYED = "self_employed"
    BUSINESS = "business"


class TaxRegime(str, Enum):
    OLD = "old"
    NEW = "new"


class GoalType(str, Enum):
    RETIREMENT = "retirement"
    HOUSE = "house"
    EDUCATION = "education"
    MARRIAGE = "marriage"
    EMERGENCY = "emergency"
    VACATION = "vacation"
    CUSTOM = "custom"


class LifeEventType(str, Enum):
    BONUS = "bonus"
    INHERITANCE = "inheritance"
    MARRIAGE = "marriage"
    NEW_BABY = "new_baby"
    JOB_LOSS = "job_loss"
    HOME_PURCHASE = "home_purchase"


class AgentAdvice(BaseModel):
    summary: str
    key_actions: list[str]
    risks: list[str]
    disclaimer: str
    regime_suggestion: Optional[str] = None
