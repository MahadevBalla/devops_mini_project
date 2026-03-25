"""
agents/mf_xray_agent.py
LLM narrative layer for MF portfolio X-Ray.
Rebalancing logic from finance/mf_xray.py — LLM explains the 'why'.
"""
from __future__ import annotations

import logging

from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models.schemas import AgentAdvice, MFXRayResult

logger = logging.getLogger(__name__)

_DISCLAIMER = "Educational guidance only — not SEBI-registered advice. Past returns do not guarantee future performance. Consult a SEBI-registered advisor before making changes."


async def generate_mf_xray_advice(result: MFXRayResult) -> AgentAdvice:
    xirr_text = f"{result.overall_xirr:.1f}%" if result.overall_xirr is not None else "N/A"
    categories = (
        ", ".join(f"{k}: {v / result.total_current_value * 100:.0f}%" for k, v in result.category_breakdown.items())
        if result.total_current_value > 0 else "No holdings"
    )

    prompt = f"""You are an AI Money Mentor reviewing an Indian investor's mutual fund portfolio.

PORTFOLIO:
  Invested: ₹{result.total_invested:,.0f} | Current: ₹{result.total_current_value:,.0f}
  Absolute return: {result.absolute_return_pct:.1f}% | XIRR: {xirr_text} (benchmark: ~12% equity)
  Funds: {len(result.holdings)} | Categories: {categories}

ISSUES:
  Overlapping pairs: {len(result.overlapping_pairs)}
  High-expense funds: {result.high_expense_funds[:3] or "None"}
  Rebalancing suggestions: {result.rebalancing_suggestions}

Respond with JSON keys: summary, key_actions, risks, disclaimer
- summary: 2-3 sentences on portfolio health, compare XIRR to 12% benchmark
- key_actions: 4-5 specific improvements (consolidation, direct plans, rebalancing)
- risks: 3 portfolio-specific risks (overlap, expense drag, concentration)
- disclaimer: "{_DISCLAIMER}"
"""

    messages = [
        {"role": "system", "content": "You are an AI Money Mentor specialising in Indian mutual funds. Reply only with valid JSON."},
        {"role": "user", "content": prompt},
    ]

    try:
        data = await structured_chat(messages)
        return AgentAdvice(
            summary=data.get("summary", ""),
            key_actions=data.get("key_actions", result.rebalancing_suggestions),
            risks=data.get("risks", []),
            disclaimer=data.get("disclaimer", _DISCLAIMER),
        )
    except LLMUnavailableError:
        logger.warning("LLM unavailable — fallback MF X-Ray advice")
        return AgentAdvice(
            summary=f"Portfolio of ₹{result.total_current_value:,.0f} across {len(result.holdings)} funds with {result.absolute_return_pct:.1f}% absolute return.",
            key_actions=result.rebalancing_suggestions or ["Review fund overlap and consider consolidation"],
            risks=[
                "Fund overlap reduces true diversification benefit",
                "High expense ratios compound into significant drag over time",
                "Review and rebalance portfolio at least annually",
            ],
            disclaimer=_DISCLAIMER,
        )
