"""
agents/guardrail_agent.py
Guardrail Agent — final compliance pass on mentor advice.
Checks for specific stock tips, fabricated numbers, and missing disclaimers.
Falls back to passing through with a standard disclaimer if LLM unavailable.
"""

from __future__ import annotations

import logging

from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models.schemas import AgentAdvice

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a SEBI compliance checker for an Indian fintech application.

Review the financial advice JSON and the reference numbers JSON.
Check for:
1. Any specific stock ticker or "buy X stock" recommendation — FLAG and REMOVE.
2. Any claim of guaranteed returns with exact future rupee figures — FLAG and SOFTEN.
3. Any number that contradicts the reference_numbers JSON — FLAG and CORRECT.
4. Missing or inadequate disclaimer — ADD standard disclaimer if missing.

IMPORTANT — do NOT flag these, they are generic categories not specific recommendations:
- Government/regulatory schemes by category: NPS, EPF, PPF, ELSS (as a fund type), LIC
- Standard insurance types: term insurance, health insurance, critical illness cover
- Tax sections by name: 80C, 80D, 80CCD(1B), Section 24(b)
- Generic asset classes: equity mutual funds, index funds, debt funds, SIP

Only flag a specific mutual fund scheme name (e.g. "HDFC Mid-Cap Opportunities Fund")
or a specific stock ticker (e.g. "buy RELIANCE").

Return JSON with:
{
  "status": "PASS" or "MODIFIED",
  "issues_found": ["issue 1", ...],
  "advice": { ... same structure as input advice, but corrected ... }
}
"""

_STANDARD_DISCLAIMER = (
    "This analysis is for educational purposes only and does not constitute financial advice, "
    "investment advice, or tax advice. Past performance of any instrument is not indicative of "
    "future returns. Please consult a SEBI-registered investment advisor and/or Chartered Accountant "
    "before making any financial decisions."
)


async def run_guardrail(
    advice: AgentAdvice, reference_numbers: dict
) -> tuple[AgentAdvice, list[str]]:
    """
    Returns (cleaned AgentAdvice, list_of_issues_found).
    Never raises — always returns something usable.
    """
    import json

    # Ensure disclaimer is always set
    if not advice.disclaimer:
        advice = advice.model_copy(update={"disclaimer": _STANDARD_DISCLAIMER})

    try:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Advice to check:\n"
                    + json.dumps(advice.model_dump(), indent=2)
                    + "\n\nReference numbers:\n"
                    + json.dumps(reference_numbers, indent=2)
                ),
            },
        ]
        result = await structured_chat(messages)
        issues = result.get("issues_found", [])
        cleaned_data = result.get("advice", advice.model_dump())

        # Ensure disclaimer survives guardrail
        if not cleaned_data.get("disclaimer"):
            cleaned_data["disclaimer"] = _STANDARD_DISCLAIMER

        cleaned = AgentAdvice(**cleaned_data)
        return cleaned, issues

    except (LLMUnavailableError, Exception) as e:
        logger.warning("Guardrail agent unavailable, passing through: %s", e)
        # Ensure disclaimer present even in passthrough
        safe = advice.model_copy(
            update={"disclaimer": advice.disclaimer or _STANDARD_DISCLAIMER}
        )
        return safe, []
