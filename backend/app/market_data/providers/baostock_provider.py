from __future__ import annotations

from ..cache import read_stock_snapshot
from ..types import UnifiedQuote
from .base import QuoteProvider


class BaostockSnapshotProvider(QuoteProvider):
    name = "baostock_snapshot"
    priority = 5

    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        snapshot = read_stock_snapshot()
        if not snapshot:
            return None
        stock = next((item for item in snapshot.get("stocks", []) if item.get("ticker") == symbol), None)
        if not stock:
            return None
        return UnifiedQuote(
            ticker=symbol,
            name=stock.get("name"),
            price=stock.get("price"),
            chg=stock.get("chg"),
            provider=self.name,
            source="daily",
            market_date=stock.get("latest_date"),
            fetched_at=snapshot.get("updated_at"),
        )
