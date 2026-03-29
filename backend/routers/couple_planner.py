"""
routers/couple_planner.py
POST /api/couple-planner — Couple Joint Finance Optimiser.

Takes two independent partner profiles — does not use FeatureRequest.
Portfolio write not supported for couple (no single-user portfolio mapping).
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException

from agents.couple_agent import generate_couple_advice
from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from core.dependencies import get_current_user
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import User, append_log, create_session, save_scenario, update_session_state
from finance.couple import optimise_couple_finances
from models.api_responses import CoupleResponse, ErrorResponse
from models.user import Goal
from models.couple import CoupleProfile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["couple-planner"])


@router.post(
    "/couple-planner",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def couple_planner(
    raw_data: dict,
    current_user: User = Depends(get_current_user),
) -> CoupleResponse:
    session_id = await create_session(current_user.id, "couple_planner")
    decision_log: list[dict] = []

    try:
        # Step 1: Intake — validate both partner profiles independently
        (profile_a, notes_a), (profile_b, notes_b) = await asyncio.gather(
            run_intake_agent(raw_data.get("partner_a", {})),
            run_intake_agent(raw_data.get("partner_b", {})),
        )
        decision_log.append(
            await append_log(
                session_id,
                "IntakeAgent",
                "Both profiles validated",
                {"keys": list(raw_data.keys())},
                {"notes_a": notes_a, "notes_b": notes_b},
            )
        )

        # Step 2: Finance Engine
        joint_goals = [Goal(**g) for g in raw_data.get("joint_goals", [])]
        couple = CoupleProfile(
            partner_a=profile_a,
            partner_b=profile_b,
            is_married=raw_data.get("is_married", True),
            joint_goals=joint_goals,
        )
        result = optimise_couple_finances(couple)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "Couple optimisation computed",
                {
                    "combined_income": profile_a.monthly_gross_income
                    + profile_b.monthly_gross_income
                },
                {
                    "combined_net_worth": result.combined_net_worth,
                    "joint_tax_saving": result.joint_tax_saving,
                },
            )
        )

        # Step 3: LLM Advice
        advice = await generate_couple_advice(couple, result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "Couple advice generated",
                {"net_worth": result.combined_net_worth},
                {"actions_count": len(advice.key_actions)},
            )
        )

        # Step 4: Guardrail
        ref_numbers = {
            "combined_net_worth": result.combined_net_worth,
            "joint_tax_saving": result.joint_tax_saving,
            "hra_savings": result.hra_savings,
        }
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

        couple_summary = {
            "combined_net_worth": result.combined_net_worth,
            "combined_monthly_surplus": result.combined_monthly_surplus,
            "better_hra_claimant": result.better_hra_claimant,
            "hra_savings": result.hra_savings,
            "joint_tax_saving": result.joint_tax_saving,
            "partner_a_sip": result.partner_a_sip,
            "partner_b_sip": result.partner_b_sip,
        }

        await update_session_state(
            session_id, current_user.id, "couple", couple_summary
        )

        if raw_data.get("use_profile"):
            from db.session_store import update_portfolio_result
            await update_portfolio_result(current_user.id, "couple", couple_summary)
            await save_scenario(
                user_id=current_user.id,
                feature="couple",
                input_data={k: v for k, v in raw_data.items()
                            if k not in ("save_scenario", "scenario_name", "use_profile")},
                result_data=couple_summary,
                name="Portfolio Run",
                session_type="portfolio",
            )
        elif raw_data.get("save_scenario"):
            await save_scenario(
                user_id=current_user.id,
                feature="couple",
                input_data={k: v for k, v in raw_data.items()
                            if k not in ("save_scenario", "scenario_name", "use_profile")},
                result_data=couple_summary,
                name=raw_data.get("scenario_name"),
                session_type="scenario",
            )

        return CoupleResponse(
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
        logger.exception("Unexpected error in couple_planner")
        raise HTTPException(500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
