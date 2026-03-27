"""
models/__init__.py
Explicit re-exports — keeps 'from models import X' working everywhere
without wildcard imports (ruff F403).
"""

# common
# api_responses
from models.api_responses import (
    CoupleResponse,
    ErrorResponse,
    FeatureRequest,
    FIREPlanResponse,
    HealthScoreResponse,
    LifeEventResponse,
    MFXRayResponse,
    PortfolioResponse,
    ScenarioSummary,
    SessionCreateResponse,
    TaxWizardResponse,
)

# auth
from models.auth import (
    EmailVerificationConfirm,
    EmailVerificationRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

# chat
from models.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
)
from models.common import (
    AgentAdvice,
    EmploymentType,
    GoalType,
    LifeEventType,
    RiskProfile,
    TaxRegime,
)

# couple
from models.couple import (
    CoupleOptimisation,
    CoupleProfile,
)

# fire
from models.fire import (
    FIREPlan,
    SIPGoal,
    YearlyProjection,
)

# health
from models.health import (
    DimensionScore,
    MoneyHealthResult,
)

# life_event
from models.life_event import (
    LifeEventAllocation,
    LifeEventInput,
    LifeEventResult,
)

# mf_xray
from models.mf_xray import (
    MFHolding,
    MFXRayResult,
    OverlapPair,
)

# tax
from models.tax import (
    TaxRegimeComparison,
)

# user
from models.user import (
    AssetAllocation,
    DebtItem,
    Goal,
    InsuranceCoverage,
    TaxDeductions,
    UserProfile,
)

__all__ = [
    # common
    "AgentAdvice", "EmploymentType", "GoalType", "LifeEventType", "RiskProfile", "TaxRegime",

    # user
    "AssetAllocation", "DebtItem", "Goal", "InsuranceCoverage", "TaxDeductions", "UserProfile",

    # fire
    "FIREPlan", "SIPGoal", "YearlyProjection",

    # health
    "DimensionScore", "MoneyHealthResult",

    # tax
    "TaxRegimeComparison",

    # life_event
    "LifeEventAllocation", "LifeEventInput", "LifeEventResult",

    # couple
    "CoupleOptimisation", "CoupleProfile",

    # mf_xray
    "MFHolding", "MFXRayResult", "OverlapPair",

    # chat
    "ChatMessage", "ChatRequest", "ChatResponse",

    # auth
    "EmailVerificationConfirm", "EmailVerificationRequest", "PasswordResetConfirm",
    "PasswordResetRequest", "RefreshTokenRequest", "TokenResponse",
    "UserCreate", "UserLogin", "UserResponse",

    # api_responses
    "CoupleResponse", "ErrorResponse", "FeatureRequest", "FIREPlanResponse",
    "HealthScoreResponse", "LifeEventResponse", "MFXRayResponse", "PortfolioResponse",
    "ScenarioSummary", "SessionCreateResponse", "TaxWizardResponse",
]
