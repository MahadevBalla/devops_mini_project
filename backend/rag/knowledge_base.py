"""
rag/knowledge_base.py
Lightweight RAG for the chat endpoint via HuggingFace Inference API.
- Indexes 7 curated India finance markdown documents at startup.
- query() returns top-k contextually relevant chunks for a user question.
- No LangChain, no FAISS, no heavy local ML deps. Embeddings' model can be set via core/config.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Optional

import numpy as np
from huggingface_hub import InferenceClient
from huggingface_hub.errors import HfHubHTTPError

from core.config import settings

logger = logging.getLogger(__name__)

_DOCS_DIR = Path(__file__).parent / "documents"
_MIN_CHUNK_LEN = 80
_BATCH_SIZE = 32

_chunks: list[str] = []
_embeddings: Optional[np.ndarray] = None  # shape: (n_chunks, embedding_dim), L2-normalised
_lock = threading.Lock()


def _embed_via_hf(texts: list[str]) -> Optional[np.ndarray]:
    """
    Call HuggingFace InferenceClient to get sentence embeddings.

    Returns L2-normalised (n, 384) float32 array, or None on any failure.
    InferenceClient handles cold-start (503) and retries automatically.
    """
    if not settings.HF_TOKEN:
        return None

    try:
        client = InferenceClient(
            model=settings.HF_RAG_MODEL,
            token=settings.HF_TOKEN,
            timeout=120,
        )
        all_vecs: list[list[float]] = []

        for i in range(0, len(texts), _BATCH_SIZE):
            batch = texts[i : i + _BATCH_SIZE]
            result = client.feature_extraction(batch)
            all_vecs.extend(result)

        arr = np.array(all_vecs, dtype=np.float32)
        # L2 normalise so cosine similarity reduces to a dot product
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        return arr / norms

    except HfHubHTTPError as exc:
        logger.warning("HF API HTTP error: %s — RAG disabled", exc)
        return None
    except Exception as exc:
        logger.warning("HF embedding call failed: %s — RAG disabled", exc)
        return None


def build_index() -> None:
    """
    Build in-memory embedding index from all .md files in rag/documents/.
    Called once at app startup. Double-checked lock prevents duplicate builds.
    No-op and silent if HF_TOKEN is absent or API is unreachable.
    """
    global _embeddings, _chunks

    if _embeddings is not None:
        return

    with _lock:
        if _embeddings is not None:
            return

        _chunks = []

        if not _DOCS_DIR.exists():
            logger.warning("RAG documents directory not found: %s — chat RAG disabled.", _DOCS_DIR)
            return

        files = sorted(_DOCS_DIR.glob("*.md"))
        for md_file in files:
            doc_title = md_file.stem.replace("_", " ").title()
            content = md_file.read_text(encoding="utf-8")
            raw_chunks = [
                c.strip() for c in content.split("\n\n") if len(c.strip()) >= _MIN_CHUNK_LEN
            ]
            for chunk in raw_chunks:
                _chunks.append(f"[Source: {doc_title}]\n{chunk}")

        if not _chunks:
            logger.warning("No RAG chunks loaded — chat RAG disabled.")
            return

        if not settings.HF_TOKEN:
            logger.warning(
                "HF_TOKEN not set — RAG embeddings disabled. "
                "Set HF_TOKEN in .env to enable context-aware chat. "
                "Chat will still work, just without document retrieval."
            )
            _chunks = []
            return

        logger.info("Building RAG index: %d chunks via HF InferenceClient...", len(_chunks))
        emb = _embed_via_hf(_chunks)

        if emb is None:
            logger.warning("RAG index build failed — chat running without RAG.")
            _chunks = []
            return

        _embeddings = emb
        logger.info(
            "RAG index ready: %d chunks × %d dim (via HF API).",
            len(_chunks),
            _embeddings.shape[1],
        )


def query(question: str, top_k: int = 2) -> str:
    """
    Return top_k most relevant chunks for the question, joined by separator.
    Returns empty string if index not built (graceful degradation).
    """
    if _embeddings is None or not _chunks:
        return ""

    q_emb = _embed_via_hf([question])
    if q_emb is None:
        return ""

    # Cosine similarity via dot product — both sides are L2-normalised
    scores = (_embeddings @ q_emb[0]).ravel()
    indices = np.argsort(scores)[::-1][:top_k]

    results = [_chunks[i] for i in indices if 0 <= i < len(_chunks)]
    return "\n\n---\n\n".join(results)
