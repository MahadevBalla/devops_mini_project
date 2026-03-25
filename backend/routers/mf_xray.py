"""
routers/mf_xray.py
POST /api/mf-xray — MF Portfolio X-Ray.
Accepts CAMS/KFintech CSV or PDF consolidated statement.
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from agents.guardrail_agent import run_guardrail
from agents.mf_xray_agent import generate_mf_xray_advice
from core.exceptions import MoneyMentorError
from db.session_store import append_log, create_session
from finance.mf_xray import (
    _infer_category,
    _parse_pdf_holdings,
    analyse_portfolio,
    parse_cams_csv,
    parse_cams_pdf,
)
from models.schemas import ErrorResponse, MFHolding, MFXRayResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["mf-xray"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Previously only file size was checked; a renamed .exe passed through silently.
_ALLOWED_EXTENSIONS = {".csv", ".pdf"}

# Browser/OS MIME types vary — application/octet-stream is the generic binary
# fallback many clients send for CSVs, so we permit it and rely on extension +
# magic-byte checks as the real enforcement layer.
_ALLOWED_MIMETYPES = {
    "text/csv",
    "text/plain",
    "application/csv",
    "application/pdf",
    "application/octet-stream",  # generic fallback — extension check is the gate
}

# PDF magic bytes: every valid PDF starts with %PDF
_PDF_MAGIC = b"%PDF"


def _extract_float(row: dict, keys: list[str], default: str = "0") -> float:
    """Extract and convert a float value from row using fallback keys."""
    value = next((row.get(key) for key in keys if row.get(key)), default)
    return float(str(value).replace(",", ""))


def _extract_string(row: dict, keys: list[str], default: str = "") -> str:
    """Extract a string value from row using fallback keys."""
    return next((row.get(key) for key in keys if row.get(key)), default)


def _csv_rows_to_holdings(rows: list[dict]) -> list[MFHolding]:
    """Convert normalised CAMS CSV rows → MFHolding objects."""
    holdings: list[MFHolding] = []
    for row in rows:
        try:
            scheme = _extract_string(row, ["scheme_name", "scheme", "fund_name"], "Unknown Fund")
            isin = _extract_string(row, ["isin", "isin_div_reinv_flag"], f"UNKNOWN_{len(holdings)}")
            units = _extract_float(row, ["closing_unit_balance", "units"])
            avg_nav = _extract_float(row, ["average_cost", "avg_nav", "purchase_nav"])
            current_nav = _extract_float(row, ["nav", "current_nav"], str(avg_nav))
            invested = _extract_float(row, ["cost_value", "invested_amount"])
            current = _extract_float(row, ["market_value", "current_value"])

            expense_ratio_raw = _extract_float(
                row, ["expense_ratio", "ter", "expense_ratio_%"], "0"
            )
            expense_ratio = expense_ratio_raw if expense_ratio_raw > 0 else None

            if units == 0 and invested == 0:
                continue

            current_nav = current_nav if current_nav > 0 else avg_nav
            current_value = current if current > 0 else units * current_nav

            holdings.append(
                MFHolding(
                    scheme_name=scheme,
                    isin=isin,
                    units=units,
                    avg_nav=avg_nav,
                    current_nav=current_nav,
                    invested_amount=invested,
                    current_value=current_value,
                    category=_infer_category(scheme),
                    expense_ratio=expense_ratio,
                )
            )
        except (ValueError, KeyError):
            continue
    return holdings


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
) -> MFXRayResponse:
    session_id = await create_session("mf_xray")
    decision_log: list[dict] = []

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
            holdings = _csv_rows_to_holdings(rows)
        else:
            # ext == ".pdf" — already magic-byte validated above
            text = parse_cams_pdf(content)
            holdings = _parse_pdf_holdings(text)

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
