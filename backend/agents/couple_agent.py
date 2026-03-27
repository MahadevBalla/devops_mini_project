"""
agents/couple_agent.py
LLM narrative layer for couple joint finance optimisation.
Numbers from finance/couple.py — LLM adds the 'why' and prioritisation.
"""

from __future__ import annotations

import logging

from agents.knowledge import INDIA_FINANCE_FACTS
from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models import AgentAdvice, CoupleOptimisation, CoupleProfile

logger = logging.getLogger(__name__)

_DISCLAIMER = "Educational guidance only — not SEBI-registered advice. Consult a SEBI-registered financial advisor before acting."

_SYSTEM_PROMPT = f"""You are an AI Money Mentor specialising in Indian dual-income household finances.

{INDIA_FINANCE_FACTS}

Return ONLY valid JSON with exactly these four keys:
{{
  "summary": "string — 2-3 sentences on combined financial strength and top opportunity",
  "key_actions": [
    "Plain string combining action + rupee amount in one sentence",
    ...
  ],
  "risks": [
    "Plain string...",
    ...
  ],
  "disclaimer": "string"
}}

STRICT RULES — violation causes a 500 error:
- key_actions MUST be a flat array of plain strings — never objects, never {{"action":..., "amount":...}}
- risks MUST be a flat array of plain strings
- Embed the rupee amount directly in the sentence: "Partner A should claim HRA — saves ₹3,60,000/yr"
- 4-6 key_actions, 3 risks, no extra keys
- Use exact ₹ figures from the data provided
"""


def _flatten(items: list) -> list[str]:
    """Coerce any LLM-returned dicts to strings — defensive fallback."""
    flat = []
    for item in items:
        if isinstance(item, str):
            flat.append(item)
        elif isinstance(item, dict):
            parts = [str(v) for v in item.values() if v]
            flat.append(" — ".join(parts))
        else:
            flat.append(str(item))
    return flat


async def generate_couple_advice(couple: CoupleProfile, result: CoupleOptimisation) -> AgentAdvice:
    a, b = couple.partner_a, couple.partner_b

    user_prompt = f"""COUPLE PROFILE:
Partner A: age {a.age}, {a.city}, ₹{a.monthly_gross_income:,.0f}/mo gross
Partner B: age {b.age}, {b.city}, ₹{b.monthly_gross_income:,.0f}/mo gross
Married: {couple.is_married}

COMPUTED RESULTS (use these exact numbers in key_actions):
- Combined net worth:      ₹{result.combined_net_worth:,.0f}
- Combined monthly surplus: ₹{result.combined_monthly_surplus:,.0f}/mo
- Better HRA claimant:     {result.better_hra_claimant.replace("_", " ").title()} → ₹{result.hra_savings:,.0f}/yr saved
- NPS benefit (both max):  ₹{result.nps_matching_benefit:,.0f}/yr
- Recommended SIPs:        Partner A ₹{result.partner_a_sip:,.0f}/mo | Partner B ₹{result.partner_b_sip:,.0f}/mo
- Joint tax saving:        ₹{result.joint_tax_saving:,.0f}/yr
- Insurance note:          {result.joint_insurance_recommendation}

Generate the JSON now. key_actions must be flat strings, not objects."""

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    try:
        data = await structured_chat(messages)

        # Defensive coerce — handles malformed LLM output
        key_actions = _flatten(data.get("key_actions", []))
        risks = _flatten(data.get("risks", []))

        # Final fallback if LLM returned empty lists
        if not key_actions:
            key_actions = result.recommendations[:5]
        if not risks:
            risks = [
                "Single-income risk — ensure both partners can sustain independently if needed",
                "Lifestyle inflation with dual income erodes savings rate over time",
                "Review joint insurance coverage annually as income and liabilities grow",
            ]

        return AgentAdvice(
            summary=data.get(
                "summary",
                f"Combined surplus ₹{result.combined_monthly_surplus:,.0f}/mo with ₹{result.joint_tax_saving:,.0f}/yr in available tax savings.",
            ),
            key_actions=key_actions,
            risks=risks,
            disclaimer=data.get("disclaimer", _DISCLAIMER),
        )

    except LLMUnavailableError:
        logger.warning("LLM unavailable — fallback couple advice")
        return AgentAdvice(
            summary=f"Combined surplus ₹{result.combined_monthly_surplus:,.0f}/mo. Joint tax saving potential: ₹{result.joint_tax_saving:,.0f}/yr.",
            key_actions=result.recommendations[:5],
            risks=[
                "Single-income risk — ensure both partners can sustain independently if needed",
                "Lifestyle inflation with dual income erodes savings rate over time",
                "Review joint insurance coverage annually as income and liabilities grow",
            ],
            disclaimer=_DISCLAIMER,
        )
