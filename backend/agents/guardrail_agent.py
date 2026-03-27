"""
agents/guardrail_agent.py
Guardrail Agent — final compliance pass on mentor advice.
Checks for specific stock tips, fabricated numbers, and missing disclaimers.
Falls back to passing through with a standard disclaimer if LLM unavailable.
"""

from __future__ import annotations

import json
import logging
import re

from core.exceptions import LLMUnavailableError
from core.llm_client import structured_chat
from models import AgentAdvice

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

# Pattern design choices:
# - guaranteed/assured return: the single most common mis-selling phrase in
#   Indian retail finance; must never appear in output.
# - specific %  guaranteed: catches "12% guaranteed returns" style claims.
# - buy/invest in <Ticker>: catches explicit stock/AMC pick recommendations.
#   Allowlist kept narrow — only well-known large-caps as examples; extend as
#   needed. Generic terms like "index funds" or "equity MFs" are NOT flagged.
_BANNED_PATTERNS: list[tuple[re.Pattern, str]] = [
    (
        re.compile(r"\bguarantee[d]?\s+return[s]?\b", re.IGNORECASE),
        "guaranteed return claim",
    ),
    (
        re.compile(r"\bassure[d]?\s+return[s]?\b", re.IGNORECASE),
        "assured return claim",
    ),
    (
        re.compile(r"\b\d{1,2}%\s+guaranteed\b", re.IGNORECASE),
        "specific percentage guaranteed claim",
    ),
    (
        re.compile(
            r"\b(buy|invest\s+in)\s+(HDFC|ICICI|SBI|Reliance|TCS|Infosys|Wipro|Bajaj|Adani)\b",
            re.IGNORECASE,
        ),
        "specific stock/AMC buy recommendation",
    ),
]

# Sanitisation replacements — applied when a banned pattern fires
_SANITISE_MAP: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bguarantee[d]?\s+return[s]?\b", re.IGNORECASE), "historical return"),
    (re.compile(r"\bassure[d]?\s+return[s]?\b", re.IGNORECASE), "historical return"),
    (re.compile(r"\b(\d{1,2}%)\s+guaranteed\b", re.IGNORECASE), r"\1 historical"),
]


def _deterministic_guardrail(
    advice: AgentAdvice,
) -> tuple[AgentAdvice, list[str]]:
    """
    Regex-based backstop — runs unconditionally regardless of LLM result.
    Returns (possibly-sanitised advice, list of triggered issue strings).
    Never raises.
    """
    issues: list[str] = []
    all_text = " ".join([advice.summary] + advice.key_actions + advice.risks)

    for pattern, label in _BANNED_PATTERNS:
        if pattern.search(all_text):
            issues.append(f"Deterministic flag: {label}")

    if not issues:
        return advice, []

    # Sanitise summary in-place; key_actions and risks left for LLM pass
    sanitised_summary = advice.summary
    for pattern, replacement in _SANITISE_MAP:
        sanitised_summary = pattern.sub(replacement, sanitised_summary)

    advice = advice.model_copy(update={"summary": sanitised_summary})
    return advice, issues


async def run_guardrail(
    advice: AgentAdvice,
    reference_numbers: dict,
) -> tuple[AgentAdvice, list[str]]:
    """
    Returns (cleaned AgentAdvice, list_of_issues_found).
    Never raises — always returns something usable.

    Pipeline:
      1. Ensure disclaimer is present (cheap, synchronous)
      2. LLM semantic check — catches fabricated numbers, subtle mis-selling
      3. Deterministic regex check — catches keyword violations unconditionally
    """
    # Step 1 — Guarantee disclaimer before anything else
    if not advice.disclaimer:
        advice = advice.model_copy(update={"disclaimer": _STANDARD_DISCLAIMER})

    all_issues: list[str] = []

    # Step 2 — LLM semantic guardrail
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
        result = await structured_chat(
            messages,
            required_keys={"status", "issues_found", "advice"},
        )
        llm_issues = result.get("issues_found", [])
        cleaned_data = result.get("advice", advice.model_dump())

        if not cleaned_data.get("disclaimer"):
            cleaned_data["disclaimer"] = _STANDARD_DISCLAIMER

        advice = AgentAdvice(**cleaned_data)
        all_issues.extend(llm_issues)

    except (LLMUnavailableError, Exception) as e:
        logger.warning("Guardrail LLM unavailable, using deterministic-only pass: %s", e)
        advice = advice.model_copy(update={"disclaimer": advice.disclaimer or _STANDARD_DISCLAIMER})

    # Step 3 — deterministic backstop runs unconditionally
    # This fires whether the LLM passed, modified, or failed; it is the
    # final gate before advice reaches the user.
    advice, det_issues = _deterministic_guardrail(advice)
    all_issues.extend(det_issues)

    if det_issues:
        logger.warning(
            "Deterministic guardrail triggered %d issue(s): %s",
            len(det_issues),
            det_issues,
        )

    return advice, all_issues
