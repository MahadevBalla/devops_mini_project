"""
agents/mentor_agent.py
Money Mentor Agent — turns engine numbers into human-readable, India-specific advice.
LLM is ONLY for narrative; all numbers come from the Finance Engine.
"""

from __future__ import annotations

import json
import logging

from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models.schemas import (
    AgentAdvice,
    FIREPlan,
    MoneyHealthResult,
    TaxRegimeComparison,
    UserProfile,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are an India-specific financial education mentor integrated into the Economic Times platform.

Your persona:
- Knowledgeable, warm, and direct — like a trusted CA friend.
- India-centric: reference Indian instruments (PPF, ELSS, NPS, EPF, FD, MF SIPs).
- SEBI-compliant: educational only, NO specific stock/fund recommendations.
- Never invent numbers — only use what is in the provided JSON context.

Output format (strict JSON):
{
  "summary": "2–3 sentence overview",
  "key_actions": ["Action 1 in plain Hindi-English (Hinglish optional)", ...],  // 3–5 items
  "risks": ["Risk 1", ...],  // 2–3 items
  "disclaimer": "Standard SEBI-style disclaimer",
  "regime_suggestion": null or "Switch to OLD/NEW regime because..."
}
"""


def _build_health_context(profile: UserProfile, result: MoneyHealthResult) -> str:
    return json.dumps(
        {
            "age": profile.age,
            "monthly_income": profile.monthly_gross_income,
            "monthly_surplus": result.monthly_surplus,
            "overall_score": result.overall_score,
            "grade": result.grade,
            "dimensions": [
                {"name": d.name, "score": d.score, "insight": d.insight} for d in result.dimensions
            ],
            "net_worth": result.total_net_worth,
        },
        indent=2,
    )


def _build_fire_context(profile: UserProfile, result: FIREPlan) -> str:
    return json.dumps(
        {
            "age": profile.age,
            "retirement_age": profile.retirement_age,
            "monthly_income": profile.monthly_gross_income,
            "corpus_required": result.fi_corpus_required,
            "current_corpus": result.current_corpus,
            "corpus_gap": result.corpus_gap,
            "required_monthly_sip": result.required_monthly_sip,
            "projected_fi_age": result.projected_fi_age,
            "on_track": result.on_track,
            "goals": [
                {
                    "label": g.goal_label,
                    "target": g.target_amount,
                    "year": g.target_year,
                    "sip": g.required_monthly_sip,
                }
                for g in result.sip_goals
            ],
        },
        indent=2,
    )


def _build_tax_context(profile: UserProfile, result: TaxRegimeComparison) -> str:
    return json.dumps(
        {
            "annual_income": result.gross_income,
            "old_regime_tax": result.old_regime_tax,
            "new_regime_tax": result.new_regime_tax,
            "recommended_regime": result.recommended_regime.value,
            "savings_by_switching": result.savings_by_switching,
            "effective_rate_old": result.effective_rate_old,
            "effective_rate_new": result.effective_rate_new,
            "missing_deductions": result.missing_deductions,
            "deduction_potential": result.deduction_potential,
        },
        indent=2,
    )


def _fallback_advice(feature: str, result) -> AgentAdvice:
    """Deterministic fallback when LLM is unavailable."""
    if feature == "health":
        return AgentAdvice(
            summary=f"Your Money Health Score is {result.overall_score:.0f}/100 (Grade {result.grade}). "
            "Review each dimension for targeted improvements.",
            key_actions=[d.insight for d in result.dimensions if d.score < 70][:5]
            or ["Maintain your financial discipline — you're doing well!"],
            risks=[
                "Market volatility can impact equity allocation.",
                "Emergency fund should be in liquid instruments.",
            ],
            disclaimer="This analysis is for educational purposes only and does not constitute financial advice. "
            "Please consult a SEBI-registered financial advisor for personalised recommendations.",
        )
    if feature == "fire":
        return AgentAdvice(
            summary=f"You need ₹{result.fi_corpus_required:,.0f} for retirement. "
            f"Required monthly SIP: ₹{result.required_monthly_sip:,.0f}. "
            f"{'You are on track!' if result.on_track else 'Increase savings to meet your goal.'}",
            key_actions=[
                f"Start a SIP of ₹{result.required_monthly_sip:,.0f}/month in equity mutual funds.",
                "Increase SIP by 10% each year as income grows (step-up SIP).",
                "Build emergency fund of 6 months first before increasing equity exposure.",
            ],
            risks=[
                "Inflation may erode purchasing power.",
                "Market downturns near retirement age.",
            ],
            disclaimer="This is an illustrative projection. Actual returns may vary. "
            "Consult a SEBI-registered advisor for a personalised plan.",
        )
    # tax fallback
    return AgentAdvice(
        summary=f"Under the {result.recommended_regime.value} tax regime, you save ₹{result.savings_by_switching:,.0f} more. "
        f"Effective tax rate: {result.effective_rate_new:.1f}% (new) vs {result.effective_rate_old:.1f}% (old).",
        key_actions=[f"Claim: {d}" for d in result.missing_deductions[:4]]
        or ["All major deductions are claimed."],
        risks=[
            "Tax laws may change each Budget.",
            "Always verify with a CA before filing.",
        ],
        disclaimer="Tax calculations are based on FY 2025-26 slabs. Consult a CA for filing. "
        "This is not professional tax advice.",
        regime_suggestion=f"Switch to {result.recommended_regime.value} regime to save ₹{result.savings_by_switching:,.0f}.",
    )


async def generate_health_advice(profile: UserProfile, result: MoneyHealthResult) -> AgentAdvice:
    try:
        context = _build_health_context(profile, result)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Generate Money Health Score advice for:\n{context}",
            },
        ]
        data = await structured_chat(messages)
        return AgentAdvice(**data)
    except (LLMUnavailableError, Exception) as e:
        logger.warning("Mentor agent health fallback: %s", e)
        return _fallback_advice("health", result)


async def generate_fire_advice(profile: UserProfile, result: FIREPlan) -> AgentAdvice:
    try:
        context = _build_fire_context(profile, result)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Generate FIRE planning advice for:\n{context}",
            },
        ]
        data = await structured_chat(messages)
        return AgentAdvice(**data)
    except (LLMUnavailableError, Exception) as e:
        logger.warning("Mentor agent FIRE fallback: %s", e)
        return _fallback_advice("fire", result)


async def generate_tax_advice(profile: UserProfile, result: TaxRegimeComparison) -> AgentAdvice:
    try:
        context = _build_tax_context(profile, result)
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"Generate tax wizard advice for:\n{context}"},
        ]
        data = await structured_chat(messages)
        return AgentAdvice(**data)
    except (LLMUnavailableError, Exception) as e:
        logger.warning("Mentor agent tax fallback: %s", e)
        return _fallback_advice("tax", result)
