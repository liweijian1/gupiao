from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

CHINA_TIMEZONE = ZoneInfo("Asia/Shanghai")


def china_now(at: datetime | None = None) -> datetime:
    current = at or datetime.now(timezone.utc)
    return current.astimezone(CHINA_TIMEZONE)


def is_market_open(at: datetime | None = None) -> bool:
    """Phase 1 rule: weekday 09:00–15:00 uses live providers."""
    local = china_now(at)
    return local.weekday() < 5 and time(9, 0) <= local.time() < time(15, 0)


def current_trade_date(at: datetime | None = None) -> str:
    """Return the local China trading date used for same-day quote cache buckets.

    This intentionally uses the local calendar day instead of trying to infer
    exchange holidays. Weekend/holiday requests will not fetch live quotes, so
    cache readers can safely fall back to the latest available trading bucket.
    """
    return china_now(at).date().isoformat()


def previous_weekday_date(at: datetime | None = None) -> str:
    local_date = china_now(at).date() - timedelta(days=1)
    while local_date.weekday() >= 5:
        local_date -= timedelta(days=1)
    return local_date.isoformat()


def parse_quote_datetime(market_date: str | None, market_time: str | None, fetched_at: str | None = None) -> datetime | None:
    """Parse provider quote date/time in China timezone; fallback to fetched_at."""
    if market_date and market_time:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y%m%d %H:%M:%S", "%Y-%m-%d %H%M%S", "%Y%m%d %H%M%S"):
            try:
                return datetime.strptime(f"{market_date} {market_time}", fmt).replace(tzinfo=CHINA_TIMEZONE)
            except ValueError:
                continue
    if fetched_at:
        try:
            parsed = datetime.fromisoformat(fetched_at)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(CHINA_TIMEZONE)
        except ValueError:
            return None
    return None


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
