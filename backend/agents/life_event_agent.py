"""
agents/life_event_agent.py
LLM narrative layer for life event planning.
Numbers come from finance/life_event.py — LLM only adds context and empathy.
"""
from __future__ import annotations

import logging

from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models.schemas import AgentAdvice, LifeEventResult, UserProfile

logger = logging.getLogger(__name__)

_DISCLAIMER = "Educational guidance only — not SEBI-registered advice. Consult a SEBI-registered financial advisor before acting."


async def generate_life_event_advice(profile: UserProfile, result: LifeEventResult) -> AgentAdvice:
    event_name = result.event_type.value.replace("_", " ").title()
    allocations_text = "\n".join(
        f"  - {a.category}: ₹{a.amount:,.0f} — {a.rationale}"
        for a in result.allocations
    ) or "  - See priority actions below"

    prompt = f"""You are an AI Money Mentor for India. Provide warm, actionable advice for a life event.

USER: Age {profile.age}, {profile.city}, Monthly income ₹{profile.monthly_gross_income:,.0f}
LIFE EVENT: {event_name} | Amount: ₹{result.event_amount:,.0f} | Tax impact: ₹{result.tax_impact:,.0f}

ALLOCATION PLAN (use these exact ₹ numbers — do not change):
{allocations_text}

Insurance gaps: {result.insurance_gaps or "None"}
Priority actions: {result.priority_actions or []}

Respond with JSON keys: summary, key_actions, risks, disclaimer
- summary: 2-3 warm sentences referencing the ₹ amount and event
- key_actions: 4-5 steps with exact ₹ amounts from the plan above
- risks: 2-3 India-specific risks for this life event
- disclaimer: "{_DISCLAIMER}"
"""

    messages = [
        {"role": "system", "content": "You are an AI Money Mentor for Indian personal finance. Reply only with valid JSON."},
        {"role": "user", "content": prompt},
    ]

    try:
        data = await structured_chat(messages)
        return AgentAdvice(
            summary=data.get("summary", f"Your {event_name} financial plan is ready."),
            key_actions=data.get("key_actions", result.priority_actions or []),
            risks=data.get("risks", result.insurance_gaps or []),
            disclaimer=data.get("disclaimer", _DISCLAIMER),
        )
    except LLMUnavailableError:
        logger.warning("LLM unavailable — deterministic fallback for life event")
        return AgentAdvice(
            summary=f"Your {event_name} plan allocates ₹{result.event_amount:,.0f} across {len(result.allocations)} priorities.",
            key_actions=result.priority_actions or ["Review allocations and act within 30 days"],
            risks=result.insurance_gaps or ["Ensure adequate insurance for this life stage"],
            disclaimer=_DISCLAIMER,
        )
