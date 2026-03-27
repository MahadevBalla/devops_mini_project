"""
models/api_responses.py
API envelope models — wraps feature results for HTTP responses.
Also contains FeatureRequest (universal partial-input envelope).
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, model_validator

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
    Universal input envelope for all feature endpoints.

    session_id is NOT accepted from the client — the server always creates
    a new session per feature run, owned by the authenticated user.

    Two strict modes — never mixed:
      use_profile=True  → load portfolio.profile as-is; write derived result back.
                          profile field must be absent/None.
      use_profile=False → use profile field ONLY; portfolio never touched.
                          save_scenario=True persists the run as a named Scenario.
    """

    use_profile: bool = True
    profile: Optional[dict] = None
    save_scenario: bool = False
    scenario_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_mode_consistency(self) -> FeatureRequest:
        if self.use_profile and self.save_scenario:
            raise ValueError(
                "save_scenario=True is only valid when use_profile=False. "
                "Portfolio runs do not create scenarios."
            )
        if self.use_profile and self.profile is not None:
            raise ValueError(
                "profile overrides are not allowed when use_profile=True. "
                "Update your profile via PATCH /api/portfolio/profile instead."
            )
        if not self.use_profile and not self.profile:
            raise ValueError(
                "profile must be provided when use_profile=False. "
                "What-if runs require explicit input data."
            )
        return self


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
    couple: dict
    life_event: dict


class ScenarioSummary(BaseModel):
    """Lightweight scenario view — used in list responses."""

    id: str
    name: str
    feature: str
    created_at: str
    result: dict


class ScenarioDetailResponse(BaseModel):
    """Full scenario view including input_data — used for chat context switching."""

    id: str
    name: str
    feature: str
    created_at: str
    input_data: dict
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
