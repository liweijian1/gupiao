from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from .models import DailyBar


FACTOR_COLUMNS = ("momentum", "quality", "valuation", "liquidity", "volatility")


def calculate_factor_frame(bars: Iterable[DailyBar]) -> pd.DataFrame:
    frame = pd.DataFrame([bar.model_dump() for bar in bars])
    if frame.empty:
        return pd.DataFrame(columns=["symbol", "date", "close", *FACTOR_COLUMNS])
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values(["symbol", "date"]).copy()
    grouped = frame.groupby("symbol", group_keys=False)
    returns = grouped["close"].pct_change(fill_method=None)
    frame["momentum"] = grouped["close"].pct_change(20, fill_method=None)
    volatility = returns.groupby(frame["symbol"]).transform(lambda values: values.rolling(20, min_periods=20).std(ddof=0))
    frame["quality"] = -volatility
    frame["valuation"] = -(frame["close"] / grouped["close"].transform(lambda values: values.rolling(20, min_periods=20).mean()))
    frame["liquidity"] = grouped["amount"].transform(lambda values: values.rolling(20, min_periods=20).mean())
    frame["volatility"] = -volatility
    return frame


def cross_sectional_zscores(frame: pd.DataFrame) -> pd.DataFrame:
    output = frame.copy()
    for column in FACTOR_COLUMNS:
        values = output[column]
        lower = values.quantile(0.05)
        upper = values.quantile(0.95)
        clipped = values.clip(lower=lower, upper=upper)
        std = clipped.std(ddof=0)
        output[column] = 0.0 if not std or pd.isna(std) else (clipped - clipped.mean()) / std
    return output
