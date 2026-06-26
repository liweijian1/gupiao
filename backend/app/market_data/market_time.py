from __future__ import annotations

from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo

CHINA_TIMEZONE = ZoneInfo("Asia/Shanghai")


def china_now(at: datetime | None = None) -> datetime:
    current = at or datetime.now(timezone.utc)
    return current.astimezone(CHINA_TIMEZONE)


def is_market_open(at: datetime | None = None) -> bool:
    """Phase 1 rule: weekday 09:00–15:00 uses live providers."""
    local = china_now(at)
    return local.weekday() < 5 and time(9, 0) <= local.time() < time(15, 0)


def market_status(at: datetime | None = None) -> str:
    local = china_now(at)
    if local.weekday() >= 5:
        return "weekend"
    current = local.time()
    if current < time(9, 0):
        return "before_open"
    if time(9, 0) <= current < time(9, 30):
        return "pre_market"
    if time(9, 30) <= current < time(11, 30):
        return "open"
    if time(11, 30) <= current < time(13, 0):
        return "lunch_break"
    if time(13, 0) <= current < time(15, 0):
        return "open"
    return "after_close"
