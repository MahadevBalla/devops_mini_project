"""
models/schemas.py
Pydantic v2 models — the single source of truth for all data contracts.
"""

from __future__ import annotations

import uuid as uuid_module
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


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


class Goal(BaseModel):
    type: GoalType
    label: str = ""
    target_amount: float = Field(..., ge=0)
    target_year: int = Field(..., ge=2025, le=2075)


class DebtItem(BaseModel):
    name: str
    outstanding: float = Field(..., ge=0)
    emi: float = Field(..., ge=0)
    interest_rate: float = Field(..., ge=0, le=100)
    is_secured: bool = True


class AssetAllocation(BaseModel):
    equity: float = Field(0.0, ge=0)
    debt: float = Field(0.0, ge=0)
    gold: float = Field(0.0, ge=0)
    real_estate: float = Field(0.0, ge=0)
    cash: float = Field(0.0, ge=0)
    ppf_epf: float = Field(0.0, ge=0)
    other: float = Field(0.0, ge=0)

    @property
    def total(self) -> float:
        return (
            self.equity
            + self.debt
            + self.gold
            + self.real_estate
            + self.cash
            + self.ppf_epf
            + self.other
        )


class InsuranceCoverage(BaseModel):
    has_term_life: bool = False
    term_cover: float = 0.0
    has_health: bool = False
    health_cover: float = 0.0
    has_critical_illness: bool = False


class TaxDeductions(BaseModel):
    section_80c: float = Field(
        0.0,
        ge=0,
        le=150_000,
        description="Max ₹1.5L under Section 80C",
    )
    section_80d_self: float = Field(
        0.0,
        ge=0,
        le=50_000,
        description="₹25k for taxpayer <60 yrs; ₹50k for senior citizen (set section_80d_self_is_senior=True)",
    )
    section_80d_self_is_senior: bool = Field(
        False,
        description="Set True if taxpayer is ≥60 years old — raises 80D self limit to ₹50k",
    )
    section_80d_parents: float = Field(
        0.0,
        ge=0,
        le=50_000,
        description="₹25k for parents <60 yrs; ₹50k if parents are senior citizens (set section_80d_parents_are_senior=True)",
    )
    section_80d_parents_are_senior: bool = Field(
        False,
        description="Set True if parents are ≥60 years old — raises 80D parents limit to ₹50k",
    )
    nps_80ccd_1b: float = Field(
        0.0,
        ge=0,
        le=50_000,
        description="Additional NPS deduction over 80C limit, max ₹50k",
    )
    hra_claimed: float = Field(0.0, ge=0)
    home_loan_interest: float = Field(
        0.0,
        ge=0,
        le=200_000,
        description="Section 24(b) home loan interest, max ₹2L for self-occupied",
    )
    other_deductions: float = Field(0.0, ge=0)


class UserProfile(BaseModel):
    age: int = Field(..., ge=18, le=70)
    city: str = Field(..., min_length=2)
    employment_type: EmploymentType = EmploymentType.SALARIED
    dependents: int = Field(0, ge=0, le=10)
    monthly_gross_income: float = Field(..., ge=0)
    monthly_expenses: float = Field(..., ge=0)
    emergency_fund: float = Field(0.0, ge=0)
    assets: AssetAllocation = Field(default_factory=AssetAllocation)
    debts: list[DebtItem] = Field(default_factory=list)
    insurance: InsuranceCoverage = Field(default_factory=InsuranceCoverage)
    tax_deductions: TaxDeductions = Field(default_factory=TaxDeductions)
    retirement_age: int = Field(60, ge=30, le=70)
    risk_profile: RiskProfile = RiskProfile.MODERATE
    goals: list[Goal] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_cross_fields(self) -> UserProfile:
        if self.monthly_expenses > self.monthly_gross_income:
            raise ValueError("monthly_expenses cannot exceed monthly_gross_income")
        if self.retirement_age <= self.age:
            raise ValueError("retirement_age must be greater than current age")
        return self

    @property
    def annual_gross_income(self) -> float:
        return self.monthly_gross_income * 12

    @property
    def monthly_savings(self) -> float:
        return self.monthly_gross_income - self.monthly_expenses

    @property
    def total_emi(self) -> float:
        return sum(d.emi for d in self.debts)

    @property
    def years_to_retirement(self) -> int:
        return self.retirement_age - self.age


# FIRE
class SIPGoal(BaseModel):
    goal_label: str
    target_amount: float
    target_year: int
    required_monthly_sip: float
    required_stepup_sip: float = 0.0
    stepup_rate: float = 0.10
    current_on_track: bool


class FIREPlan(BaseModel):
    fi_corpus_required: float
    current_corpus: float
    corpus_gap: float
    required_monthly_sip: float
    required_stepup_sip: float = 0.0
    stepup_rate: float = 0.10
    projected_fi_age: Optional[float] = None  # None = FI not reachable within 60 years
    years_to_fi: float
    monthly_retirement_expense: float
    sip_goals: list[SIPGoal]
    on_track: bool


# Health
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


# Tax
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


# Life Event
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


# Couple
class CoupleProfile(BaseModel):
    partner_a: UserProfile
    partner_b: UserProfile
    is_married: bool = True
    joint_goals: list[Goal] = Field(default_factory=list)


class CoupleOptimisation(BaseModel):
    combined_net_worth: float
    combined_monthly_surplus: float
    better_hra_claimant: str
    hra_savings: float
    nps_matching_benefit: float
    partner_a_sip: float
    partner_b_sip: float
    joint_tax_saving: float
    joint_insurance_recommendation: str
    recommendations: list[str]


# MF X-Ray
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
    absolute_return_pct: float
    holdings: list[MFHolding]
    overlapping_pairs: list[OverlapPair]
    category_breakdown: dict[str, float]
    high_expense_funds: list[str]
    rebalancing_suggestions: list[str]


# Chat
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User message — min 1 char, max 4000 chars to prevent prompt stuffing",
    )
    feature_context: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid_module.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID (e.g. from POST /api/session)")
        return v


class ChatResponse(BaseModel):
    session_id: str
    reply: str


# Shared advice
class AgentAdvice(BaseModel):
    summary: str
    key_actions: list[str]
    risks: list[str]
    disclaimer: str
    regime_suggestion: Optional[str] = None


# API envelopes
class HealthScoreResponse(BaseModel):
    session_id: str
    profile: UserProfile
    result: MoneyHealthResult
    advice: AgentAdvice
    decision_log: list[dict]


class FIREPlanResponse(BaseModel):
    session_id: str
    profile: UserProfile
    result: FIREPlan
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


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[str] = None
