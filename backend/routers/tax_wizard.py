"""
routers/tax_wizard.py
POST /api/tax-wizard — Tax Wizard feature.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from agents.guardrail_agent import run_guardrail
from agents.intake_agent import run_intake_agent
from agents.mentor_agent import generate_tax_advice
from core.exceptions import MoneyMentorError, ValidationError
from db.session_store import append_log, create_session, update_session_state
from finance.tax import compare_tax_regimes
from models import ErrorResponse, TaxWizardResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["tax-wizard"])


@router.post(
    "/tax-wizard",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def tax_wizard(raw_data: dict) -> TaxWizardResponse:
    session_id = await create_session("tax_wizard")
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

        result = compare_tax_regimes(profile)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "Tax comparison calculated",
                {"annual_income": result.gross_income},
                {
                    "old_tax": result.old_regime_tax,
                    "new_tax": result.new_regime_tax,
                    "recommended": result.recommended_regime.value,
                },
            )
        )

        advice = await generate_tax_advice(profile, result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "Tax advice generated",
                {"savings_possible": result.savings_by_switching},
                {"actions": advice.key_actions[:2]},
            )
        )

        ref_numbers = {
            "old_regime_tax": result.old_regime_tax,
            "new_regime_tax": result.new_regime_tax,
            "savings": result.savings_by_switching,
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
            "tax",
            {
                "gross_income": result.gross_income,
                "old_regime_tax": result.old_regime_tax,
                "new_regime_tax": result.new_regime_tax,
                "recommended_regime": result.recommended_regime.value,
                "savings_by_switching": result.savings_by_switching,
                "effective_rate_old": result.effective_rate_old,
                "effective_rate_new": result.effective_rate_new,
            },
        )

        return TaxWizardResponse(
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
        logger.exception("Unexpected error in tax_wizard")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
