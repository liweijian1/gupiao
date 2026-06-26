from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any

from ..config import CACHE_DIR
from .types import UnifiedQuote

STOCK_SNAPSHOT_PATH = CACHE_DIR / "stock_snapshot.json"
REALTIME_QUOTES_PATH = CACHE_DIR / "realtime_quotes.json"
STOCK_NAMES_PATH = CACHE_DIR / "stock_names.json"
PROVIDER_HEALTH_PATH = CACHE_DIR / "provider_health.json"

MEMORY_TTL = timedelta(seconds=5)
_MEMORY_LOCK = RLock()
_MEMORY_QUOTES: dict[str, dict[str, Any]] = {}


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


def read_stock_snapshot() -> dict[str, Any] | None:
    return _read_json(STOCK_SNAPSHOT_PATH)


def write_stock_snapshot(snapshot: dict[str, Any]) -> None:
    _write_json(STOCK_SNAPSHOT_PATH, snapshot)


def read_realtime_quotes_file() -> dict[str, Any] | None:
    return _read_json(REALTIME_QUOTES_PATH)


def write_realtime_quote(symbol: str, quote: UnifiedQuote) -> None:
    payload = read_realtime_quotes_file() or {"quotes": {}, "updated_at": None}
    payload["quotes"][symbol] = quote.to_dict()
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    _write_json(REALTIME_QUOTES_PATH, payload)


def read_realtime_quote_file(symbol: str) -> UnifiedQuote | None:
    payload = read_realtime_quotes_file()
    if not payload:
        return None
    row = payload.get("quotes", {}).get(symbol)
    if not row:
        return None
    return UnifiedQuote(**{key: row.get(key) for key in UnifiedQuote.__dataclass_fields__ if key in row})


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
    return {
        "stock_snapshot": {
            "exists": snapshot is not None,
            "updated_at": snapshot.get("updated_at") if snapshot else None,
            "count": len(snapshot.get("stocks", [])) if snapshot else 0,
        },
        "realtime_quotes": {
            "exists": realtime is not None,
            "updated_at": realtime.get("updated_at") if realtime else None,
            "count": len(realtime.get("quotes", {})) if realtime else 0,
        },
        "stock_names": {
            "exists": bool(names),
            "updated_at": None,
            "count": len(names),
        },
    }
