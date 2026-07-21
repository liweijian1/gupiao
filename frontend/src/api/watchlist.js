import { API_BASE_URL } from "../config.js";
import { AuthApiError } from "./auth.js";

async function watchlistRequest(path, { method = "GET" } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: method === "GET" ? { Accept: "application/json" } : { Accept: "application/json", "X-Requested-With": "QuantDesk" },
    credentials: "include",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthApiError(response.status, payload?.detail?.code ?? "request_failed");
  return payload;
}

export const getWatchlist = () => watchlistRequest("/api/watchlist");
export const getWatchlistStocks = () => watchlistRequest("/api/watchlist/stocks");
export const addWatchlistTicker = (ticker) => watchlistRequest(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: "PUT" });
export const removeWatchlistTicker = (ticker) => watchlistRequest(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: "DELETE" });
