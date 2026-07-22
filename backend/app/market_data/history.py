from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any, Callable, Sequence

import pandas as pd

from ..akshare_client import load_akshare
from ..research.models import DailyBar


class HistoricalDataUnavailable(RuntimeError):
    """Raised when no requested A-share symbol produced usable daily history."""


@dataclass(frozen=True)
class HistoricalDataResult:
    bars: list[DailyBar]
    failures: dict[str, str]


_COLUMN_MAP = {
    "日期": "date",
    "开盘": "open",
    "最高": "high",
    "最低": "low",
    "收盘": "close",
    "成交量": "volume",
    "成交额": "amount",
}


def _normalize_frame(symbol: str, frame: Any, start_date: date, end_date: date) -> list[DailyBar]:
    normalized = pd.DataFrame(frame).rename(columns=_COLUMN_MAP).copy()
    required = ["date", "open", "high", "low", "close", "volume", "amount"]
    missing = [column for column in required if column not in normalized.columns]
    if missing:
        raise ValueError(f"missing columns: {', '.join(missing)}")
    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce").dt.date
    for column in required[1:]:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    normalized = normalized[
        normalized["date"].notna()
        & (normalized["date"] >= start_date)
        & (normalized["date"] <= end_date)
    ].dropna(subset=required)
    normalized = normalized[
        (normalized["open"] > 0)
        & (normalized["high"] > 0)
        & (normalized["low"] > 0)
        & (normalized["close"] > 0)
        & (normalized["volume"] >= 0)
        & (normalized["amount"] >= 0)
    ].drop_duplicates(subset=["date"], keep="last").sort_values("date")
    return [
        DailyBar(symbol=symbol, **row)
        for row in normalized[required].to_dict(orient="records")
    ]


def get_ashare_daily_history(
    tickers: Sequence[str],
    start_date: date,
    end_date: date,
    *,
    load_akshare: Callable[[], Any] = load_akshare,
) -> HistoricalDataResult:
    ak = load_akshare()
    bars: list[DailyBar] = []
    failures: dict[str, str] = {}
    for ticker in dict.fromkeys(ticker.strip().upper() for ticker in tickers if ticker.strip()):
        try:
            frame = ak.stock_zh_a_hist(
                symbol=ticker,
                period="daily",
                start_date=start_date.strftime("%Y%m%d"),
                end_date=end_date.strftime("%Y%m%d"),
                adjust="qfq",
            )
            bars.extend(_normalize_frame(ticker, frame, start_date, end_date))
        except Exception as exc:  # noqa: BLE001 - report each failed provider request.
            failures[ticker] = str(exc)
    if not bars:
        raise HistoricalDataUnavailable("No A-share daily history is available for the requested symbols")
    return HistoricalDataResult(
        bars=sorted(bars, key=lambda item: (item.symbol, item.date)),
        failures=failures,
    )
