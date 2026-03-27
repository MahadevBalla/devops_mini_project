"""
core/security.py
Password hashing, JWT token generation, and auth utilities.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import Optional

import bcrypt

from core.config import settings


def hash_password(password: str) -> str:
    """
    Hash a plain password using bcrypt.

    Note: bcrypt has a 72-byte limit. Passwords are truncated to 72 bytes
    before hashing to avoid errors.
    """
    # Truncate to 72 bytes for bcrypt limit
    password_bytes = password.encode("utf-8")[:72]

    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    # Return as string
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    # Truncate to 72 bytes (same as hash)
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(password_bytes, hashed_bytes)


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets security requirements.
    Returns (is_valid, error_message).

    Rules:
    - Minimum 8 characters
    - At least 1 digit
    - At least 1 special character (!@#$%^&*(),.?":{}|<>)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if not re.search(r"\d", password):
        return False, "Password must contain at least 1 digit"

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least 1 special character"

    return True, None


def validate_indian_phone(phone: str) -> tuple[bool, Optional[str]]:
    """
    Validate Indian phone number format.
    Accepts: +91-XXXXXXXXXX, +91XXXXXXXXXX, or 10-digit number.
    Returns (is_valid, error_message).
    """
    if not phone:
        return True, None  # Optional field

    # Remove spaces and hyphens for validation
    cleaned = phone.replace(" ", "").replace("-", "")

    # Pattern 1: +91 followed by 10 digits
    if cleaned.startswith("+91"):
        digits = cleaned[3:]
        if len(digits) == 10 and digits.isdigit():
            return True, None
        return False, "Phone must be +91 followed by 10 digits"

    # Pattern 2: 10 digits only
    if len(cleaned) == 10 and cleaned.isdigit():
        return True, None

    return False, "Phone must be a valid Indian number (+91-XXXXXXXXXX or 10 digits)"


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """
    Normalize phone to +91-XXXXXXXXXX format.
    Returns None if phone is empty.
    """
    if not phone:
        return None

    cleaned = phone.replace(" ", "").replace("-", "")

    if cleaned.startswith("+91"):
        digits = cleaned[3:]
        return f"+91-{digits}"

    if len(cleaned) == 10 and cleaned.isdigit():
        return f"+91-{cleaned}"

    return phone  # Return as-is if invalid (validation will catch it)


# JWT token utilities (we'll implement these after adding PyJWT)
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token.
    Default expiry: 15 minutes.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})

    # Import here to avoid dependency errors if PyJWT not installed
    try:
        import jwt

        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except ImportError:
        raise ImportError("PyJWT is required for token generation. Install: uv add pyjwt")


def create_refresh_token(data: dict) -> str:
    """
    Create JWT refresh token.
    Default expiry: 7 days.
    """
    to_encode = data.copy()
    expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})

    try:
        import jwt

        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    except ImportError:
        raise ImportError("PyJWT is required for token generation. Install: uv add pyjwt")


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token.
    Raises jwt.InvalidTokenError if invalid/expired.
    """
    try:
        import jwt

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except ImportError:
        raise ImportError("PyJWT is required for token decoding. Install: uv add pyjwt")
