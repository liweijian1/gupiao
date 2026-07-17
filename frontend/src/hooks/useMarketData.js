import { useCallback, useEffect, useReducer, useState } from "react";

import { API_BASE_URL } from "../config.js";
import {
  classifyStockSearchSnapshot,
  retainStockSearchSnapshot,
} from "../utils/dataSourceStatus.js";
import {
  initialSnapshotRequestState,
  snapshotRequestReducer,
} from "../utils/snapshotRequestState.js";

function useSnapshotRequest(path, label) {
  const [state, dispatch] = useReducer(snapshotRequestReducer, initialSnapshotRequestState);
  const [requestVersion, setRequestVersion] = useState(0);
  const retry = useCallback(() => setRequestVersion((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const requestPath = requestVersion > 0 ? `${path}?force=true` : path;
    dispatch({ type: "start" });

    fetch(`${API_BASE_URL}${requestPath}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`${label} API returned ${response.status}`);
        }
        return response.json();
      })
      .then((snapshot) => {
        dispatch({ type: "success", snapshot });
      })
      .catch((error) => {
        if (error.name !== "AbortError") dispatch({ type: "failure", error });
      });

    return () => {
      controller.abort();
    };
  }, [label, path, requestVersion]);

  return { ...state, retry };
}

export function useMacroSnapshot() {
  return useSnapshotRequest("/api/macro/snapshot", "Macro");
}

export function useStockSnapshot() {
  return useSnapshotRequest("/api/stocks/snapshot", "Stock");
}

export function useStockSearch(query) {
  const [searchSnapshot, setSearchSnapshot] = useState(null);
  const [searchState, setSearchState] = useState("idle");
  const [searchRequestVersion, setSearchRequestVersion] = useState(0);
  const retrySearch = useCallback(() => setSearchRequestVersion((value) => value + 1), []);

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
      setSearchSnapshot((previous) => (
        previous?.query === normalizedQuery ? previous : null
      ));
      const runSearch = async (attempt = 0) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/stocks/search?q=${encodeURIComponent(normalizedQuery)}&limit=30`, {
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(`Stock search API returned ${response.status}`);
          }
          const snapshot = await response.json();
          const outcome = classifyStockSearchSnapshot(snapshot);
          if (outcome === "error" && attempt === 0) {
            retryTimer = window.setTimeout(() => runSearch(1), 800);
            return;
          }
          setSearchSnapshot((previous) => retainStockSearchSnapshot(previous, snapshot, outcome));
          setSearchState(outcome);
        } catch (error) {
          if (error.name !== "AbortError") {
            if (attempt === 0) {
              retryTimer = window.setTimeout(() => runSearch(1), 800);
            } else {
              const failedSnapshot = {
                query: normalizedQuery,
                stocks: [],
                warning: error.message,
              };
              setSearchSnapshot((previous) => retainStockSearchSnapshot(previous, failedSnapshot, "error"));
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
  }, [query, searchRequestVersion]);

  return { searchSnapshot, searchState, retrySearch };
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
