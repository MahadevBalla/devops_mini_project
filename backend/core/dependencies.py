"""
core/dependencies.py
FastAPI dependency functions for authentication and authorization.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.exceptions import AuthenticationError
from core.security import decode_token
from db.session_store import User, get_user_by_id

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """
    Dependency to get the current authenticated user from JWT access token.
    Raises 401 if token is invalid, expired, or user not found.

    Usage:
        @router.get("/protected")
        async def protected_route(user: User = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    try:
        # Extract token from Authorization: Bearer <token>
        token = credentials.credentials

        # Decode JWT
        payload = decode_token(token)

        # Verify token type
        if payload.get("type") != "access":
            raise AuthenticationError("Invalid token type")

        # Extract user ID
        user_id: Optional[str] = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")

        # Fetch user from database
        user = await get_user_by_id(user_id)
        if not user:
            raise AuthenticationError("User not found")

        # Check if user is active
        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        return user

    except AuthenticationError:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": f"Invalid or expired token: {str(e)}", "code": "INVALID_TOKEN"},
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_verified_user(
    user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to enforce email verification.
    Returns user only if email is verified.

    Usage:
        @router.get("/verified-only")
        async def verified_route(user: User = Depends(require_verified_user)):
            return {"message": "Email verified!"}
    """
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "Email not verified",
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email before accessing this resource",
            },
        )
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
) -> Optional[User]:
    """
    Dependency to optionally get the current user.
    Returns None if no token provided or token is invalid.
    Does NOT raise errors.

    Usage:
        @router.get("/optional-auth")
        async def optional_route(user: Optional[User] = Depends(get_optional_user)):
            if user:
                return {"message": f"Hello {user.full_name}"}
            return {"message": "Hello guest"}
    """
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)

        if payload.get("type") != "access":
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await get_user_by_id(user_id)
        if user and user.is_active:
            return user

    except Exception:
        pass

    return None
