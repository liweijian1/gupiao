from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from .akshare_client import fetch_indicator
from .config import CACHE_DIR, SNAPSHOT_PATH
from .indicators import INDICATORS
from .scoring import build_fallback_series, build_snapshot


MAX_CACHE_AGE = timedelta(hours=12)


def read_cache() -> dict[str, Any] | None:
    if not SNAPSHOT_PATH.exists():
        return None
    with SNAPSHOT_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_cache(snapshot: dict[str, Any]) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with SNAPSHOT_PATH.open("w", encoding="utf-8") as file:
        json.dump(snapshot, file, ensure_ascii=False, indent=2)


def is_fresh(snapshot: dict[str, Any]) -> bool:
    updated_at = snapshot.get("updated_at")
    if not updated_at:
        return False
    try:
        updated = datetime.fromisoformat(updated_at)
    except ValueError:
        return False
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - updated < MAX_CACHE_AGE


def refresh_macro_snapshot() -> dict[str, Any]:
    series = []
    for indicator in INDICATORS:
        try:
            series.append(fetch_indicator(indicator))
        except Exception as exc:  # noqa: BLE001 - partial data is still useful.
            fallback = build_fallback_series()
            item = next(entry for entry in fallback if entry["key"] == indicator["key"])
            item["error"] = str(exc)
            series.append(item)

    snapshot = build_snapshot(series)
    write_cache(snapshot)
    return snapshot


def get_macro_snapshot(force_refresh: bool = False) -> dict[str, Any]:
    if not force_refresh:
        cached = read_cache()
        if cached and is_fresh(cached):
            return cached

    try:
        return refresh_macro_snapshot()
    except Exception as exc:  # noqa: BLE001 - API should remain available.
        cached = read_cache()
        if cached:
            cached["warning"] = f"refresh failed, returning cached snapshot: {exc}"
            return cached
        snapshot = build_snapshot(build_fallback_series())
        snapshot["warning"] = f"refresh failed, returning fallback snapshot: {exc}"
        write_cache(snapshot)
        return snapshot
