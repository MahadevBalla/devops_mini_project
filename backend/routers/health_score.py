"""
routers/health_score.py
POST /api/health-score  — Money Health Score feature.
Orchestration: Intake → Finance Engine → Mentor → Guardrail → Response.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from agents.mentor_agent import generate_health_advice
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import append_log, create_session, update_session_state
from finance.health import calculate_money_health_score
from models import ErrorResponse, HealthScoreResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["health-score"])


@router.post(
    "/health-score",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def health_score(raw_data: dict) -> HealthScoreResponse:
    session_id = await create_session("health_score")
    decision_log: list[dict] = []

    try:
        # Step 1: Intake
        profile, notes = await run_intake_agent(raw_data)
        decision_log.append(
            await append_log(
                session_id,
                "IntakeAgent",
                "Profile validated",
                {"raw_keys": list(raw_data.keys())},
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

        await update_session_state(session_id, "health_score", {
            "overall_score": result.overall_score,
            "grade": result.grade,
            "monthly_surplus": result.monthly_surplus,
            "total_net_worth": result.total_net_worth,
            "monthly_income": profile.monthly_gross_income,
        })

        return HealthScoreResponse(
            session_id=session_id,
            profile=profile,
            result=result,
            advice=advice,
            decision_log=decision_log,
        )

    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"error": e.message, "code": e.code})
    except MoneyMentorError as e:
        raise HTTPException(status_code=500, detail={"error": e.message, "code": e.code})
    except Exception as e:
        logger.exception("Unexpected error in health_score")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
