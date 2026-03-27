"""
routers/mf_xray.py
POST /api/mf-xray — MF Portfolio X-Ray.
Accepts CAMS/KFintech CSV or PDF consolidated statement.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from agents.guardrail_agent import run_guardrail
from agents.mf_xray_agent import generate_mf_xray_advice
from core.dependencies import get_current_user
from core.exceptions import MoneyMentorError
from db.session_store import User, append_log, create_session, update_session_state
from finance.amfi import ensure_nav_cache
from finance.mf_xray import (
    analyse_portfolio,
    csv_rows_to_holdings,
    parse_cams_csv,
    parse_cams_pdf,
    parse_pdf_holdings,
)
from models.api_responses import ErrorResponse, MFXRayResponse
from models.mf_xray import MFHolding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["mf-xray"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_EXTENSIONS = {".csv", ".pdf"}
_ALLOWED_MIMETYPES = {
    "text/csv",
    "text/plain",
    "application/csv",
    "application/pdf",
    "application/octet-stream",
}

# PDF magic bytes: every valid PDF starts with %PDF
_PDF_MAGIC = b"%PDF"


@router.post(
    "/mf-xray",
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        415: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def mf_xray(
    file: UploadFile = File(..., description="CAMS or KFintech consolidated CSV/PDF statement"),
    current_user: User = Depends(get_current_user),
) -> MFXRayResponse:
    session_id = await create_session(current_user.id, "mf_xray")
    decision_log: list[dict] = []

    # Ensure AMFI cache is warm — no-op if already fresh from startup
    await ensure_nav_cache()

    # Layer 1: extension check
    # Catches obviously wrong file types before we read any bytes
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            415,
            detail={
                "error": f"Unsupported file type '{ext}'. Upload a .csv or .pdf statement.",
                "code": "INVALID_FILE_TYPE",
            },
        )

    # Layer 2: MIME type check
    # Rejects clients that send an obviously wrong Content-Type header
    # application/octet-stream is permitted because many browsers send it
    # for CSVs; the extension + magic-byte checks are the real gates
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type and content_type not in _ALLOWED_MIMETYPES:
        raise HTTPException(
            415,
            detail={
                "error": f"Unexpected Content-Type '{content_type}'. Expected text/csv or application/pdf.",
                "code": "INVALID_MIME_TYPE",
            },
        )

    content = await file.read()
    if len(content) > _MAX_FILE_SIZE:
        raise HTTPException(
            413,
            detail={"error": "File too large (max 10 MB)", "code": "FILE_TOO_LARGE"},
        )

    # Layer 3: magic-byte check for PDFs
    # Catches a .pdf file that is actually a binary executable or ZIP;
    # those will not start with %PDF regardless of their extension
    # CSVs have no reliable magic bytes, so we trust the extension for them.
    if ext == ".pdf" and not content.startswith(_PDF_MAGIC):
        raise HTTPException(
            400,
            detail={
                "error": "File does not appear to be a valid PDF (missing %PDF header).",
                "code": "INVALID_FILE",
            },
        )

    try:
        # Step 1: Parse
        holdings: list[MFHolding] = []

        if ext == ".csv":
            rows = parse_cams_csv(content)
            holdings = csv_rows_to_holdings(rows)
        else:
            # ext == ".pdf" — already magic-byte validated above
            text = parse_cams_pdf(content)
            holdings = parse_pdf_holdings(text)

        if not holdings:
            raise HTTPException(
                400,
                detail={
                    "error": "No fund holdings found. Upload a CAMS or KFintech consolidated statement.",
                    "code": "PARSE_ERROR",
                },
            )

        decision_log.append(
            await append_log(
                session_id,
                "Parser",
                "Statement parsed",
                {"filename": filename, "size_kb": len(content) // 1024},
                {"holdings_found": len(holdings)},
            )
        )

        # Step 2: Finance Engine
        result = analyse_portfolio(holdings)
        decision_log.append(
            await append_log(
                session_id,
                "FinanceEngine",
                "Portfolio analysed",
                {"holdings_count": len(holdings)},
                {
                    "total_invested": result.total_invested,
                    "absolute_return_pct": result.absolute_return_pct,
                    "overlap_pairs": len(result.overlapping_pairs),
                    "xirr_vs_benchmark": result.xirr_vs_benchmark,
                },
            )
        )

        # Step 3: LLM Advice
        advice = await generate_mf_xray_advice(result)
        decision_log.append(
            await append_log(
                session_id,
                "MentorAgent",
                "MF X-Ray advice generated",
                {"funds": len(holdings)},
                {"actions_count": len(advice.key_actions)},
            )
        )

        # Step 4: Guardrail
        ref_numbers = {
            "total_invested": result.total_invested,
            "total_current_value": result.total_current_value,
            "absolute_return_pct": result.absolute_return_pct,
        }
        advice, issues = await run_guardrail(advice, ref_numbers)
        decision_log.append(
            await append_log(
                session_id,
                "GuardrailAgent",
                "Compliance check",
                {"advice_summary": advice.summary[:100]},
                {"status": "MODIFIED" if issues else "PASS", "issues": issues},
            )
        )

        await update_session_state(
            session_id,
            current_user.id,
            "mf",
            {
                "total_invested": result.total_invested,
                "total_current_value": result.total_current_value,
                "absolute_return_pct": result.absolute_return_pct,
                "overall_xirr": result.overall_xirr,
                "benchmark_base": result.benchmark_base,
                "xirr_vs_benchmark": result.xirr_vs_benchmark,
                "num_funds": len(result.holdings),
                "high_expense_funds": result.high_expense_funds,
            },
        )

        return MFXRayResponse(
            session_id=session_id,
            result=result,
            advice=advice,
            decision_log=decision_log,
        )

    except HTTPException:
        raise
    except MoneyMentorError as e:
        raise HTTPException(500, detail={"error": e.message, "code": e.code})
    except Exception as e:
        logger.exception("Unexpected error in mf_xray")
        raise HTTPException(500, detail={"error": str(e), "code": "INTERNAL_ERROR"})
