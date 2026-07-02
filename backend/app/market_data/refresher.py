from __future__ import annotations

import logging
import time
from importlib import import_module
from threading import Event, RLock, Thread
from typing import Any

from .cache import read_stock_names
from .manager import get_realtime_quote
from .market_time import china_now, is_market_open

logger = logging.getLogger(__name__)


class QuoteCacheRefresher:
    """Lightweight background refresher for same-day realtime quote cache.

    The refresher only runs during China market hours. It refreshes a rotating
    slice of watched symbols so the app can still have same-day cached quotes
    after close even if the user is not actively viewing every stock.
    """

    def __init__(self) -> None:
        self._stop = Event()
        self._thread: Thread | None = None
        self._lock = RLock()
        self._cursor = 0
        self._last_run: dict[str, Any] = {
            "running": False,
            "last_started_at": None,
            "last_completed_at": None,
            "last_symbols": [],
            "last_error": None,
        }

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._stop.clear()
            self._thread = Thread(target=self._run, name="quote-cache-refresher", daemon=True)
            self._thread.start()
            self._last_run["running"] = True

    def stop(self) -> None:
        with self._lock:
            self._stop.set()
            thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=3)
        with self._lock:
            self._last_run["running"] = False

    def status(self) -> dict[str, Any]:
        with self._lock:
            return dict(self._last_run)

    def _watchlist(self) -> list[str]:
        symbols: list[str] = []
        try:
            stocks = import_module("app.stocks")
            symbols.extend(getattr(stocks, "A_SHARE_SEED_CODES", []))
        except Exception as exc:  # noqa: BLE001 - background cache should never break app startup.
            logger.debug("failed to load seed stock codes: %s", exc)

        try:
            symbols.extend(read_stock_names().keys())
        except Exception as exc:  # noqa: BLE001
            logger.debug("failed to load cached stock names: %s", exc)

        deduped = []
        for symbol in symbols:
            compact = str(symbol).strip().lower().replace(".sh", "").replace(".sz", "").replace("sh.", "").replace("sz.", "")
            if len(compact) == 6 and compact.isdigit() and compact not in deduped:
                deduped.append(compact)
        return deduped

    def _next_batch(self, symbols: list[str], batch_size: int) -> list[str]:
        if not symbols:
            return []
        start = self._cursor % len(symbols)
        batch = [symbols[(start + index) % len(symbols)] for index in range(min(batch_size, len(symbols)))]
        self._cursor = (start + len(batch)) % len(symbols)
        return batch

    def _interval_seconds(self) -> int:
        local = china_now()
        current = local.time()
        if not is_market_open(local):
            return 300
        if current.hour == 14 and current.minute >= 55:
            return 10
        return 60

    def _batch_size(self) -> int:
        local = china_now()
        current = local.time()
        return 10 if current.hour == 14 and current.minute >= 55 else 5

    def _run(self) -> None:
        while not self._stop.is_set():
            interval = self._interval_seconds()
            if is_market_open():
                self._refresh_once()
            self._stop.wait(interval)

    def _refresh_once(self) -> None:
        symbols = self._watchlist()
        batch = self._next_batch(symbols, self._batch_size())
        if not batch:
            return

        started_at = time.time()
        with self._lock:
            self._last_run.update({
                "last_started_at": started_at,
                "last_symbols": batch,
                "last_error": None,
            })

        for symbol in batch:
            if self._stop.is_set():
                break
            try:
                get_realtime_quote(symbol, force_refresh=True)
            except Exception as exc:  # noqa: BLE001
                logger.debug("background quote refresh failed for %s: %s", symbol, exc)
                with self._lock:
                    self._last_run["last_error"] = f"{symbol}: {exc}"

        with self._lock:
            self._last_run["last_completed_at"] = time.time()


quote_cache_refresher = QuoteCacheRefresher()


def start_quote_cache_refresher() -> None:
    quote_cache_refresher.start()


def stop_quote_cache_refresher() -> None:
    quote_cache_refresher.stop()


def quote_cache_refresher_status() -> dict[str, Any]:
    return quote_cache_refresher.status()
