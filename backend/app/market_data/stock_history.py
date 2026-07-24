from __future__ import annotations

import calendar
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Callable

import pandas as pd

from ..akshare_client import load_akshare
from ..config import CACHE_DIR


RANGE_MONTHS = {"1M": 1, "3M": 3, "12M": 12, "3Y": 36}
ADJUSTMENTS = {"qfq", "none", "hfq"}

_COLUMN_MAP = {
    "日期": "date",
    "开盘": "open",
    "最高": "high",
    "最低": "low",
    "收盘": "close",
    "成交量": "volume",
    "成交额": "amount",
}


class StockHistoryUnavailable(RuntimeError):
    """Raised when the upstream provider cannot produce usable daily bars."""


class StockHistoryUnsupportedMarket(ValueError):
    """Raised when a request does not identify a supported A-share ticker."""


def _shift_months(value: date, months: int) -> date:
    zero_based_month = value.month - 1 - months
    year = value.year + zero_based_month // 12
    month = zero_based_month % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def date_range_for(range_key: str, end_date: date) -> tuple[date, date]:
    if range_key not in RANGE_MONTHS:
        raise ValueError(f"unsupported history range: {range_key}")
    return _shift_months(end_date, RANGE_MONTHS[range_key]), end_date


def _validate_request(symbol: str, range_key: str, adjust: str) -> str:
    ticker = str(symbol or "").strip().upper()
    if not ticker.isdigit() or len(ticker) != 6:
        raise StockHistoryUnsupportedMarket("历史图表暂仅支持六位 A 股代码")
    if range_key not in RANGE_MONTHS:
        raise ValueError(f"unsupported history range: {range_key}")
    if adjust not in ADJUSTMENTS:
        raise ValueError(f"unsupported history adjustment: {adjust}")
    return ticker


def _cache_path(cache_dir: Path, ticker: str, range_key: str, adjust: str, end_date: date) -> Path:
    return cache_dir / f"stock_history_{ticker}_{range_key}_{adjust}_{end_date.isoformat()}.json"


def _read_cache(cache_dir: Path, ticker: str, range_key: str, adjust: str, end_date: date) -> dict[str, Any] | None:
    path = _cache_path(cache_dir, ticker, range_key, adjust, end_date)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload.get("bars"), list) or not payload["bars"]:
        return None
    return payload


def _write_cache(cache_dir: Path, payload: dict[str, Any], end_date: date) -> None:
    cache_dir.mkdir(parents=True, exist_ok=True)
    path = _cache_path(cache_dir, payload["symbol"], payload["range"], payload["adjust"], end_date)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _normalize_history_frame(
    ticker: str,
    frame: Any,
    range_key: str,
    adjust: str,
    start_date: date,
    end_date: date,
) -> dict[str, Any]:
    normalized = pd.DataFrame(frame).rename(columns=_COLUMN_MAP).copy()
    required = ["date", "open", "high", "low", "close", "volume", "amount"]
    missing = [column for column in required if column not in normalized.columns]
    if missing:
        raise StockHistoryUnavailable(f"历史数据缺少字段：{', '.join(missing)}")

    normalized["date"] = pd.to_datetime(normalized["date"], errors="coerce").dt.date
    for column in required[1:]:
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    normalized = normalized.dropna(subset=required)
    normalized = normalized[
        (normalized["date"] >= start_date)
        & (normalized["date"] <= end_date)
        & (normalized["open"] > 0)
        & (normalized["high"] > 0)
        & (normalized["low"] > 0)
        & (normalized["close"] > 0)
        & (normalized["volume"] >= 0)
        & (normalized["amount"] >= 0)
        & (normalized["high"] >= normalized[["open", "close", "low"]].max(axis=1))
        & (normalized["low"] <= normalized[["open", "close", "high"]].min(axis=1))
    ].drop_duplicates(subset=["date"], keep="last").sort_values("date")
    if normalized.empty:
        raise StockHistoryUnavailable("未获取到有效的 A 股历史行情")

    bars = [
        {
            "date": row["date"].isoformat(),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"]),
            "amount": float(row["amount"]),
        }
        for row in normalized[required].to_dict(orient="records")
    ]
    return {
        "symbol": ticker,
        "range": range_key,
        "adjust": adjust,
        "source": "akshare",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "warning": None,
        "bars": bars,
    }


def get_stock_history(
    symbol: str,
    range_key: str = "12M",
    adjust: str = "qfq",
    *,
    today: date | None = None,
    load_akshare: Callable[[], Any] | None = None,
    cache_dir: Path = CACHE_DIR,
) -> dict[str, Any]:
    ticker = _validate_request(symbol, range_key, adjust)
    end_date = today or date.today()
    start_date, end_date = date_range_for(range_key, end_date)
    cache_dir = Path(cache_dir)
    cached = _read_cache(cache_dir, ticker, range_key, adjust, end_date)
    provider_loader = load_akshare or globals()["load_akshare"]

    try:
        frame = provider_loader().stock_zh_a_hist(
            symbol=ticker,
            period="daily",
            start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"),
            adjust="" if adjust == "none" else adjust,
        )
        payload = _normalize_history_frame(ticker, frame, range_key, adjust, start_date, end_date)
        _write_cache(cache_dir, payload, end_date)
        return payload
    except Exception as exc:  # noqa: BLE001 - provider errors become a stable domain error.
        if cached:
            return {
                **cached,
                "warning": f"历史行情刷新失败，已显示缓存数据：{exc}",
            }
        if isinstance(exc, StockHistoryUnavailable):
            raise
        raise StockHistoryUnavailable(str(exc)) from exc
