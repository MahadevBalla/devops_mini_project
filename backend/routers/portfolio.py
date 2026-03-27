"""
routers/portfolio.py
Portfolio and Scenario endpoints for the logged-in user.

Rules enforced here:
- PATCH /api/portfolio/profile is the ONLY place in the codebase that writes portfolio.profile
- Feature endpoints are compute-only — they never touch profile
- Scenario deletes verify ownership before acting
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from core.dependencies import get_current_user
from db.session_store import (
    User,
    delete_scenario,
    get_scenario_by_id,
    list_scenarios,
    load_portfolio,
    update_portfolio_profile,
)
from models.api_responses import (
    ErrorResponse,
    PortfolioResponse,
    ScenarioDetailResponse,
    ScenarioSummary,
)
from models.user import UserProfile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get(
    "",
    response_model=PortfolioResponse,
    summary="Get logged-in user's full portfolio",
)
async def get_portfolio(
    current_user: User = Depends(get_current_user),
) -> PortfolioResponse:
    """
    Returns the user's current portfolio — their real profile inputs plus the
    latest computed outputs for every feature (fire, health, tax, mf, couple, life_event).
    Empty dicts are returned for features that have not been run yet.
    """
    data = await load_portfolio(current_user.id)
    return PortfolioResponse(user_id=current_user.id, **data)


@router.patch(
    "/profile",
    response_model=PortfolioResponse,
    responses={422: {"model": ErrorResponse}},
    summary="Update user's financial profile",
)
async def update_profile(
    payload: UserProfile,
    current_user: User = Depends(get_current_user),
) -> PortfolioResponse:
    """
    THE ONLY endpoint that writes to portfolio.profile.
    Accepts a full UserProfile — validated by Pydantic before any DB write.
    Returns the updated portfolio after saving.
    """
    await update_portfolio_profile(current_user.id, payload.model_dump())
    data = await load_portfolio(current_user.id)
    return PortfolioResponse(user_id=current_user.id, **data)


@router.get(
    "/scenarios",
    response_model=list[ScenarioSummary],
    summary="List saved what-if scenarios",
)
async def get_scenarios(
    feature: str | None = None,
    current_user: User = Depends(get_current_user),
) -> list[ScenarioSummary]:
    """
    List all saved what-if scenarios for the logged-in user.
    Optionally filter by feature: fire | health | tax | mf | couple | life_event
    Returns summary view only (no input_data).
    """
    scenarios = await list_scenarios(current_user.id, feature)
    return [ScenarioSummary(**s) for s in scenarios]


@router.get(
    "/scenarios/{scenario_id}",
    response_model=ScenarioDetailResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get full scenario detail including inputs",
)
async def get_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
) -> ScenarioDetailResponse:
    """
    Fetch a single scenario with full input_data and result.
    Used by chat to switch context from portfolio → specific scenario.
    Returns 404 if not found or not owned by current user.
    """
    scenario = await get_scenario_by_id(scenario_id, current_user.id)
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"},
        )
    return ScenarioDetailResponse(**scenario)


@router.delete(
    "/scenarios/{scenario_id}",
    status_code=204,
    responses={404: {"model": ErrorResponse}},
    summary="Delete a saved scenario",
)
async def remove_scenario(
    scenario_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Hard delete a scenario. Ownership verified — users can only delete their own.
    Returns 204 No Content on success, 404 if not found or not owned.
    """
    deleted = await delete_scenario(scenario_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": "Scenario not found", "code": "SCENARIO_NOT_FOUND"},
        )
