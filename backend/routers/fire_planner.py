"""
routers/fire_planner.py
POST /api/fire-planner — FIRE Path Planner feature.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from agents.mentor_agent import generate_fire_advice
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import append_log, create_session, update_session_state
from finance.fire import build_fire_plan
from models import ErrorResponse, FIREPlanResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["fire-planner"])


@router.post(
    "/fire-planner",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def fire_planner(raw_data: dict) -> FIREPlanResponse:
    session_id = await create_session("fire_planner")
    decision_log: list[dict] = []

    try:
        profile, notes = await run_intake_agent(raw_data)
        decision_log.append(
            await append_log(
                session_id,
                "IntakeAgent",
                "Profile validated",
                {"raw_keys": list(raw_data.keys())},
                {"notes": notes},
            )
        )

        result = build_fire_plan(profile)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "FIRE plan calculated",
                {"age": profile.age, "retirement_age": profile.retirement_age},
                {
                    "corpus_required": result.fi_corpus_required,
                    "on_track": result.on_track,
                },
            )
        )

        advice = await generate_fire_advice(profile, result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "FIRE advice generated",
                {"corpus_gap": result.corpus_gap},
                {"actions": advice.key_actions[:2]},
            )
        )

        ref_numbers = {
            "corpus_required": result.fi_corpus_required,
            "required_sip": result.required_monthly_sip,
            "projected_fi_age": result.projected_fi_age,
        }
        advice, issues = await run_guardrail(advice, ref_numbers)
        decision_log.append(
            await append_log(
                session_id,
                "GuardrailAgent",
                "Compliance check",
                {},
                {"status": "MODIFIED" if issues else "PASS"},
            )
        )

        await update_session_state(
            session_id,
            "fire",
            {
                "fi_corpus_required": result.fi_corpus_required,
                "required_monthly_sip": result.required_monthly_sip,
                "projected_fi_age": result.projected_fi_age,
                "years_to_fi": result.years_to_fi,
                "on_track": result.on_track,
                "current_age": profile.age,
                "retirement_age": profile.retirement_age,
            },
        )

        return FIREPlanResponse(
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
        logger.exception("Unexpected error in fire_planner")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
