from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from threading import RLock

from .cache import (
    read_memory_quote,
    read_realtime_quote_file,
    write_memory_quote,
    write_realtime_quote,
)
from .circuit_breaker import CircuitBreaker
from .market_time import is_market_open, market_status
from .providers import AkShareEastmoneyProvider, BaostockSnapshotProvider, SinaProvider, TencentProvider
from .providers.base import QuoteProvider
from .types import REALTIME_PROVIDER_PRIORITY, SourceChainEntry, UnifiedQuote

REALTIME_PROVIDERS: dict[str, QuoteProvider] = {
    "akshare_em": AkShareEastmoneyProvider(),
    "sina": SinaProvider(),
    "tencent": TencentProvider(),
    "baostock_snapshot": BaostockSnapshotProvider(),
}


def add_no_proxy_host(host: str) -> None:
    for key in ("NO_PROXY", "no_proxy"):
        current = [item.strip() for item in os.environ.get(key, "").split(",") if item.strip()]
        if host not in current:
            current.append(host)
            os.environ[key] = ",".join(current)


add_no_proxy_host("push2.eastmoney.com")


class MarketDataManager:
    def __init__(self) -> None:
        self.circuit_breaker = CircuitBreaker()
        self._lock = RLock()

    def _normalize_symbol(self, symbol: str) -> str:
        return symbol.strip().lower().replace(".sh", "").replace(".sz", "").replace("sh.", "").replace("sz.", "")

    def _quote_from_cache(self, symbol: str, provider_name: str, fallback_from: str | None = None) -> UnifiedQuote | None:
        quote = read_realtime_quote_file(symbol)
        if not quote:
            return None
        quote.provider = provider_name
        quote.source = "cache"
        quote.is_stale = True
        quote.fallback_from = fallback_from
        return quote

    def _try_provider(self, provider: QuoteProvider, symbol: str) -> UnifiedQuote | None:
        if not provider.is_available():
            raise RuntimeError(f"{provider.name} unavailable")
        if not self.circuit_breaker.is_available(provider.name):
            raise RuntimeError(f"{provider.name} in cooldown")
        return provider.get_realtime_quote(symbol)

    def _build_response(
        self,
        *,
        quote: UnifiedQuote | None,
        source: str,
        market_open: bool,
        source_chain: list[SourceChainEntry],
        warning: str | None = None,
        notice: str | None = None,
        stale: bool = False,
        refresh_after_seconds: int = 5,
    ) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        status = market_status()
        payload = {
            "quote": quote.to_dict() if quote else None,
            "source": source,
            "updated_at": now,
            "market_open": market_open,
            "market_status": status,
            "refresh_after_seconds": refresh_after_seconds,
            "source_chain": [entry.to_dict() for entry in source_chain],
        }
        if warning:
            payload["warning"] = warning
        if notice:
            payload["notice"] = notice
        if stale:
            payload["stale"] = True
        return payload

    def get_realtime_quote(self, symbol: str, force_refresh: bool = False) -> dict:
        compact = self._normalize_symbol(symbol)
        now = datetime.now(timezone.utc)
        market_open = is_market_open(now)

        if len(compact) != 6 or not compact.isdigit():
            return self._build_response(
                quote=None,
                source="invalid",
                market_open=market_open,
                source_chain=[],
                warning="A-share symbol must be a 6-digit code",
                refresh_after_seconds=60,
            )

        with self._lock:
            if not force_refresh:
                cached = read_memory_quote(compact)
                if cached:
                    cached["source_chain"] = cached.get("source_chain", [])
                    return cached

            if not market_open:
                return self._closed_market_quote(compact, now)

            return self._live_market_quote(compact, force_refresh=force_refresh)

    def _closed_market_quote(self, symbol: str, now: datetime) -> dict:
        chain: list[SourceChainEntry] = []
        started = time.perf_counter()
        quote = read_realtime_quote_file(symbol)
        chain.append(
            SourceChainEntry(
                provider="realtime_cache",
                result="ok" if quote else "failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error=None if quote else "no persisted realtime quote",
            )
        )
        if quote:
            quote.source = "cache"
            quote.is_stale = True
            result = self._build_response(
                quote=quote,
                source="cache",
                market_open=False,
                source_chain=chain,
                notice="非交易时段，显示最近缓存行情",
                refresh_after_seconds=60,
            )
            write_memory_quote(symbol, result)
            return result

        started = time.perf_counter()
        snapshot_quote = BaostockSnapshotProvider().get_realtime_quote(symbol)
        chain.append(
            SourceChainEntry(
                provider="baostock_snapshot",
                result="ok" if snapshot_quote else "failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error=None if snapshot_quote else "symbol not in stock snapshot",
            )
        )
        if snapshot_quote:
            snapshot_quote.source = "cache"
            snapshot_quote.is_stale = True
            result = self._build_response(
                quote=snapshot_quote,
                source="cache",
                market_open=False,
                source_chain=chain,
                notice="非交易时段，显示日线快照",
                refresh_after_seconds=60,
            )
            write_memory_quote(symbol, result)
            return result

        return self._build_response(
            quote=None,
            source="cache",
            market_open=False,
            source_chain=chain,
            warning="No cached quote is available for this symbol",
            refresh_after_seconds=60,
        )

    def _live_market_quote(self, symbol: str, force_refresh: bool = False) -> dict:
        chain: list[SourceChainEntry] = []
        last_error: str | None = None

        for provider_name in REALTIME_PROVIDER_PRIORITY:
            if provider_name in {"realtime_cache", "baostock_snapshot"}:
                continue
            provider = REALTIME_PROVIDERS.get(provider_name)
            if provider is None:
                continue
            if not self.circuit_breaker.is_available(provider_name):
                chain.append(SourceChainEntry(provider=provider_name, result="skipped", duration_ms=0, error="cooldown"))
                continue

            started = time.perf_counter()
            try:
                quote = self._try_provider(provider, symbol)
                duration_ms = int((time.perf_counter() - started) * 1000)
                if quote is None:
                    raise RuntimeError("provider returned empty quote")
                self.circuit_breaker.record_success(provider_name)
                chain.append(SourceChainEntry(provider=provider_name, result="ok", duration_ms=duration_ms))
                quote.fetched_at = datetime.now(timezone.utc).isoformat()
                write_realtime_quote(symbol, quote)
                result = self._build_response(
                    quote=quote,
                    source="realtime",
                    market_open=True,
                    source_chain=chain,
                    refresh_after_seconds=5,
                )
                write_memory_quote(symbol, result)
                return result
            except Exception as exc:  # noqa: BLE001 - continue fallback chain
                duration_ms = int((time.perf_counter() - started) * 1000)
                message = str(exc)
                last_error = message
                self.circuit_breaker.record_failure(provider_name, message)
                chain.append(SourceChainEntry(provider=provider_name, result="failed", duration_ms=duration_ms, error=message))

        started = time.perf_counter()
        cached = self._quote_from_cache(symbol, "realtime_cache", fallback_from=last_error)
        chain.append(
            SourceChainEntry(
                provider="realtime_cache",
                result="ok" if cached else "failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error=None if cached else "no persisted realtime quote",
            )
        )
        if cached:
            result = self._build_response(
                quote=cached,
                source="cache",
                market_open=True,
                source_chain=chain,
                warning="实时源暂不可用，已显示最近缓存行情",
                stale=True,
                refresh_after_seconds=15,
            )
            write_memory_quote(symbol, result)
            return result

        started = time.perf_counter()
        snapshot_quote = BaostockSnapshotProvider().get_realtime_quote(symbol)
        chain.append(
            SourceChainEntry(
                provider="baostock_snapshot",
                result="ok" if snapshot_quote else "failed",
                duration_ms=int((time.perf_counter() - started) * 1000),
                error=None if snapshot_quote else "symbol not in stock snapshot",
            )
        )
        if snapshot_quote:
            snapshot_quote.source = "daily"
            snapshot_quote.is_stale = True
            result = self._build_response(
                quote=snapshot_quote,
                source="daily",
                market_open=True,
                source_chain=chain,
                warning="实时源暂不可用，已显示日线快照",
                stale=True,
                refresh_after_seconds=30,
            )
            write_memory_quote(symbol, result)
            return result

        return self._build_response(
            quote=None,
            source="realtime",
            market_open=True,
            source_chain=chain,
            warning=last_error or "All realtime providers failed",
            refresh_after_seconds=15,
        )

    def provider_health(self) -> dict:
        return {"providers": self.circuit_breaker.health_snapshot()}


market_data_manager = MarketDataManager()


def get_realtime_quote(symbol: str, force_refresh: bool = False) -> dict:
    return market_data_manager.get_realtime_quote(symbol, force_refresh=force_refresh)


def get_provider_health() -> dict:
    return market_data_manager.provider_health()
