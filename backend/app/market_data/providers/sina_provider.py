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


class SinaProvider(QuoteProvider):
    name = "sina"
    priority = 2

    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        prefix = "sh" if symbol.startswith(("5", "6", "9")) else "bj" if symbol.startswith(("4", "8")) else "sz"
        session = requests.Session()
        session.trust_env = False
        response = session.get(
            f"https://hq.sinajs.cn/list={prefix}{symbol}",
            headers={"Referer": "https://finance.sina.com.cn/"},
            timeout=8,
        )
        response.raise_for_status()
        response.encoding = "gbk"
        payload = response.text.split('="', 1)[-1].rsplit('"', 1)[0]
        fields = payload.split(",")
        if len(fields) < 32:
            raise RuntimeError("Sina returned an incomplete realtime quote")
        price = _number(fields[3])
        previous_close = _number(fields[2])
        if price <= 0:
            raise RuntimeError("Sina returned no valid latest price")
        chg = 0 if previous_close <= 0 else (price / previous_close - 1) * 100
        volume = _number(fields[8])
        amount = _number(fields[9])
        now = datetime.now(timezone.utc).isoformat()
        return UnifiedQuote(
            ticker=symbol,
            name=fields[0] or None,
            price=round(price, 2),
            chg=round(chg, 2),
            open=round(_number(fields[1]), 2),
            high=round(_number(fields[4]), 2),
            low=round(_number(fields[5]), 2),
            previous_close=round(previous_close, 2),
            volume=round(volume),
            amount=round(amount, 2),
            provider=self.name,
            source="realtime",
            market_date=fields[30] or None,
            market_time=fields[31] or None,
            fetched_at=now,
        )
