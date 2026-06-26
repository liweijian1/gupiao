import { useEffect, useState } from "react";

import { API_BASE_URL } from "../config.js";

export function useMacroSnapshot() {
  const [macroSnapshot, setMacroSnapshot] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/macro/snapshot`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Macro API returned ${response.status}`);
        }
        return response.json();
      })
      .then((snapshot) => {
        if (mounted) {
          setMacroSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (mounted) {
          setMacroSnapshot(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return macroSnapshot;
}

export function useStockSnapshot() {
  const [stockSnapshot, setStockSnapshot] = useState(null);

  useEffect(() => {
    let mounted = true;

    fetch(`${API_BASE_URL}/api/stocks/snapshot`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Stock API returned ${response.status}`);
        }
        return response.json();
      })
      .then((snapshot) => {
        if (mounted) {
          setStockSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (mounted) {
          setStockSnapshot(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return stockSnapshot;
}

export function useStockSearch(query) {
  const [searchSnapshot, setSearchSnapshot] = useState(null);
  const [searchState, setSearchState] = useState("idle");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setSearchSnapshot(null);
      setSearchState("idle");
      return undefined;
    }

    const controller = new AbortController();
    let retryTimer;
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      const runSearch = async (attempt = 0) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/stocks/search?q=${encodeURIComponent(normalizedQuery)}&limit=30`, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Stock search API returned ${response.status}`);
          }
          const snapshot = await response.json();
          if (snapshot.warning && snapshot.stocks?.length === 0 && attempt === 0) {
            retryTimer = window.setTimeout(() => runSearch(1), 800);
            return;
          }
          setSearchSnapshot(snapshot);
          setSearchState(snapshot.warning && snapshot.stocks?.length === 0 ? "error" : "ready");
        } catch (error) {
          if (error.name !== "AbortError") {
            if (attempt === 0) {
              retryTimer = window.setTimeout(() => runSearch(1), 800);
            } else {
              setSearchSnapshot({ stocks: [], warning: error.message });
              setSearchState("error");
            }
          }
        }
      };
      runSearch();
    }, 350);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
      controller.abort();
    };
  }, [query]);

  return { searchSnapshot, searchState };
}

export function useProviderHealth(updatedAt) {
  const [providerHealth, setProviderHealth] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/stocks/providers/health`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => payload && setProviderHealth(payload))
      .catch(() => {});
  }, [updatedAt]);

  return providerHealth;
}

export function useRealtimeQuote(selectedStock) {
  const [realtimeQuote, setRealtimeQuote] = useState(null);
  const [realtimeMeta, setRealtimeMeta] = useState(null);
  const [realtimeState, setRealtimeState] = useState("idle");

  useEffect(() => {
    const isAShare = ["SSE", "SZSE", "BSE", "A-share"].includes(selectedStock.exchange);
    if (!isAShare || !/^\d{6}$/.test(selectedStock.ticker)) {
      setRealtimeQuote(null);
      setRealtimeMeta(null);
      setRealtimeState("idle");
      return undefined;
    }

    let disposed = false;
    let refreshTimer;
    let controller;

    const refreshRealtimeQuote = async () => {
      let refreshAfterMs = 5000;
      controller = new AbortController();
      try {
        const response = await fetch(`${API_BASE_URL}/api/stocks/realtime?symbol=${encodeURIComponent(selectedStock.ticker)}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Realtime API returned ${response.status}`);
        }
        const payload = await response.json();
        refreshAfterMs = Math.max(5000, Number(payload.refresh_after_seconds ?? 5) * 1000);
        if (!disposed) {
          setRealtimeMeta(payload);
          if (payload.quote) {
            setRealtimeQuote(payload.quote);
            setRealtimeState(payload.market_open === false ? "cached" : payload.stale ? "stale" : "live");
          } else {
            setRealtimeState("stale");
          }
        }
      } catch (error) {
        if (!disposed && error.name !== "AbortError") {
          setRealtimeState("stale");
        }
      } finally {
        if (!disposed) {
          refreshTimer = window.setTimeout(refreshRealtimeQuote, refreshAfterMs);
        }
      }
    };

    setRealtimeQuote(null);
    setRealtimeMeta(null);
    setRealtimeState("loading");
    refreshRealtimeQuote();

    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(refreshTimer);
    };
  }, [selectedStock.exchange, selectedStock.ticker]);

  return { realtimeQuote, realtimeMeta, realtimeState };
}
