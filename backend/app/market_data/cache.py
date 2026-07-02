from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any

from ..config import CACHE_DIR
from .market_time import current_trade_date, parse_quote_datetime
from .types import UnifiedQuote

STOCK_SNAPSHOT_PATH = CACHE_DIR / "stock_snapshot.json"
REALTIME_QUOTES_PATH = CACHE_DIR / "realtime_quotes.json"
STOCK_NAMES_PATH = CACHE_DIR / "stock_names.json"
PROVIDER_HEALTH_PATH = CACHE_DIR / "provider_health.json"

MEMORY_TTL = timedelta(seconds=5)
REALTIME_CACHE_SCHEMA_VERSION = 2
_MEMORY_LOCK = RLock()
_MEMORY_QUOTES: dict[str, dict[str, Any]] = {}
_DISK_LOCK = RLock()


def _ensure_cache_dir() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _read_json(path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _write_json(path, payload: dict[str, Any]) -> None:
    _ensure_cache_dir()
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def _quote_from_row(row: dict[str, Any] | None) -> UnifiedQuote | None:
    if not row:
        return None
    return UnifiedQuote(**{key: row.get(key) for key in UnifiedQuote.__dataclass_fields__ if key in row})


def _quote_timestamp(row: dict[str, Any] | None) -> datetime | None:
    if not row:
        return None
    return parse_quote_datetime(row.get("market_date"), row.get("market_time"), row.get("fetched_at"))


def _empty_realtime_payload() -> dict[str, Any]:
    return {
        "schema_version": REALTIME_CACHE_SCHEMA_VERSION,
        "trading_days": {},
        "latest_by_symbol": {},
        "quotes": {},
        "updated_at": None,
    }


def _normalize_realtime_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    normalized = _empty_realtime_payload()
    if not payload:
        return normalized

    normalized.update({key: value for key, value in payload.items() if key not in {"trading_days", "latest_by_symbol", "quotes"}})
    normalized["schema_version"] = REALTIME_CACHE_SCHEMA_VERSION
    normalized["trading_days"] = payload.get("trading_days") or {}
    normalized["latest_by_symbol"] = payload.get("latest_by_symbol") or {}
    normalized["quotes"] = payload.get("quotes") or {}

    # Backfill legacy flat quotes into date buckets so old cache files remain
    # readable after the schema upgrade.
    for symbol, row in list(normalized["quotes"].items()):
        if not isinstance(row, dict):
            continue
        parsed_at = parse_quote_datetime(row.get("market_date"), row.get("market_time"), row.get("fetched_at"))
        trade_date = row.get("market_date") or (parsed_at.date().isoformat() if parsed_at else current_trade_date())
        day = normalized["trading_days"].setdefault(trade_date, {"quotes": {}, "updated_at": None})
        existing = day["quotes"].get(symbol)
        if existing is None or _is_newer_quote(row, existing):
            day["quotes"][symbol] = row
            day["updated_at"] = max(
                filter(None, [day.get("updated_at"), row.get("fetched_at"), payload.get("updated_at")]),
                default=None,
            )
        latest = normalized["latest_by_symbol"].get(symbol)
        if latest is None or _is_newer_quote(row, _row_for_latest_ref(normalized, latest)):
            normalized["latest_by_symbol"][symbol] = {
                "trade_date": trade_date,
                "market_time": row.get("market_time"),
                "updated_at": row.get("fetched_at") or payload.get("updated_at"),
            }

    return normalized


def _row_for_latest_ref(payload: dict[str, Any], ref: dict[str, Any] | None) -> dict[str, Any] | None:
    if not ref:
        return None
    trade_date = ref.get("trade_date")
    symbol = ref.get("symbol")
    if not symbol:
        for candidate, candidate_ref in payload.get("latest_by_symbol", {}).items():
            if candidate_ref is ref:
                symbol = candidate
                break
    if not trade_date or not symbol:
        return None
    return payload.get("trading_days", {}).get(trade_date, {}).get("quotes", {}).get(symbol)


def _is_newer_quote(candidate: dict[str, Any], current: dict[str, Any] | None) -> bool:
    if not current:
        return True
    candidate_ts = _quote_timestamp(candidate)
    current_ts = _quote_timestamp(current)
    if candidate_ts and current_ts:
        return candidate_ts >= current_ts
    if candidate_ts:
        return True
    if current_ts:
        return False
    return str(candidate.get("fetched_at", "")) >= str(current.get("fetched_at", ""))


def read_stock_snapshot() -> dict[str, Any] | None:
    return _read_json(STOCK_SNAPSHOT_PATH)


def write_stock_snapshot(snapshot: dict[str, Any]) -> None:
    _write_json(STOCK_SNAPSHOT_PATH, snapshot)


def read_realtime_quotes_file() -> dict[str, Any] | None:
    payload = _read_json(REALTIME_QUOTES_PATH)
    if not payload:
        return None
    return _normalize_realtime_payload(payload)


def write_realtime_quote(symbol: str, quote: UnifiedQuote) -> None:
    now = datetime.now(timezone.utc).isoformat()
    row = quote.to_dict()
    row["fetched_at"] = row.get("fetched_at") or now
    trade_date = row.get("market_date") or current_trade_date()
    row["market_date"] = trade_date

    with _DISK_LOCK:
        payload = read_realtime_quotes_file() or _empty_realtime_payload()
        day = payload["trading_days"].setdefault(trade_date, {"quotes": {}, "updated_at": None})
        current = day["quotes"].get(symbol)
        if current is not None and not _is_newer_quote(row, current):
            return

        day["quotes"][symbol] = row
        day["updated_at"] = now
        payload["quotes"][symbol] = row
        payload["latest_by_symbol"][symbol] = {
            "trade_date": trade_date,
            "market_time": row.get("market_time"),
            "updated_at": row.get("fetched_at"),
        }
        payload["updated_at"] = now
        payload["schema_version"] = REALTIME_CACHE_SCHEMA_VERSION
        _write_json(REALTIME_QUOTES_PATH, payload)


def read_realtime_quote_file(symbol: str) -> UnifiedQuote | None:
    return read_latest_realtime_quote(symbol)


def read_today_realtime_quote(symbol: str, at: datetime | None = None) -> UnifiedQuote | None:
    payload = read_realtime_quotes_file()
    if not payload:
        return None
    trade_date = current_trade_date(at)
    row = payload.get("trading_days", {}).get(trade_date, {}).get("quotes", {}).get(symbol)
    return _quote_from_row(row)


def read_latest_realtime_quote(symbol: str) -> UnifiedQuote | None:
    payload = read_realtime_quotes_file()
    if not payload:
        return None

    ref = payload.get("latest_by_symbol", {}).get(symbol)
    if ref:
        row = payload.get("trading_days", {}).get(ref.get("trade_date"), {}).get("quotes", {}).get(symbol)
        quote = _quote_from_row(row)
        if quote:
            return quote

    best_row: dict[str, Any] | None = None
    for day in payload.get("trading_days", {}).values():
        row = day.get("quotes", {}).get(symbol)
        if row and _is_newer_quote(row, best_row):
            best_row = row
    if best_row:
        return _quote_from_row(best_row)

    return _quote_from_row(payload.get("quotes", {}).get(symbol))


def read_memory_quote(symbol: str) -> dict[str, Any] | None:
    with _MEMORY_LOCK:
        cached = _MEMORY_QUOTES.get(symbol)
        if not cached:
            return None
        cached_at = datetime.fromisoformat(cached["updated_at"])
        if cached_at.tzinfo is None:
            cached_at = cached_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - cached_at >= MEMORY_TTL:
            return None
        return cached


def write_memory_quote(symbol: str, payload: dict[str, Any]) -> None:
    with _MEMORY_LOCK:
        _MEMORY_QUOTES[symbol] = payload


def read_stock_names() -> dict[str, Any]:
    return _read_json(STOCK_NAMES_PATH) or {}


def write_stock_name(symbol: str, entry: dict[str, Any]) -> None:
    names = read_stock_names()
    names[symbol] = entry
    _write_json(STOCK_NAMES_PATH, names)


def upsert_stock_names(entries: dict[str, dict[str, Any]]) -> None:
    names = read_stock_names()
    names.update(entries)
    _write_json(STOCK_NAMES_PATH, names)


def cache_status() -> dict[str, Any]:
    snapshot = read_stock_snapshot()
    realtime = read_realtime_quotes_file()
    names = read_stock_names()
    trading_days = realtime.get("trading_days", {}) if realtime else {}
    latest_quotes = realtime.get("latest_by_symbol", {}) if realtime else {}
    return {
        "stock_snapshot": {
            "exists": snapshot is not None,
            "updated_at": snapshot.get("updated_at") if snapshot else None,
            "count": len(snapshot.get("stocks", [])) if snapshot else 0,
        },
        "realtime_quotes": {
            "exists": realtime is not None,
            "updated_at": realtime.get("updated_at") if realtime else None,
            "count": len(latest_quotes),
            "trading_day_count": len(trading_days),
            "today_count": len(trading_days.get(current_trade_date(), {}).get("quotes", {})),
        },
        "stock_names": {
            "exists": bool(names),
            "updated_at": None,
            "count": len(names),
        },
    }
