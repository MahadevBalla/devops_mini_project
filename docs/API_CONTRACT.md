# API Contract

## Table of Contents

- [1. Overview](#1-overview)
- [2. Base URL](#2-base-url)
- [3. Authentication](#3-authentication)
- [4. Common Response Shape](#4-common-response-shape)
- [5. Endpoints](#5-endpoints)
- [6. Request Flow](#6-request-flow)
- [7. Errors](#7-errors)
- [8. Notes](#8-notes)

## 1. Overview

This doc is the quick reference for the backend HTTP contracts: routes, request shapes, and response formats.

Routes are feature-specific. There is no generic `/process` endpoint.

## 2. Base URL

```text
http://localhost:8000
```

## 3. Authentication

Auth is JWT-based.

Protected endpoints expect:

```http
Authorization: Bearer <access_token>
```

Public endpoints:

- `GET /health`
- `GET /metrics`
- `POST /api/auth/signup`
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/voice/voices`
- `POST /api/voice/stt`
- `POST /api/voice/tts`

Protected endpoints:

- `GET /api/auth/me`
- `POST /api/auth/logout-all`
- all feature routes
- chat routes
- portfolio routes
- `POST /api/session`

## 4. Common Response Shape

Most feature endpoints return the same envelope:

```json
{
  "session_id": "string",
  "profile": {},
  "result": {},
  "advice": {
    "summary": "string",
    "key_actions": ["string"],
    "risks": ["string"],
    "disclaimer": "string",
    "regime_suggestion": null
  },
  "decision_log": []
}
```

Field meaning:

- `session_id`: server-created execution/session id
- `profile`: normalized profile used for computation, when that route returns one
- `result`: deterministic output from the finance layer
- `advice`: generated explanation layer
- `decision_log`: step-level execution log for the request

Notes:

- `life-event`, `couple-planner`, and `mf-xray` do not return `profile`
- chat responses use `reply`, not `result` and `advice`
- auth and portfolio responses have their own shapes

## 5. Endpoints

### Health

#### `GET /health`

Liveness check. Docker Compose and Jenkins use this endpoint to verify backend health.

Response:

```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

#### `GET /metrics`

Prometheus scrape endpoint exposed by the FastAPI instrumentator.

This is not a user-facing API route. It exists for monitoring integration and returns Prometheus text exposition format.

### Auth

#### `POST /api/auth/signup`

Create user and send verification OTP.

Request:

```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass@123"
}
```

Response:

```json
{
  "message": "Account created successfully. Please check your email for verification code.",
  "email": "jane@example.com",
  "verification_required": true,
  "email_sent": true,
  "dev_otp": null
}
```

#### `POST /api/auth/verify-email`

Verify email with OTP. Returns tokens.

Request:

```json
{
  "email": "jane@example.com",
  "token": "123456"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": null,
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-04-21T10:00:00",
    "last_login_at": "2026-04-21T10:00:00"
  }
}
```

#### `POST /api/auth/resend-verification`

Resend verification OTP.

Request:

```json
{
  "email": "jane@example.com"
}
```

Response:

```json
{
  "message": "Verification code resent. Please check your email.",
  "email": "jane@example.com",
  "email_sent": true,
  "dev_otp": null
}
```

#### `POST /api/auth/login`

Email/password login.

Request:

```json
{
  "email": "jane@example.com",
  "password": "StrongPass@123"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": null,
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-04-21T10:00:00",
    "last_login_at": "2026-04-21T10:05:00"
  }
}
```

#### `POST /api/auth/refresh`

Exchange refresh token for a new access token.

Request:

```json
{
  "refresh_token": "jwt"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "jwt",
  "token_type": "bearer",
  "user": {
    "id": "user-id",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "phone": null,
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-04-21T10:00:00",
    "last_login_at": "2026-04-21T10:05:00"
  }
}
```

#### `POST /api/auth/logout`

Revoke one refresh token.

Request:

```json
{
  "refresh_token": "jwt"
}
```

Response:

```json
{
  "message": "Logged out successfully",
  "scope": "single_device"
}
```

#### `POST /api/auth/logout-all`

Revoke all refresh tokens for the current user.

Response:

```json
{
  "message": "Logged out from all devices successfully",
  "tokens_revoked": 3,
  "scope": "all_devices"
}
```

#### `GET /api/auth/me`

Get current user profile.

Response:

```json
{
  "id": "user-id",
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "phone": null,
  "is_verified": true,
  "is_active": true,
  "created_at": "2026-04-21T10:00:00",
  "last_login_at": "2026-04-21T10:05:00"
}
```

### Feature Endpoints

Most feature routes use this request envelope:

```json
{
  "use_profile": true,
  "profile": null,
  "save_scenario": false,
  "scenario_name": null
}
```

Rules:

- `use_profile=true` means load the saved portfolio profile
- `use_profile=false` means `profile` must be supplied
- `save_scenario=true` is only valid for what-if runs

#### `POST /api/fire-planner`

Run FIRE projection and advice generation.

Request:

```json
{
  "use_profile": false,
  "profile": {
    "age": 30,
    "city": "Bengaluru",
    "monthly_gross_income": 150000,
    "monthly_expenses": 60000
  }
}
```

Response:

```json
{
  "session_id": "session-id",
  "profile": {
    "age": 30
  },
  "result": {
    "fi_corpus_required": 30000000,
    "required_monthly_sip": 45000
  },
  "advice": {
    "summary": "You need a larger retirement corpus.",
    "key_actions": ["Increase SIP"],
    "risks": ["Inflation risk"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

#### `POST /api/health-score`

Compute money health score and advice.

Request:

```json
{
  "use_profile": false,
  "profile": {
    "age": 30,
    "city": "Pune",
    "monthly_gross_income": 120000,
    "monthly_expenses": 50000
  }
}
```

Response:

```json
{
  "session_id": "session-id",
  "profile": {
    "age": 30
  },
  "result": {
    "overall_score": 78.5,
    "grade": "B"
  },
  "advice": {
    "summary": "Your score is decent but not great.",
    "key_actions": ["Build emergency fund"],
    "risks": ["Low diversification"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

#### `POST /api/tax-wizard`

Compare old vs new regime and generate advice.

Request:

```json
{
  "use_profile": false,
  "profile": {
    "age": 32,
    "city": "Mumbai",
    "monthly_gross_income": 180000,
    "monthly_expenses": 70000
  }
}
```

Response:

```json
{
  "session_id": "session-id",
  "profile": {
    "age": 32
  },
  "result": {
    "old_regime_tax": 210000,
    "new_regime_tax": 185000,
    "recommended_regime": "new"
  },
  "advice": {
    "summary": "New regime is better for this profile.",
    "key_actions": ["Review employer NPS option"],
    "risks": ["Tax rules can change"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

#### `POST /api/life-event`

Run a life-event analysis. This route does not use the shared `FeatureRequest` model.

Request:

```json
{
  "age": 29,
  "city": "Hyderabad",
  "monthly_gross_income": 110000,
  "monthly_expenses": 45000,
  "event_type": "bonus",
  "event_amount": 500000
}
```

Response:

```json
{
  "session_id": "session-id",
  "result": {
    "event_type": "bonus",
    "event_amount": 500000,
    "tax_impact": 150000
  },
  "advice": {
    "summary": "Do not spend the whole bonus.",
    "key_actions": ["Split between goals and emergency fund"],
    "risks": ["Tax drag"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

#### `POST /api/couple-planner`

Run joint planning across two partner profiles. This route does not use the shared `FeatureRequest` model.

Request:

```json
{
  "partner_a": {
    "age": 30,
    "city": "Mumbai",
    "monthly_gross_income": 140000,
    "monthly_expenses": 60000
  },
  "partner_b": {
    "age": 29,
    "city": "Mumbai",
    "monthly_gross_income": 90000,
    "monthly_expenses": 40000
  }
}
```

Response:

```json
{
  "session_id": "session-id",
  "result": {
    "combined_net_worth": 12000000,
    "joint_tax_saving": 80000
  },
  "advice": {
    "summary": "One partner is better placed to claim HRA.",
    "key_actions": ["Rebalance SIP split"],
    "risks": ["Insurance gaps"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

#### `POST /api/mf-xray`

Upload a CAMS or KFintech statement and run mutual fund portfolio analysis.

Request:

```text
multipart/form-data
file=<statement.csv|statement.pdf>
```

Response:

```json
{
  "session_id": "session-id",
  "result": {
    "total_invested": 1500000,
    "total_current_value": 1760000,
    "overall_xirr": 13.4
  },
  "advice": {
    "summary": "Portfolio is doing fine but has overlap.",
    "key_actions": ["Review duplicate exposure"],
    "risks": ["High expense drag"],
    "disclaimer": "Educational only."
  },
  "decision_log": []
}
```

### Chat

#### `POST /api/chat`

Session-based chat over prior feature context and retrieved docs.

Request:

```json
{
  "session_id": "session-uuid",
  "message": "Can I retire by 50?"
}
```

Response:

```json
{
  "session_id": "session-uuid",
  "reply": "Based on your current plan, you need to increase your SIP."
}
```

#### `GET /api/chat/stream`

Streaming chat response over SSE.

Query params:

- `session_id`
- `message`

SSE payload shape:

```text
data: {"token":"Based "}

data: {"token":"on your plan..."}

data: {"done":true}
```

### Voice

Voice endpoints are public and are used by the chat voice UI.

#### `GET /api/voice/voices`

List available text-to-speech voices.

Response:

```json
{
  "voices": {
    "meera": "Female, Indian English..."
  },
  "default": "meera"
}
```

#### `POST /api/voice/stt`

Convert uploaded audio to text.

Request:

```text
multipart/form-data
audio=<wav|mp3|ogg|webm>
language_code=en-IN
```

Response:

```json
{
  "transcript": "What should I do with my bonus?",
  "language": "en-IN"
}
```

#### `POST /api/voice/tts`

Convert text to speech.

Request:

```text
multipart/form-data
text=Your plan looks healthy.
voice=meera
language_code=en-IN
```

Response:

```text
audio/wav
```

### Portfolio

#### `GET /api/portfolio`

Get the saved portfolio plus latest stored results.

Response:

```json
{
  "user_id": "user-id",
  "profile": {},
  "fire": {},
  "health": {},
  "tax": {},
  "mf": {},
  "couple": {},
  "life_event": {}
}
```

#### `PATCH /api/portfolio/profile`

Update the canonical saved user profile.

Request:

```json
{
  "age": 30,
  "city": "Bengaluru",
  "monthly_gross_income": 150000,
  "monthly_expenses": 60000
}
```

Response:

```json
{
  "user_id": "user-id",
  "profile": {
    "age": 30,
    "city": "Bengaluru"
  },
  "fire": {},
  "health": {}
}
```

#### `GET /api/portfolio/scenarios`

List saved scenarios. Optional query filters: `feature`, `session_type`.

Response:

```json
[
  {
    "id": "scenario-id",
    "name": "Retire by 50",
    "feature": "fire",
    "session_type": "scenario",
    "created_at": "2026-04-21T10:10:00",
    "result": {}
  }
]
```

#### `GET /api/portfolio/scenarios/{scenario_id}`

Get one saved scenario with input and result.

Response:

```json
{
  "id": "scenario-id",
  "name": "Retire by 50",
  "feature": "fire",
  "session_type": "scenario",
  "created_at": "2026-04-21T10:10:00",
  "input_data": {},
  "result": {}
}
```

#### `DELETE /api/portfolio/scenarios/{scenario_id}`

Delete one saved scenario.

Response:

```text
204 No Content
```

### Session

#### `POST /api/session`

Create a blank chat session.

Response:

```json
{
  "session_id": "session-uuid"
}
```

## 6. Request Flow

```text
Client -> API -> validation -> pipeline -> response
```

In practice:

- request model validation happens first
- auth is resolved for protected routes
- feature routes run validation, finance, advice, and guardrails
- response is typed and session-backed

## 7. Errors

Common cases:

- `401` for missing/invalid auth
- `422` for validation errors
- `404` for missing sessions or scenarios
- `500` for unexpected server-side failures

LLM failures should degrade safely:

- feature routes can still return deterministic outputs with fallback advice paths
- chat returns a safe fallback reply instead of surfacing provider errors directly

Error shape is typically:

```json
{
  "error": "message",
  "code": "ERROR_CODE"
}
```

Route-raised FastAPI errors may wrap that object under `detail`.

## 8. Notes

- There is no `/process` endpoint.
- Routes are feature-specific on purpose.
- Finance outputs come from deterministic code.
- Advice is a generated layer on top of those outputs.
- `/metrics` is for monitoring integration, not product API usage.
