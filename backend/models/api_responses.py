"""
models/api_responses.py
API envelope models — wraps feature results for HTTP responses.
Also contains FeatureRequest (universal partial-input envelope).
"""

from __future__ import annotations

import uuid as uuid_module
from typing import Optional

from pydantic import BaseModel, field_validator

from models.common import AgentAdvice
from models.couple import CoupleOptimisation
from models.fire import FIREPlan
from models.health import MoneyHealthResult
from models.life_event import LifeEventResult
from models.mf_xray import MFXRayResult
from models.tax import TaxRegimeComparison
from models.user import UserProfile


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None


class FeatureRequest(BaseModel):
    """
    Universal partial-input envelope for all feature endpoints.

    use_profile=True  → load from Portfolio, merge any incoming overrides, save back.
    use_profile=False → pure what-if; Portfolio never touched.
    save_scenario=True → persist this run as a named Scenario (only when use_profile=False).
    """
    session_id: str
    use_profile: bool = True
    profile: Optional[dict] = None
    save_scenario: bool = False
    scenario_name: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid_module.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID")
        return v


class SessionCreateResponse(BaseModel):
    session_id: str
    created: bool = True


class PortfolioResponse(BaseModel):
    user_id: str
    profile: dict
    fire: dict
    health: dict
    tax: dict
    mf: dict


class ScenarioSummary(BaseModel):
    id: str
    name: str
    feature: str
    created_at: str
    result: dict


class FIREPlanResponse(BaseModel):
    session_id: str
    profile: UserProfile
    result: FIREPlan
    advice: AgentAdvice
    decision_log: list[dict]


class HealthScoreResponse(BaseModel):
    session_id: str
    profile: UserProfile
    result: MoneyHealthResult
    advice: AgentAdvice
    decision_log: list[dict]


class TaxWizardResponse(BaseModel):
    session_id: str
    profile: UserProfile
    result: TaxRegimeComparison
    advice: AgentAdvice
    decision_log: list[dict]


class LifeEventResponse(BaseModel):
    session_id: str
    result: LifeEventResult
    advice: AgentAdvice
    decision_log: list[dict]


class CoupleResponse(BaseModel):
    session_id: str
    result: CoupleOptimisation
    advice: AgentAdvice
    decision_log: list[dict]


class MFXRayResponse(BaseModel):
    session_id: str
    result: MFXRayResult
    advice: AgentAdvice
    decision_log: list[dict]
