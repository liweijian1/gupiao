from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


REALTIME_PROVIDER_PRIORITY = [
    "akshare_em",
    "sina",
    "tencent",
    "realtime_cache",
    "baostock_snapshot",
]


@dataclass
class UnifiedQuote:
    ticker: str
    name: str | None = None
    price: float | None = None
    chg: float | None = None
    change_amount: float | None = None

    open: float | None = None
    high: float | None = None
    low: float | None = None
    previous_close: float | None = None

    volume: float | None = None
    amount: float | None = None
    turnover: float | None = None

    provider: str = "unknown"
    source: str = "unknown"
    market_date: str | None = None
    market_time: str | None = None

    fetched_at: str | None = None
    provider_timestamp: str | None = None
    is_stale: bool | None = None
    stale_seconds: int | None = None
    fallback_from: str | None = None
    raw: dict[str, Any] | None = field(default=None, repr=False)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload.pop("raw", None)
        return {key: value for key, value in payload.items() if value is not None}


@dataclass
class SourceChainEntry:
    provider: str
    result: str
    duration_ms: int
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = {"provider": self.provider, "result": self.result, "duration_ms": self.duration_ms}
        if self.error:
            payload["error"] = self.error
        return payload
