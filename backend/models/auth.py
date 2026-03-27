"""
models/auth.py
Authentication request/response models.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    """User signup request."""
    full_name: str = Field(..., min_length=2, max_length=50, description="Full name (2-50 chars)")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password (min 8 chars, must contain 1 digit and 1 special char)",
    )
    phone: Optional[str] = Field(
        None,
        description="Indian phone number (+91-XXXXXXXXXX or 10 digits) — optional",
    )

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name contains only letters, spaces, and common punctuation."""
        if not re.match(r'^[a-zA-Z\s\.\-\']+$', v):
            raise ValueError("Name can only contain letters, spaces, dots, hyphens, and apostrophes")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """Validate password meets security requirements."""
        from core.security import validate_password_strength
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: Optional[str]) -> Optional[str]:
        """Validate and normalize Indian phone number."""
        if v is None:
            return None
        from core.security import normalize_phone, validate_indian_phone
        is_valid, error_msg = validate_indian_phone(v)
        if not is_valid:
            raise ValueError(error_msg)
        return normalize_phone(v)


class UserLogin(BaseModel):
    """User login request."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public user data (returned by API) — NO PASSWORD!"""
    id: str
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    is_verified: bool
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT token response after login/signup."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Request password reset email."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirm password reset with token."""
    token: str
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="New password (min 8 chars, 1 digit, 1 special char)",
    )

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        from core.security import validate_password_strength
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v


class EmailVerificationRequest(BaseModel):
    """Request email verification resend."""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Confirm email with OTP/token."""
    email: EmailStr
    token: str = Field(..., min_length=6, max_length=6, description="6-digit OTP")
