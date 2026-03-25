"""
routers/voice.py
POST /api/voice/stt   — audio file → transcript (Sarvam Saaras)
POST /api/voice/tts   — text → WAV audio bytes (Sarvam Bulbul)
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from core.config import settings
from core.voice import SARVAM_VOICES, speech_to_text, text_to_speech

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/voice", tags=["voice"])

_MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/stt",
    responses={
        413: {"description": "Audio file too large"},
        502: {"description": "Speech recognition failed"},
        503: {"description": "Voice service not configured"},
    },
)
async def stt(
    audio: UploadFile = File(..., description="WAV / MP3 / OGG audio file"),
    language_code: str = Form(default="en-IN"),
) -> dict:
    """
    Convert speech to text.
    Returns: {"transcript": "...", "language": "en-IN"}
    """
    if not settings.SARVAM_API_KEY:
        raise HTTPException(503, detail="Voice service not configured — set SARVAM_API_KEY")

    audio_bytes = await audio.read()
    if len(audio_bytes) > _MAX_AUDIO_SIZE:
        raise HTTPException(413, detail="Audio file too large (max 10 MB)")

    try:
        transcript = await speech_to_text(audio_bytes, language_code=language_code)
        return {"transcript": transcript, "language": language_code}
    except Exception as e:
        logger.error("STT failed: %s", e)
        raise HTTPException(502, detail="Speech recognition failed — please try again")


@router.post(
    "/tts",
    responses={
        400: {"description": "Invalid voice or text too long"},
        502: {"description": "Text-to-speech failed"},
        503: {"description": "Voice service not configured"},
    },
)
async def tts(
    text: str = Form(...),
    voice: str = Form(default=settings.SARVAM_DEFAULT_VOICE),
    language_code: str = Form(default=settings.SARVAM_DEFAULT_LANGUAGE),
) -> Response:
    """
    Convert text to speech.
    Returns raw WAV audio — play directly in browser via Audio API.
    """
    if not settings.SARVAM_API_KEY:
        raise HTTPException(503, detail="Voice service not configured — set SARVAM_API_KEY")

    if voice not in SARVAM_VOICES:
        raise HTTPException(
            400, detail=f"Unknown voice '{voice}'. Available: {list(SARVAM_VOICES.keys())}"
        )

    if len(text) > 5000:
        raise HTTPException(400, detail="Text too long (max 5,000 characters)")

    try:
        audio_bytes = await text_to_speech(
            text,
            language_code=language_code,
            speaker=voice,
            pace=settings.SARVAM_TTS_PACE,
            sample_rate=settings.SARVAM_TTS_SAMPLE_RATE,
        )
        return Response(
            content=audio_bytes,
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=mentor_response.wav"},
        )
    except Exception as e:
        logger.error("TTS failed: %s", e)
        raise HTTPException(502, detail="Text-to-speech failed — please try again")


@router.get("/voices")
async def list_voices() -> dict:
    """List available Sarvam voices."""
    return {"voices": SARVAM_VOICES, "default": settings.SARVAM_DEFAULT_VOICE}
