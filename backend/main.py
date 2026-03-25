"""
main.py
FastAPI application entry point.
Single responsibility: app setup, middleware, startup lifecycle, router mounting.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.exceptions import MoneyMentorError
from db.session_store import init_db
from routers import (
    chat,
    couple_planner,
    fire_planner,
    health_score,
    life_event,
    mf_xray,
    tax_wizard,
    voice,
)

# Logging
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Database initialised. %s v%s ready.", settings.APP_NAME, settings.APP_VERSION)
    yield
    # Cleanup on shutdown (add DB pool dispose here, when we move to Postgres)
    logger.info("Shutting down.")


# App
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(MoneyMentorError)
async def domain_error_handler(request: Request, exc: MoneyMentorError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": exc.message, "code": exc.code},
    )


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "code": "INTERNAL_ERROR"},
    )


# Routers
app.include_router(health_score.router)
app.include_router(fire_planner.router)
app.include_router(tax_wizard.router)
app.include_router(life_event.router)
app.include_router(couple_planner.router)
app.include_router(mf_xray.router)
app.include_router(chat.router)
app.include_router(voice.router)


# Health check
@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}
