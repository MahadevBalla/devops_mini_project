"""
models/user.py
UserProfile and all its sub-models (assets, debts, insurance, deductions, goals).
"""

from __future__ import annotations

from pydantic import BaseModel, Field, model_validator

from models.common import EmploymentType, GoalType, RiskProfile


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
            self.equity + self.debt + self.gold
            + self.real_estate + self.cash + self.ppf_epf + self.other
        )


class InsuranceCoverage(BaseModel):
    has_term_life: bool = False
    term_cover: float = 0.0
    has_health: bool = False
    health_cover: float = 0.0
    has_critical_illness: bool = False


class TaxDeductions(BaseModel):
    section_80c: float = Field(
        0.0, ge=0, le=150_000,
        description="Max ₹1.5L under Section 80C",
    )
    section_80d_self: float = Field(
        0.0, ge=0, le=50_000,
        description="₹25k for taxpayer <60 yrs; ₹50k for senior citizen",
    )
    section_80d_self_is_senior: bool = Field(
        False,
        description="Set True if taxpayer is ≥60 years old — raises 80D self limit to ₹50k",
    )
    section_80d_parents: float = Field(
        0.0, ge=0, le=50_000,
        description="₹25k for parents <60 yrs; ₹50k if parents are senior citizens",
    )
    section_80d_parents_are_senior: bool = Field(
        False,
        description="Set True if parents are ≥60 years old — raises 80D parents limit to ₹50k",
    )
    nps_80ccd_1b: float = Field(
        0.0, ge=0, le=50_000,
        description="Additional NPS deduction over 80C limit, max ₹50k",
    )
    hra_claimed: float = Field(0.0, ge=0)
    home_loan_interest: float = Field(
        0.0, ge=0, le=200_000,
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
