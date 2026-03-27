"""
models/couple.py
Couple finance planner models.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from models.user import Goal, UserProfile


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
