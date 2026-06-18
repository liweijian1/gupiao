from __future__ import annotations

from datetime import datetime, timezone
from importlib import import_module
from typing import Any

import pandas as pd


DATE_HINTS = ("date", "日期", "月份", "时间", "统计时间", "报告期")


class AkShareUnavailable(RuntimeError):
    pass


def load_akshare() -> Any:
    try:
      return import_module("akshare")
    except ModuleNotFoundError as exc:
      raise AkShareUnavailable("akshare is not installed") from exc


def call_akshare_function(ak: Any, name: str) -> pd.DataFrame:
    fn = getattr(ak, name, None)
    if fn is None:
        raise AttributeError(f"AkShare has no function {name}")

    # Most macro functions need no args. A few market data functions accept
    # optional args; try the zero-arg path first to keep this adapter generic.
    result = fn()
    if not isinstance(result, pd.DataFrame):
        result = pd.DataFrame(result)
    if result.empty:
        raise ValueError(f"{name} returned empty data")
    return result


def pick_date_column(df: pd.DataFrame) -> str | None:
    for col in df.columns:
        name = str(col)
        if any(hint.lower() in name.lower() for hint in DATE_HINTS):
            return col
    for col in df.columns:
        parsed = pd.to_datetime(df[col], errors="coerce")
        if parsed.notna().sum() >= max(2, len(df) // 3):
            return col
    return None


def pick_value_column(df: pd.DataFrame, keywords: list[str]) -> str:
    numeric_candidates: list[tuple[int, str]] = []

    for col in df.columns:
        series = pd.to_numeric(df[col], errors="coerce")
        valid_count = int(series.notna().sum())
        if valid_count == 0:
            continue
        lowered = str(col).lower()
        keyword_score = sum(1 for word in keywords if word.lower() in lowered)
        numeric_candidates.append((keyword_score * 1000 + valid_count, col))

    if not numeric_candidates:
        raise ValueError("no numeric value column found")

    return sorted(numeric_candidates, reverse=True)[0][1]


def normalize_series(df: pd.DataFrame, keywords: list[str]) -> list[dict[str, Any]]:
    date_col = pick_date_column(df)
    value_col = pick_value_column(df, keywords)

    normalized = pd.DataFrame()
    if date_col is not None:
        normalized["date"] = pd.to_datetime(df[date_col], errors="coerce")
    else:
        normalized["date"] = pd.RangeIndex(start=0, stop=len(df), step=1)

    normalized["value"] = pd.to_numeric(df[value_col], errors="coerce")
    normalized = normalized.dropna(subset=["value"]).tail(72).copy()

    if normalized.empty:
        raise ValueError("normalized series is empty")

    points: list[dict[str, Any]] = []
    for _, row in normalized.iterrows():
        date_value = row["date"]
        if isinstance(date_value, pd.Timestamp):
            date_text = date_value.date().isoformat()
        else:
            date_text = str(date_value)
        points.append({"date": date_text, "value": float(row["value"])})
    return points


def fetch_indicator(indicator: dict[str, Any]) -> dict[str, Any]:
    ak = load_akshare()
    errors: list[str] = []

    for api_name in indicator["api_candidates"]:
        try:
            df = call_akshare_function(ak, api_name)
            points = normalize_series(df, indicator["keywords"])
            return {
                "key": indicator["key"],
                "group": indicator["group"],
                "unit": indicator["unit"],
                "direction": indicator["direction"],
                "weight": indicator["weight"],
                "api": f"{api_name}()",
                "points": points,
                "source": "akshare",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "error": None,
            }
        except Exception as exc:  # noqa: BLE001 - keep trying fallback candidates.
            errors.append(f"{api_name}: {exc}")

    raise RuntimeError("; ".join(errors))
