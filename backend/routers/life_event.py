"""
routers/life_event.py
POST /api/life-event — Life Event Financial Advisor.

Takes profile + event fields — does not use FeatureRequest.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from agents.life_event_agent import generate_life_event_advice
from core.dependencies import get_current_user
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import User, append_log, create_session, save_scenario, update_session_state
from finance.life_event import analyse_life_event
from models.api_responses import ErrorResponse, LifeEventResponse
from models.common import LifeEventType
from models.life_event import LifeEventInput

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["life-event"])


@router.post(
    "/life-event",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def life_event(
    raw_data: dict,
    current_user: User = Depends(get_current_user),
) -> LifeEventResponse:
    session_id = await create_session(current_user.id, "life_event")
    decision_log: list[dict] = []

    try:
        # Step 1: Intake — profile keys only
        profile_data = {
            k: v
            for k, v in raw_data.items()
            if k not in ("event_type", "event_amount", "event_details")
        }
        profile, notes = await run_intake_agent(profile_data)
        decision_log.append(
            await append_log(
                session_id,
                "IntakeAgent",
                "Profile validated",
                {"raw_keys": list(raw_data.keys())},
                {"notes": notes},
            )
        )

        # Step 2: Finance Engine
        event_input = LifeEventInput(
            profile=profile,
            event_type=LifeEventType(raw_data.get("event_type", "bonus")),
            event_amount=float(raw_data.get("event_amount", 0.0)),
            event_details=raw_data.get("event_details", {}),
        )
        result = analyse_life_event(event_input)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "Life event analysed",
                {"event_type": event_input.event_type.value, "amount": event_input.event_amount},
                {"allocations": len(result.allocations), "tax_impact": result.tax_impact},
            )
        )

        # Step 3: LLM Advice
        advice = await generate_life_event_advice(profile, result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "Life event advice generated",
                {"event": result.event_type.value},
                {"actions_count": len(advice.key_actions)},
            )
        )

        # Step 4: Guardrail
        ref_numbers = {"event_amount": result.event_amount, "tax_impact": result.tax_impact}
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

        life_event_summary = {
            "event_type": result.event_type.value,
            "event_amount": result.event_amount,
            "tax_impact": result.tax_impact,
            "allocations": [
                {"category": a.category, "amount": a.amount} for a in result.allocations
            ],
        }

        await update_session_state(
            session_id, current_user.id, "life_event", life_event_summary
        )

        if raw_data.get("use_profile"):
            from db.session_store import update_portfolio_result
            await update_portfolio_result(current_user.id, "life_event", life_event_summary)
            await save_scenario(
                user_id=current_user.id,
                feature="life_event",
                input_data={k: v for k, v in raw_data.items()
                            if k not in ("save_scenario", "scenario_name", "use_profile")},
                result_data=life_event_summary,
                name="Portfolio Run",
                session_type="portfolio",
            )
        elif raw_data.get("save_scenario"):
            await save_scenario(
                user_id=current_user.id,
                feature="life_event",
                input_data={k: v for k, v in raw_data.items()
                            if k not in ("save_scenario", "scenario_name", "use_profile")},
                result_data=life_event_summary,
                name=raw_data.get("scenario_name"),
                session_type="scenario",
            )

        return LifeEventResponse(
            session_id=session_id,
            result=result,
            advice=advice,
            decision_log=decision_log,
        )

    except ValidationError as e:
        raise HTTPException(422, detail={"error": e.message, "code": e.code})
    except MoneyMentorError as e:
        raise HTTPException(500, detail={"error": e.message, "code": e.code})
    except Exception as e:
        logger.exception("Unexpected error in life_event")
        raise HTTPException(500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
