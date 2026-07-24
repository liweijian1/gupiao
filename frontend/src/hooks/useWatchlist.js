import { useCallback, useEffect, useState } from "react";

import { addWatchlistTicker, getWatchlist, getWatchlistStocks, removeWatchlistTicker } from "../api/watchlist.js";

export function useWatchlist({ user, authStatus }) {
  const [state, setState] = useState({ status: "idle", tickers: [], error: null });
  const [detailState, setDetailState] = useState({ detailsStatus: "idle", stocks: [], unavailableTickers: [], detailsError: null });

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ status: "idle", tickers: [], error: null });
      return [];
    }
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const payload = await getWatchlist();
      const tickers = Array.isArray(payload.tickers) ? payload.tickers : [];
      setState({ status: "ready", tickers, error: null });
      return tickers;
    } catch (error) {
      setState({ status: "error", tickers: [], error });
      throw error;
    }
  }, [user]);

  const refreshStocks = useCallback(async () => {
    if (!user) {
      setDetailState({ detailsStatus: "idle", stocks: [], unavailableTickers: [], detailsError: null });
      return [];
    }
    setDetailState((current) => ({ ...current, detailsStatus: "loading", detailsError: null }));
    try {
      const payload = await getWatchlistStocks();
      const tickers = Array.isArray(payload.tickers) ? payload.tickers : [];
      const stocks = Array.isArray(payload.stocks) ? payload.stocks : [];
      const unavailableTickers = Array.isArray(payload.unavailable_tickers) ? payload.unavailable_tickers : [];
      setState({ status: "ready", tickers, error: null });
      setDetailState({ detailsStatus: "ready", stocks, unavailableTickers, detailsError: null });
      return stocks;
    } catch (error) {
      setDetailState((current) => ({ ...current, detailsStatus: "error", detailsError: error }));
      throw error;
    }
  }, [user]);

  useEffect(() => {
    if (authStatus === "authenticated") refreshStocks().catch(() => {});
    if (authStatus === "anonymous") {
      setState({ status: "idle", tickers: [], error: null });
      setDetailState({ detailsStatus: "idle", stocks: [], unavailableTickers: [], detailsError: null });
    }
  }, [authStatus, refreshStocks]);

  const add = useCallback(async (ticker) => {
    await addWatchlistTicker(ticker);
    setState((current) => current.tickers.includes(ticker) ? current : { status: "ready", tickers: [...current.tickers, ticker], error: null });
    await refreshStocks();
  }, [refreshStocks]);
  const remove = useCallback(async (ticker) => {
    await removeWatchlistTicker(ticker);
    setState((current) => ({ status: "ready", tickers: current.tickers.filter((item) => item !== ticker), error: null }));
    await refreshStocks();
  }, [refreshStocks]);

  return { ...state, ...detailState, refresh, refreshStocks, add, remove };
}
