"""
finance/amfi.py
AMFI NAV fetcher — live NAV data from AMFI India's free official feed.
URL: https://portal.amfiindia.com/spages/NAVAll.txt

Actual column layout (semicolon-delimited):
    parts[0]  Scheme Code
    parts[1]  ISIN Div Payout / ISIN Growth   ← primary tradeable ISIN
    parts[2]  ISIN Div Reinvestment            ← secondary / reinvestment ISIN
    parts[3]  Scheme Name
    parts[4]  Net Asset Value
    parts[5]  Date

Null sentinel in real data: "-" (not "N.A.") — both are handled.
Cache: in-memory, 24h TTL — fetched once at startup, refreshed daily.
"""

from __future__ import annotations

import logging
from datetime import UTC, date, datetime, timedelta
from typing import Optional

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

_CACHE_TTL = timedelta(hours=24)

# In-memory cache — module-level singletons
_nav_by_isin: dict[str, float] = {}
_nav_by_name: dict[str, float] = {}  # lowercase scheme name → NAV
_cache_fetched_at: Optional[datetime] = None

# Values AMFI uses to indicate a missing/inapplicable ISIN
_NULL_ISIN = {"-", "N.A.", "n.a.", ""}


def _is_cache_fresh() -> bool:
    if _cache_fetched_at is None:
        return False
    return datetime.now(UTC) - _cache_fetched_at < _CACHE_TTL


def _parse_date(date_str: str) -> Optional[date]:
    """Parse AMFI date string '%d-%b-%Y'. Returns None on failure."""
    try:
        return datetime.strptime(date_str.strip(), "%d-%b-%Y").date()
    except ValueError:
        return None


def _find_latest_date(lines: list[str]) -> Optional[date]:
    """Pass 1 — scan all data rows to find the most recent NAV date."""
    latest: Optional[date] = None
    for line in lines:
        parts = line.strip().split(";")
        if len(parts) < 6:
            continue
        row_date = _parse_date(parts[5])
        if row_date and (latest is None or row_date > latest):
            latest = row_date
    return latest


def _is_stale(date_str: str, latest_date: date) -> bool:
    """Return True if the row's date is more than 2 days behind the latest."""
    row_date = _parse_date(date_str)
    if row_date is None:
        return True  # unparseable date → treat as stale, skip
    return (latest_date - row_date).days > 2


def _index_row(
    parts: list[str],
    isin_map: dict[str, float],
    name_map: dict[str, float],
) -> None:
    """Index a single valid data row into isin_map and name_map."""
    isin_primary = parts[1].strip()
    isin_secondary = parts[2].strip()
    scheme_name = parts[3].strip()

    try:
        nav = float(parts[4].strip())
    except ValueError:
        return  # blank or non-numeric NAV — fund not priced today

    if isin_primary not in _NULL_ISIN:
        isin_map[isin_primary] = nav
    if isin_secondary not in _NULL_ISIN:
        isin_map[isin_secondary] = nav
    if scheme_name:
        name_map[scheme_name.lower()] = nav


def _parse_nav_text(text: str) -> None:
    """
    Parse NAVAll.txt into _nav_by_isin and _nav_by_name dicts.
    Stale rows (>2 days behind latest date in feed) are filtered out,
    excluding historical/inactive scheme rows like 2017 bonus plans.
    """
    global _nav_by_isin, _nav_by_name

    lines = text.splitlines()
    latest_date = _find_latest_date(lines)

    if latest_date is None:
        logger.warning("AMFI feed: could not determine latest date — skipping stale filter")

    isin_map: dict[str, float] = {}
    name_map: dict[str, float] = {}

    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = line.split(";")
        if len(parts) < 6:
            continue  # section header, AMC name line, or malformed row
        if latest_date and _is_stale(parts[5], latest_date):
            continue
        _index_row(parts, isin_map, name_map)

    _nav_by_isin = isin_map
    _nav_by_name = name_map
    logger.info(
        "AMFI NAV cache loaded: %d ISINs, %d scheme names (latest date: %s)",
        len(isin_map),
        len(name_map),
        latest_date,
    )


async def _fetch_and_cache() -> None:
    """Fetch NAVAll.txt from AMFI and populate the in-memory cache."""
    global _cache_fetched_at
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(settings.AMFI_NAV_URL)
            resp.raise_for_status()
        _parse_nav_text(resp.text)
        _cache_fetched_at = datetime.now(UTC)
    except Exception as e:
        logger.warning("AMFI NAV fetch failed: %s — live NAV unavailable, using fallback", e)


async def ensure_nav_cache() -> None:
    """
    Ensure the NAV cache is populated and fresh.
    Call once at startup; subsequent calls are no-ops until TTL expires.
    """
    if not _is_cache_fresh():
        await _fetch_and_cache()


def get_nav_by_isin(isin: str) -> Optional[float]:
    return _nav_by_isin.get(isin)


def get_nav_by_name(scheme_name: str) -> Optional[float]:
    """Exact lowercase match first, then 30-char prefix fallback."""
    key = scheme_name.lower().strip()
    if key in _nav_by_name:
        return _nav_by_name[key]
    prefix = key[:30]
    for name, nav in _nav_by_name.items():
        if name.startswith(prefix):
            return nav
    return None


def enrich_holding_nav(isin: str, scheme_name: str, fallback_nav: float) -> float:
    """
    Return live NAV for a holding.
    Priority: ISIN match → name match → fallback (avg_nav from statement).
    Always returns a valid float — never raises.
    """
    live = get_nav_by_isin(isin) or get_nav_by_name(scheme_name)
    return live if live else fallback_nav
