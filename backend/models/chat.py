"""
models/chat.py
Chat request/response models.
"""

from __future__ import annotations

import uuid as uuid_module
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User message — min 1 char, max 4000 chars to prevent prompt stuffing",
    )
    feature_context: Optional[str] = None

    @field_validator("session_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        try:
            uuid_module.UUID(v)
        except ValueError:
            raise ValueError("session_id must be a valid UUID (e.g. from POST /api/session)")
        return v


class ChatResponse(BaseModel):
    session_id: str
    reply: str
