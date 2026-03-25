"""
core/voice.py
Sarvam AI voice client.
  - STT: Saaras API — speech → text (supports 10+ Indian languages + Hinglish)
  - TTS: Bulbul v2 API — text → speech (Indian English / Hindi voices)

API docs: https://docs.sarvam.ai
"""
from __future__ import annotations

import base64
import logging

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

_SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
_SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# Supported voices for Bulbul
SARVAM_VOICES = {
    "meera": "Female, Indian English — warm and clear",
    "pavithra": "Female, Hindi — natural and friendly",
    "maitreyi": "Female, Hindi — professional",
    "arvind": "Male, Indian English — confident",
    "amol": "Male, Hindi — conversational",
    "amartya": "Male, Hindi — neutral",
}

DEFAULT_VOICE = "meera"
DEFAULT_LANGUAGE = "en-IN"


async def speech_to_text(
    audio_bytes: bytes,
    *,
    language_code: str = "en-IN",
    model: str = "saaras:v1",
) -> str:
    """
    Convert audio bytes to text via Sarvam Saaras STT API.
    Supports WAV, MP3, OGG. Language auto-detected if not specified.
    Raises httpx.HTTPStatusError on API error.
    """
    if not settings.SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY not configured")

    files = {
        "file": ("audio.wav", audio_bytes, "audio/wav"),
        "language_code": (None, language_code),
        "model": (None, model),
    }
    headers = {"api-subscription-key": settings.SARVAM_API_KEY}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_SARVAM_STT_URL, files=files, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data.get("transcript", "")


async def text_to_speech(
    text: str,
    *,
    language_code: str = DEFAULT_LANGUAGE,
    speaker: str = DEFAULT_VOICE,
    model: str = "bulbul:v1",
    pace: float = 1.0,
    pitch: float = 0.0,
    loudness: float = 1.5,
    sample_rate: int = 22050,
) -> bytes:
    """
    Convert text to speech via Sarvam Bulbul TTS API.
    Returns raw WAV audio bytes.
    Text is chunked if > 500 chars (Sarvam API limit per request).
    """
    if not settings.SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY not configured")

    # Chunk text to stay under API limit
    chunks = _chunk_text(text, max_chars=490)
    all_audio = b""

    headers = {
        "api-subscription-key": settings.SARVAM_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        for chunk in chunks:
            payload = {
                "inputs": [chunk],
                "target_language_code": language_code,
                "speaker": speaker,
                "model": model,
                "pace": pace,
                "pitch": pitch,
                "loudness": loudness,
                "speech_sample_rate": sample_rate,
                "enable_preprocessing": True,
            }
            resp = await client.post(_SARVAM_TTS_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            # Sarvam returns base64-encoded audio
            audio_b64 = data.get("audios", [""])[0]
            if audio_b64:
                all_audio += base64.b64decode(audio_b64)

    return all_audio


def _chunk_text(text: str, max_chars: int = 490) -> list[str]:
    """Split text at sentence boundaries to stay under max_chars."""
    if len(text) <= max_chars:
        return [text]

    chunks = []
    current = ""
    for sentence in _split_sentences(text):
        if len(current) + len(sentence) <= max_chars:
            current += sentence
        else:
            if current:
                chunks.append(current.strip())
            current = sentence
    if current.strip():
        chunks.append(current.strip())
    return chunks or [text[:max_chars]]


def _split_sentences(text: str) -> list[str]:
    import re
    return re.split(r"(?<=[.!?।])\s+", text)
