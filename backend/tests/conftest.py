"""
tests/conftest.py
Shared fixtures for all test modules.
Finance engine tests only need sample_profile — no DB, no LLM.
"""

import pytest

from models import (
    AssetAllocation,
    DebtItem,
    Goal,
    GoalType,
    InsuranceCoverage,
    RiskProfile,
    TaxDeductions,
    UserProfile,
)


@pytest.fixture(scope="session")
def sample_profile() -> UserProfile:
    return UserProfile(
        age=28,
        city="Mumbai",
        monthly_gross_income=100_000,
        monthly_expenses=45_000,
        emergency_fund=270_000,  # exactly 6 months
        assets=AssetAllocation(
            equity=300_000,
            debt=100_000,
            gold=50_000,
            cash=200_000,
            ppf_epf=150_000,
        ),
        debts=[
            DebtItem(
                name="Car Loan",
                outstanding=400_000,
                emi=10_000,
                interest_rate=9.5,
                is_secured=True,
            )
        ],
        insurance=InsuranceCoverage(
            has_term_life=True,
            term_cover=10_000_000,
            has_health=True,
            health_cover=500_000,
        ),
        tax_deductions=TaxDeductions(
            section_80c=50_000,
            section_80d_self=15_000,
            nps_80ccd_1b=0,
        ),
        retirement_age=60,
        risk_profile=RiskProfile.MODERATE,
        goals=[
            Goal(
                type=GoalType.RETIREMENT,
                label="Retirement",
                target_amount=50_000_000,
                target_year=2057,
            )
        ],
    )
