"""
core/llm_client.py
Provider-agnostic LLM abstraction.
Add a new provider by subclassing BaseLLMProvider and registering it in get_provider().
Agents only call module-level chat_completion() and structured_chat() — never touch providers directly.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from functools import lru_cache
from typing import Optional

from core.config import settings
from core.exceptions import LLMUnavailableError

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 0.5  # seconds; doubles each attempt


# Base contract
class BaseLLMProvider(ABC):
    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        *,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        """Return the raw assistant text response."""


# Groq provider
class GroqProvider(BaseLLMProvider):
    def __init__(self) -> None:
        if not settings.GROQ_API_KEY:
            raise LLMUnavailableError()
        from groq import AsyncGroq

        self._client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    async def complete(
        self,
        messages: list[dict],
        *,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        from groq import APIConnectionError, APIStatusError, APITimeoutError

        kwargs: dict = {
            "model": settings.GROQ_MODEL,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await self._client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except APITimeoutError:
            logger.error("Groq timeout")
            raise LLMUnavailableError()
        except APIConnectionError as e:
            logger.error("Groq connection error: %s", e)
            raise LLMUnavailableError()
        except APIStatusError as e:
            logger.error("Groq status %s: %s", e.status_code, e.message)
            raise LLMUnavailableError()
        except Exception as e:
            logger.exception("Groq unexpected error: %s", e)
            raise LLMUnavailableError()


# Gemini provider
class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini via the native google-genai SDK.
    Requires: uv add google-genai
    Set in .env: LLM_PROVIDER=gemini, GEMINI_API_KEY=...
    """

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise LLMUnavailableError()
        from google import genai

        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def complete(
        self,
        messages: list[dict],
        *,
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        from google.genai import types
        from google.genai.errors import APIError, ClientError

        system_instruction: str | None = None
        contents: list = []

        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg["content"])],
                    )
                )

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
            response_mime_type="application/json" if json_mode else None,
        )

        try:
            response = await self._client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=config,
            )
            return response.text
        except ClientError as e:
            logger.error("Gemini client error: %s", e)
            raise LLMUnavailableError()
        except APIError as e:
            logger.error("Gemini API error: %s", e)
            raise LLMUnavailableError()
        except Exception as e:
            logger.exception("Gemini unexpected error: %s", e)
            raise LLMUnavailableError()


# Factory
_REGISTRY: dict[str, type[BaseLLMProvider]] = {
    "groq": GroqProvider,
    "gemini": GeminiProvider,
}


@lru_cache(maxsize=1)
def get_provider() -> BaseLLMProvider:
    name = settings.LLM_PROVIDER.lower()
    cls = _REGISTRY.get(name)
    if cls is None:
        raise ValueError(f"Unknown LLM provider '{name}'. Choose from: {list(_REGISTRY)}")
    logger.info("LLM provider: %s", name)
    return cls()


# Public API
async def chat_completion(
    messages: list[dict],
    *,
    temperature: float | None = None,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str:
    import asyncio

    provider = get_provider()
    last_exc: LLMUnavailableError | None = None

    for attempt in range(_MAX_RETRIES):
        try:
            return await provider.complete(
                messages,
                temperature=temperature if temperature is not None else settings.GROQ_TEMPERATURE,
                max_tokens=max_tokens or settings.GROQ_MAX_TOKENS,
                json_mode=json_mode,
            )
        except LLMUnavailableError as e:
            last_exc = e
            if attempt < _MAX_RETRIES - 1:
                delay = _RETRY_BASE_DELAY * (2**attempt)  # 0.5s, 1.0s
                logger.warning(
                    "LLM unavailable (attempt %d/%d) — retrying in %.1fs",
                    attempt + 1,
                    _MAX_RETRIES,
                    delay,
                )
                await asyncio.sleep(delay)

    logger.error("LLM unavailable after %d attempts — giving up", _MAX_RETRIES)
    raise last_exc


async def structured_chat(
    messages: list[dict],
    *,
    required_keys: Optional[set[str]] = None,
    **kwargs,
) -> dict:
    """Guaranteed JSON dict response. Strips markdown fences before parsing."""
    raw = await chat_completion(messages, json_mode=True, **kwargs)
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rsplit("```", 1)
    data = json.loads(text.strip())

    # Log missing keys so they surface in structured logs / Sentry.
    # Never raises — callers handle fallback; this is purely for observability.
    if required_keys:
        missing = required_keys - data.keys()
        if missing:
            logger.warning(
                "structured_chat: LLM response missing expected keys %s (got: %s)",
                sorted(missing),
                sorted(data.keys()),
            )

    return data
