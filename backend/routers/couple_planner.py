"""
routers/couple_planner.py
POST /api/couple-planner — Couple Joint Finance Optimiser.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from agents.couple_agent import generate_couple_advice
from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import append_log, create_session, update_session_state
from finance.couple import optimise_couple_finances
from models import CoupleProfile, CoupleResponse, ErrorResponse, Goal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["couple-planner"])


@router.post(
    "/couple-planner",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def couple_planner(raw_data: dict) -> CoupleResponse:
    session_id = await create_session("couple_planner")
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

        await update_session_state(
            session_id,
            "couple",
            {
                "combined_net_worth": result.combined_net_worth,
                "combined_monthly_surplus": result.combined_monthly_surplus,
                "better_hra_claimant": result.better_hra_claimant,
                "hra_savings": result.hra_savings,
                "joint_tax_saving": result.joint_tax_saving,
                "partner_a_sip": result.partner_a_sip,
                "partner_b_sip": result.partner_b_sip,
            },
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
