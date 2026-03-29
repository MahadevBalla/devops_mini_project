"""
routers/tax_wizard.py
POST /api/tax-wizard — Tax Wizard feature.

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
from agents.mentor_agent import generate_tax_advice
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
from finance.tax import compare_tax_regimes
from models.api_responses import ErrorResponse, FeatureRequest, TaxWizardResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["tax-wizard"])


def _tax_summary(result) -> dict:
    return {
        "gross_income": result.gross_income,
        "old_regime_tax": result.old_regime_tax,
        "new_regime_tax": result.new_regime_tax,
        "recommended_regime": result.recommended_regime.value,
        "savings_by_switching": result.savings_by_switching,
        "effective_rate_old": result.effective_rate_old,
        "effective_rate_new": result.effective_rate_new,
    }


@router.post(
    "/tax-wizard",
    responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def tax_wizard(
    req: FeatureRequest,
    current_user: User = Depends(get_current_user),
) -> TaxWizardResponse:
    session_id = await create_session(current_user.id, "tax_wizard")
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

        summary = _tax_summary(result)

        if req.use_profile:
            await update_portfolio_result(current_user.id, "tax", summary)
            await update_session_state(session_id, current_user.id, "tax", summary)
            await save_scenario(
                user_id=current_user.id,
                feature="tax",
                input_data=profile.model_dump(),
                result_data=summary,
                name="Portfolio Run",
                session_type="portfolio",
            )
        else:
            await update_session_state(session_id, current_user.id, "tax", summary)
            if req.save_scenario:
                await save_scenario(
                    user_id=current_user.id,
                    feature="tax",
                    input_data=profile.model_dump(),
                    result_data=summary,
                    name=req.scenario_name,
                    session_type="scenario",
                )

        return TaxWizardResponse(
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
        logger.exception("Unexpected error in tax_wizard")
        raise HTTPException(status_code=500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
