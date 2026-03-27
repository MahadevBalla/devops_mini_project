"""
routers/fire_planner.py
POST /api/fire-planner — FIRE Path Planner feature.

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
from agents.mentor_agent import generate_fire_advice
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
from finance.fire import build_fire_plan
from models.api_responses import ErrorResponse, FeatureRequest, FIREPlanResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["fire-planner"])


# Reusable fire result summary builder — keeps both paths DRY
def _fire_summary(result) -> dict:
    return {
        "fi_corpus_required": result.fi_corpus_required,
        "current_corpus": result.current_corpus,
        "corpus_gap": result.corpus_gap,
        "required_monthly_sip": result.required_monthly_sip,
        "required_stepup_sip": result.required_stepup_sip,
        "projected_fi_age": result.projected_fi_age,
        "years_to_fi": result.years_to_fi,
        "on_track": result.on_track,
    }


@router.post(
    "/fire-planner",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def fire_planner(
    req: FeatureRequest,
    current_user: User = Depends(get_current_user),
) -> FIREPlanResponse:
    session_id = await create_session(current_user.id, "fire_planner")
    decision_log: list[dict] = []

    try:
        # Resolve input — strictly one source, never merged
        if req.use_profile:
            portfolio = await load_portfolio(current_user.id)
            raw_input = portfolio.get("profile", {})
            if not raw_input:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": "Your profile is empty. Complete it via PATCH /api/portfolio/profile before running FIRE planner.",
                        "code": "PROFILE_NOT_SET",
                    },
                )
        else:
            # req.profile is guaranteed non-empty by FeatureRequest validator
            raw_input = req.profile

        # Intake → validate and produce UserProfile
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
                {"notes": notes},
            )
        )

        # Compute
        result = build_fire_plan(profile)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "FIRE plan calculated",
                {"age": profile.age, "retirement_age": profile.retirement_age},
                {"corpus_required": result.fi_corpus_required, "on_track": result.on_track},
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

        # Persist — strictly separated by mode
        summary = _fire_summary(result)

        if req.use_profile:
            # Portfolio run — update portfolio and session state with results
            await update_portfolio_result(current_user.id, "fire", summary)
            await update_session_state(session_id, current_user.id, "fire", summary)

        else:
            # What-if run — only update session state, optionally save scenario, portfolio untouched
            await update_session_state(session_id, current_user.id, "fire", summary)

            if req.save_scenario:
                await save_scenario(
                    user_id=current_user.id,
                    feature="fire",
                    input_data=profile.model_dump(),
                    result_data=summary,
                    name=req.scenario_name,
                )

        return FIREPlanResponse(
            session_id=session_id,
            profile=profile,
            result=result,
            advice=advice,
            decision_log=decision_log,
        )

    except HTTPException:
        raise  # pass through 422 PROFILE_NOT_SET as-is
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"error": e.message, "code": e.code})
    except MoneyMentorError as e:
        raise HTTPException(status_code=500, detail={"error": e.message, "code": e.code})
    except Exception as e:
        logger.exception("Unexpected error in fire_planner")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
