from __future__ import annotations

from datetime import datetime, timezone
from importlib import import_module
from typing import Any

from ..types import UnifiedQuote
from .base import QuoteProvider


def _number(value: Any, default: float = 0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return default if parsed != parsed else parsed  # NaN guard


class AkShareEastmoneyProvider(QuoteProvider):
    name = "akshare_em"
    priority = 1

    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        ak = import_module("akshare")
        frame = ak.stock_bid_ask_em(symbol=symbol)
        values = {
            str(row["item"]): row["value"]
            for _, row in frame.iterrows()
            if "item" in row and "value" in row
        }
        price = _number(values.get("最新"))
        if price <= 0:
            raise RuntimeError("AKShare returned no valid latest price")
        previous_close = _number(values.get("昨收"))
        chg = _number(values.get("涨幅"))
        if chg == 0 and previous_close > 0:
            chg = (price / previous_close - 1) * 100
        now = datetime.now(timezone.utc).isoformat()
        return UnifiedQuote(
            ticker=symbol,
            price=round(price, 2),
            chg=round(chg, 2),
            open=round(_number(values.get("今开")), 2),
            high=round(_number(values.get("最高")), 2),
            low=round(_number(values.get("最低")), 2),
            previous_close=round(previous_close, 2),
            volume=round(_number(values.get("总手")) * 100),
            amount=round(_number(values.get("金额")), 2),
            turnover=round(_number(values.get("换手")), 2),
            provider=self.name,
            source="realtime",
            fetched_at=now,
        )
