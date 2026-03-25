"""
agents/intake_agent.py
Intake Agent — validates raw user input and produces a complete UserProfile.
If LLM is unavailable, falls back to direct Pydantic validation of the raw dict.
"""

from __future__ import annotations

import json
import logging

from pydantic import ValidationError as PydanticValidationError

from core.exceptions import LLMUnavailableError, ValidationError
from core.llm_client import structured_chat
from models.schemas import UserProfile

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """You are a financial data intake assistant for an Indian personal finance app.

Your job is to review the user-submitted financial profile JSON and:
1. Check for obvious data quality issues (e.g., expenses > income, negative values).
2. Fill in reasonable Indian defaults for missing optional fields ONLY — never invent core fields like income.
3. Return a valid, complete JSON matching the UserProfile schema exactly.

Rules:
- Do NOT invent income, savings, or debt numbers.
- Use Indian financial norms: emergency fund = 6× monthly expenses, insurance = 10× annual income.
- If a required field is completely missing and cannot be inferred, set it to 0 and add a note in the "validation_notes" array.
- Return ONLY a JSON object with two keys: "profile" (the validated UserProfile dict) and "validation_notes" (array of strings).
"""


async def run_intake_agent(raw_data: dict) -> tuple[UserProfile, list[str]]:
    """
    Validates raw input dict and returns (UserProfile, validation_notes).
    Falls back to direct Pydantic parse if LLM is unavailable.
    """
    try:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    "Validate and complete this profile JSON:\n\n" + json.dumps(raw_data, indent=2)
                ),
            },
        ]
        result = await structured_chat(messages)
        profile_dict = result.get("profile", raw_data)
        notes = result.get("validation_notes", [])

        try:
            profile = UserProfile.model_validate(profile_dict)
            return profile, notes
        except PydanticValidationError as e:
            logger.warning("LLM returned invalid profile — falling back to raw: %s", e)
            raise LLMUnavailableError()

    except LLMUnavailableError:
        logger.info("Intake agent falling back to direct Pydantic validation")
        try:
            profile = UserProfile.model_validate(raw_data)
            return profile, ["LLM unavailable — direct validation used."]
        except PydanticValidationError as e:
            raise ValidationError(str(e)) from e
