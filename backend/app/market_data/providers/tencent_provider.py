from __future__ import annotations

from datetime import datetime, timezone

import requests

from ..types import UnifiedQuote
from .base import QuoteProvider


def _number(value, default: float = 0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class TencentProvider(QuoteProvider):
    name = "tencent"
    priority = 3

    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        prefix = "sh" if symbol.startswith(("5", "6", "9")) else "bj" if symbol.startswith(("4", "8")) else "sz"
        session = requests.Session()
        session.trust_env = False
        response = session.get(
            f"https://qt.gtimg.cn/q={prefix}{symbol}",
            headers={"Referer": "https://gu.qq.com/"},
            timeout=8,
        )
        response.raise_for_status()
        response.encoding = "gbk"
        payload = response.text.split('="', 1)[-1].rsplit('"', 1)[0]
        fields = payload.split("~")
        if len(fields) < 35:
            raise RuntimeError("Tencent returned an incomplete realtime quote")
        price = _number(fields[3])
        previous_close = _number(fields[4])
        if price <= 0:
            raise RuntimeError("Tencent returned no valid latest price")
        chg = 0 if previous_close <= 0 else (price / previous_close - 1) * 100
        volume = _number(fields[36]) * 100 if len(fields) > 36 else _number(fields[6]) * 100
        amount = _number(fields[37]) if len(fields) > 37 else 0
        turnover = _number(fields[38]) if len(fields) > 38 else 0
        now = datetime.now(timezone.utc).isoformat()
        return UnifiedQuote(
            ticker=symbol,
            name=fields[1] or None,
            price=round(price, 2),
            chg=round(chg, 2),
            open=round(_number(fields[5]), 2),
            high=round(_number(fields[33]), 2),
            low=round(_number(fields[34]), 2),
            previous_close=round(previous_close, 2),
            volume=round(volume),
            amount=round(amount, 2),
            turnover=round(turnover, 2),
            provider=self.name,
            source="realtime",
            market_date=fields[30] if len(fields) > 30 else None,
            market_time=fields[31] if len(fields) > 31 else None,
            fetched_at=now,
        )
