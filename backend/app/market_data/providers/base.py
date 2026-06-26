from __future__ import annotations

from abc import ABC, abstractmethod

from ..types import UnifiedQuote


class QuoteProvider(ABC):
    name = "base"
    priority = 99

    def is_available(self) -> bool:
        return True

    @abstractmethod
    def get_realtime_quote(self, symbol: str) -> UnifiedQuote | None:
        raise NotImplementedError
