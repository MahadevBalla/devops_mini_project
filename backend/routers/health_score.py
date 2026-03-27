"""
routers/health_score.py
POST /api/health-score — Money Health Score feature.

Modes:
  use_profile=True  → load portfolio.profile, compute, save result to portfolio
  use_profile=False → use request.profile only, portfolio untouched,
                      optionally save as Scenario if save_scenario=True
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from agents.mentor_agent import generate_health_advice
from core.dependencies import get_current_user
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import (
    User,
    append_log,
    create_session,
    load_portfolio,
    save_scenario,
    update_portfolio_result,
    update_session_state,
)
from finance.health import calculate_money_health_score
from models.api_responses import ErrorResponse, FeatureRequest, HealthScoreResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health-score"])


def _health_summary(profile, result) -> dict:
    return {
        "overall_score": result.overall_score,
        "grade": result.grade,
        "monthly_surplus": result.monthly_surplus,
        "total_net_worth": result.total_net_worth,
        "monthly_income": profile.monthly_gross_income,
        "dimensions": [
            {"name": d.name, "score": d.score, "label": d.label, "insight": d.insight}
            for d in result.dimensions
        ],
    }


@router.post(
    "/health-score",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def health_score(
    req: FeatureRequest,
    current_user: User = Depends(get_current_user),
) -> HealthScoreResponse:
    session_id = await create_session(current_user.id, "health_score")
    decision_log: list[dict] = []

    try:
        if req.use_profile:
            portfolio = await load_portfolio(current_user.id)
            raw_input = portfolio.get("profile", {})
            if not raw_input:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "Your profile is empty. Complete it via PATCH /api/portfolio/profile first.",
                        "code": "PROFILE_NOT_SET",
                    },
                )
        else:
            raw_input = req.profile

        profile, notes = await run_intake_agent(raw_input)
        decision_log.append(
            await append_log(
                session_id,
                "IntakeAgent",
                "Profile validated",
                {
                    "mode": "portfolio" if req.use_profile else "what-if",
                    "raw_keys": list(raw_input.keys()),
                },
                {"notes": notes, "profile_age": profile.age},
            )
        )

        # Step 2: Finance Engine
        result = calculate_money_health_score(profile)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "Health score calculated",
                {"profile_income": profile.monthly_gross_income},
                {"overall_score": result.overall_score, "grade": result.grade},
            )
        )

        # Step 3: Money Mentor
        advice = await generate_health_advice(profile, result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "Advice generated",
                {"score": result.overall_score},
                {"actions_count": len(advice.key_actions)},
            )
        )

        # Step 4: Guardrail
        ref_numbers = {"overall_score": result.overall_score, "grade": result.grade}
        advice, issues = await run_guardrail(advice, ref_numbers)
        decision_log.append(
            await append_log(
                session_id,
                "GuardrailAgent",
                "Compliance check",
                {"advice_summary": advice.summary[:100]},
                {"status": "MODIFIED" if issues else "PASS", "issues": issues},
            )
        )

        summary = _health_summary(profile, result)

        if req.use_profile:
            await update_portfolio_result(current_user.id, "health", summary)
            await update_session_state(session_id, current_user.id, "health", summary)
        else:
            await update_session_state(session_id, current_user.id, "health", summary)
            if req.save_scenario:
                await save_scenario(
                    user_id=current_user.id,
                    feature="health",
                    input_data=profile.model_dump(),
                    result_data=summary,
                    name=req.scenario_name,
                )

        return HealthScoreResponse(
            session_id=session_id,
            profile=profile,
            result=result,
            advice=advice,
            decision_log=decision_log,
        )

    except HTTPException:
        raise
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"error": e.message, "code": e.code})
    except MoneyMentorError as e:
        raise HTTPException(status_code=500, detail={"error": e.message, "code": e.code})
    except Exception as e:
        logger.exception("Unexpected error in health_score")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
