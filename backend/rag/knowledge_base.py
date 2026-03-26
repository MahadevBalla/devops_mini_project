"""
rag/knowledge_base.py
Lightweight FAISS-based RAG for the chat endpoint.
- Indexes 7 curated India finance markdown documents at startup.
- query() returns top-k contextually relevant chunks for a user question.
- No LangChain. No external vector DB. ~90 lines.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2" # BAAI/bge-small-en-v1.5 (~33MB) | BAAI/bge-base-en-v1.5 (~100MB) | BAAI/bge-large-en-v1.5 (~335MB)
_DOCS_DIR = Path(__file__).parent / "documents"
_MIN_CHUNK_LEN = 80

_model: SentenceTransformer | None = None
_index: faiss.Index | None = None
_chunks: list[str] = []
_lock = threading.Lock()


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info("Loading sentence-transformer model: %s", _MODEL_NAME)
        _model = SentenceTransformer(_MODEL_NAME)
    return _model


def build_index() -> None:
    """
    Build FAISS index from all .md files in rag/documents/.
    Called once at app startup. Double-checked locking prevents redundant builds
    under concurrent startup (e.g. uvicorn --workers > 1).
    Uses Anthropic-style contextual chunking: each chunk prefixed with doc title.
    """
    global _index, _chunks

    if _index is not None:
        return

    with _lock:
        if _index is not None:
            return

        _chunks = []

        if not _DOCS_DIR.exists():
            logger.warning("RAG documents directory not found: %s — chat RAG disabled.", _DOCS_DIR)
            return

        files = sorted(_DOCS_DIR.glob("*.md"))
        for md_file in files:
            doc_title = md_file.stem.replace("_", " ").title()
            content = md_file.read_text(encoding="utf-8")
            raw_chunks = [c.strip() for c in content.split("\n\n") if len(c.strip()) >= _MIN_CHUNK_LEN]
            for chunk in raw_chunks:
                _chunks.append(f"[Source: {doc_title}]\n{chunk}")

        if not _chunks:
            logger.warning("No RAG chunks loaded — chat RAG disabled.")
            return

        model = _get_model()
        embeddings = model.encode(_chunks, convert_to_numpy=True, show_progress_bar=False)
        embeddings = embeddings.astype(np.float32)
        faiss.normalize_L2(embeddings)

        _index = faiss.IndexFlatIP(embeddings.shape[1])
        _index.add(embeddings)
        logger.info("RAG index built: %d chunks from %d documents.", len(_chunks), len(files))


def query(question: str, top_k: int = 2) -> str:
    """
    Return top_k most relevant chunks for the question, joined by separator.
    Returns empty string if index not built (graceful degradation).
    """
    if _index is None or not _chunks:
        return ""

    model = _get_model()
    q_emb = model.encode([question], convert_to_numpy=True).astype(np.float32)
    faiss.normalize_L2(q_emb)
    _, indices = _index.search(q_emb, top_k)

    results = [_chunks[i] for i in indices[0] if 0 <= i < len(_chunks)]
    return "\n\n---\n\n".join(results)
