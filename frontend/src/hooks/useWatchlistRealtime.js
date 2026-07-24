import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "../config.js";
import { applyRealtimeQuotes } from "../utils/equityDiscovery.js";

const A_SHARE_EXCHANGES = new Set(["SSE", "SZSE", "BSE", "A-share"]);
const REFRESH_INTERVAL_MS = 15000;

function eligibleTickers(stocks) {
  return (Array.isArray(stocks) ? stocks : [])
    .filter((stock) => A_SHARE_EXCHANGES.has(stock?.exchange) && /^\d{6}$/.test(stock?.ticker ?? ""))
    .map((stock) => stock.ticker);
}

export function useWatchlistRealtime({ user, stocks }) {
  const [quotes, setQuotes] = useState([]);
  const tickers = useMemo(() => eligibleTickers(stocks), [stocks]);
  const tickersKey = tickers.join(",");
  const userKey = user?.email ?? user?.id ?? "";

  useEffect(() => {
    if (!userKey || !tickersKey) {
      setQuotes([]);
      return undefined;
    }

    let disposed = false;
    let controller;
    let refreshTimer;
    const requestedTickers = tickersKey.split(",");

    const refreshQuotes = async () => {
      controller = new AbortController();
      try {
        const results = await Promise.all(requestedTickers.map(async (ticker) => {
          try {
            const response = await fetch(`${API_BASE_URL}/api/stocks/realtime?symbol=${encodeURIComponent(ticker)}`, {
              signal: controller.signal,
            });
            if (!response.ok) return null;
            const payload = await response.json();
            return payload?.quote ?? null;
          } catch (error) {
            if (error.name === "AbortError") throw error;
            return null;
          }
        }));
        const successfulQuotes = results.filter((quote) => quote?.ticker);
        if (!disposed && successfulQuotes.length > 0) {
          setQuotes((previous) => {
            const byTicker = new Map(previous.map((quote) => [quote.ticker, quote]));
            successfulQuotes.forEach((quote) => byTicker.set(quote.ticker, quote));
            return [...byTicker.values()];
          });
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          // Keep the last known good quote until the next polling cycle.
        }
      } finally {
        if (!disposed) refreshTimer = window.setTimeout(refreshQuotes, REFRESH_INTERVAL_MS);
      }
    };

    refreshQuotes();
    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [tickersKey, userKey]);

  return useMemo(() => applyRealtimeQuotes(stocks, quotes), [quotes, stocks]);
}
