"""
routers/auth.py
POST /api/auth/signup       — Create new user account
POST /api/auth/verify-email — Verify email with OTP
POST /api/auth/login        — Login and get JWT tokens
POST /api/auth/refresh      — Refresh access token
POST /api/auth/logout       — Revoke refresh token
GET  /api/auth/me           — Get current user profile
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError as PydanticValidationError

from core.config import settings
from core.dependencies import get_current_user
from core.email import send_otp_email
from core.exceptions import (
    AuthenticationError,
    InvalidCredentialsError,
    InvalidTokenError,
    TokenExpiredError,
    UserAlreadyExistsError,
)
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from db.session_store import (
    User,
    create_user,
    get_refresh_token,
    get_user_by_email,
    revoke_all_user_tokens,
    revoke_refresh_token,
    set_verification_token,
    store_refresh_token,
    update_user_last_login,
    verify_user_email,
)
from models import (
    EmailVerificationConfirm,
    EmailVerificationRequest,
    ErrorResponse,
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])


# Signup
@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "User created successfully, check email for verification code"},
        400: {"model": ErrorResponse, "description": "User already exists"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def signup(user_data: UserCreate) -> dict:
    """
    Create a new user account.

    Flow:
    1. Validate input (Pydantic handles this)
    2. Check if email already exists
    3. Hash password
    4. Create user in DB (is_verified=False)
    5. Generate 6-digit OTP
    6. Store OTP + expiry (10 minutes)
    7. Send verification email (TODO: implement email service)
    8. Return success message

    **Note:** Email verification is required before login.
    """
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user_data.email)
        if existing_user:
            raise UserAlreadyExistsError(user_data.email)

        # Hash password
        hashed_password = hash_password(user_data.password)

        # Create user
        user = await create_user(
            full_name=user_data.full_name,
            email=user_data.email,
            hashed_password=hashed_password,
            phone=user_data.phone,
        )

        # Generate 6-digit OTP
        otp = secrets.randbelow(900000) + 100000  # Ensures 6 digits (100000-999999)
        otp_str = str(otp)

        # Set OTP expiry (10 minutes)
        otp_expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Store OTP in database
        await set_verification_token(user.id, otp_str, otp_expires_at)

        # Send OTP via email
        email_sent = send_otp_email(user.email, otp_str, user.full_name)

        # Log OTP (for debugging)
        logger.info(
            f"User {user.email} created. OTP: {otp_str} (expires at {otp_expires_at}). "
            f"Email sent: {email_sent}"
        )

        return {
            "message": "Account created successfully. Please check your email for verification code.",
            "email": user.email,
            "verification_required": True,
            "email_sent": email_sent,
            # In DEBUG mode, include OTP in response for testing
            "dev_otp": otp_str if settings.DEBUG else None,
        }

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"error": e.message, "code": e.code}
        )
    except PydanticValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": str(e), "code": "VALIDATION_ERROR"},
        )
    except Exception as e:
        logger.exception("Unexpected error during signup")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


# Email Verification
@router.post(
    "/verify-email",
    responses={
        200: {"model": TokenResponse, "description": "Email verified, tokens returned"},
        400: {"model": ErrorResponse, "description": "Invalid or expired OTP"},
        404: {"model": ErrorResponse, "description": "User not found"},
    },
)
async def verify_email(verification_data: EmailVerificationConfirm) -> TokenResponse:
    """
    Verify email with 6-digit OTP.

    Flow:
    1. Find user by email
    2. Check OTP matches
    3. Check OTP not expired
    4. Mark email as verified
    5. Generate access + refresh tokens
    6. Return tokens

    After verification, user can login normally.
    """
    try:
        # Find user
        user = await get_user_by_email(verification_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "User not found", "code": "USER_NOT_FOUND"},
            )

        # Check if already verified
        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Email already verified", "code": "ALREADY_VERIFIED"},
            )

        # Check OTP
        if not user.verification_token or user.verification_token != verification_data.token:
            raise InvalidTokenError("Invalid verification code")

        # Check OTP expiry
        if (
            not user.verification_token_expires_at
            or datetime.utcnow() > user.verification_token_expires_at
        ):
            raise TokenExpiredError("Verification code has expired. Please request a new one.")

        # Mark as verified
        await verify_user_email(user.id)

        # Update last login
        await update_user_last_login(user.id)

        # Generate tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})

        # Store refresh token
        refresh_expires_at = datetime.utcnow() + timedelta(days=7)
        await store_refresh_token(user.id, refresh_token, refresh_expires_at)

        # Refresh user object to get updated fields
        user = await get_user_by_email(user.email)

        logger.info(f"User {user.email} verified successfully")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except (InvalidTokenError, TokenExpiredError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.exception("Unexpected error during email verification")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


@router.post(
    "/resend-verification",
    responses={
        200: {"description": "Verification code resent"},
        404: {"model": ErrorResponse, "description": "User not found"},
        400: {"model": ErrorResponse, "description": "Email already verified"},
    },
)
async def resend_verification(request: EmailVerificationRequest) -> dict:
    """
    Resend verification OTP.

    Useful if user didn't receive the first email or OTP expired.
    """
    try:
        user = await get_user_by_email(request.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "User not found", "code": "USER_NOT_FOUND"},
            )

        if user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "Email already verified", "code": "ALREADY_VERIFIED"},
            )

        # Generate new OTP
        otp = secrets.randbelow(900000) + 100000
        otp_str = str(otp)
        otp_expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Store new OTP
        await set_verification_token(user.id, otp_str, otp_expires_at)

        # Send OTP via email
        email_sent = send_otp_email(user.email, otp_str, user.full_name)

        # Log OTP (for debugging)
        logger.info(f"New OTP for {user.email}: {otp_str}. Email sent: {email_sent}")

        return {
            "message": "Verification code resent. Please check your email.",
            "email": user.email,
            "email_sent": email_sent,
            # In DEBUG mode, include OTP in response for testing
            "dev_otp": otp_str if settings.DEBUG else None,
        }

    except Exception as e:
        logger.exception("Error resending verification code")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


# Login
@router.post(
    "/login",
    responses={
        200: {"model": TokenResponse, "description": "Login successful"},
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Email not verified or account inactive"},
    },
)
async def login(credentials: UserLogin) -> TokenResponse:
    """
    Login with email and password.

    Flow:
    1. Find user by email
    2. Verify password
    3. Check email verified
    4. Check account active
    5. Generate access + refresh tokens
    6. Store refresh token
    7. Update last_login_at
    8. Return tokens + user data
    """
    try:
        # Find user
        user = await get_user_by_email(credentials.email)
        if not user:
            raise InvalidCredentialsError()

        # Verify password
        if not verify_password(credentials.password, user.hashed_password):
            raise InvalidCredentialsError()

        # Check email verified
        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Email not verified",
                    "code": "EMAIL_NOT_VERIFIED",
                    "message": "Please verify your email before logging in",
                },
            )

        # Check account active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Account inactive",
                    "code": "ACCOUNT_INACTIVE",
                    "message": "Your account has been deactivated. Please contact support.",
                },
            )

        # Update last login
        await update_user_last_login(user.id)

        # Generate tokens
        access_token = create_access_token({"sub": user.id, "email": user.email})
        refresh_token = create_refresh_token({"sub": user.id})

        # Store refresh token
        refresh_expires_at = datetime.utcnow() + timedelta(days=7)
        await store_refresh_token(user.id, refresh_token, refresh_expires_at)

        # Refresh user to get updated last_login_at
        user = await get_user_by_email(user.email)

        logger.info(f"User {user.email} logged in successfully")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.exception("Unexpected error during login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


# Refresh Token
@router.post(
    "/refresh",
    responses={
        200: {"model": TokenResponse, "description": "Token refreshed"},
        401: {"model": ErrorResponse, "description": "Invalid or expired refresh token"},
    },
)
async def refresh_access_token(request: RefreshTokenRequest) -> TokenResponse:
    """
    Refresh access token using refresh token.

    Flow:
    1. Validate refresh token (not expired, not revoked)
    2. Extract user_id from token
    3. Verify user still active and verified
    4. Generate new access token
    5. Keep same refresh token (or optionally rotate)
    6. Return new tokens
    """
    try:
        # Decode refresh token
        try:
            payload = decode_token(request.refresh_token)
        except Exception as e:
            raise InvalidTokenError(f"Invalid refresh token: {str(e)}")

        # Verify token type
        if payload.get("type") != "refresh":
            raise InvalidTokenError("Token is not a refresh token")

        # Check if token is in database and not revoked
        db_token = await get_refresh_token(request.refresh_token)
        if not db_token:
            raise InvalidTokenError("Refresh token not found")

        if db_token.is_revoked:
            raise InvalidTokenError("Refresh token has been revoked")

        # Check expiry
        if datetime.utcnow() > db_token.expires_at:
            raise TokenExpiredError("Refresh token has expired. Please login again.")

        # Get user
        user_id = payload.get("sub")
        if not user_id:
            raise InvalidTokenError("Invalid token payload")

        from db.session_store import get_user_by_id

        user = await get_user_by_id(user_id)
        if not user:
            raise InvalidTokenError("User not found")

        if not user.is_active:
            raise AuthenticationError("Account is inactive")

        if not user.is_verified:
            raise AuthenticationError("Email not verified")

        # Generate new access token
        access_token = create_access_token({"sub": user.id, "email": user.email})

        # Optionally rotate refresh token (recommended for security)
        # For now, we'll keep the same refresh token
        # To rotate: revoke old token, generate new refresh token, store it

        logger.info(f"Access token refreshed for user {user.email}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=request.refresh_token,  # Same refresh token
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    except (InvalidTokenError, TokenExpiredError, AuthenticationError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.exception("Unexpected error during token refresh")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


# Logout
@router.post(
    "/logout",
    responses={
        200: {"description": "Logged out successfully"},
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
    },
)
async def logout(request: RefreshTokenRequest) -> dict:
    """
    Logout by revoking refresh token.

    This logs out from the current device only.
    To logout from all devices, use /logout-all endpoint.
    """
    try:
        revoked = await revoke_refresh_token(request.refresh_token)
        if not revoked:
            raise InvalidTokenError("Refresh token not found or already revoked")

        logger.info("User logged out (single device)")

        return {
            "message": "Logged out successfully",
            "scope": "single_device",
        }

    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail={"error": e.message, "code": e.code}
        )
    except Exception as e:
        logger.exception("Error during logout")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


@router.post(
    "/logout-all",
    responses={
        200: {"description": "Logged out from all devices"},
        401: {"model": ErrorResponse, "description": "Authentication required"},
    },
)
async def logout_all(user: User = Depends(get_current_user)) -> dict:
    """
    Logout from all devices by revoking all refresh tokens.

    Requires valid access token.
    """
    try:
        count = await revoke_all_user_tokens(user.id)

        logger.info(f"User {user.email} logged out from all devices ({count} tokens revoked)")

        return {
            "message": "Logged out from all devices successfully",
            "tokens_revoked": count,
            "scope": "all_devices",
        }

    except Exception as e:
        logger.exception("Error during logout-all")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": str(e), "code": "INTERNAL_ERROR"},
        )


# Get Current User
@router.get(
    "/me",
    response_model=UserResponse,
    responses={
        200: {"model": UserResponse, "description": "Current user profile"},
        401: {"model": ErrorResponse, "description": "Authentication required"},
    },
)
async def get_me(user: User = Depends(get_current_user)) -> UserResponse:
    """
    Get current authenticated user profile.

    Requires valid access token in Authorization header:
    Authorization: Bearer <access_token>
    """
    return UserResponse.model_validate(user)
