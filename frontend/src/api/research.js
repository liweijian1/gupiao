import { API_BASE_URL } from "../config.js";

export class ResearchApiError extends Error {
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ResearchApiError(
      response.status,
      payload?.detail?.code ?? "research_request_failed",
      payload?.detail?.message,
    );
  }
  return payload;
}

export const getResearchDataset = (signal) => request("/api/research/dataset", { signal });
export const refreshResearchDataset = (payload, signal) => request("/api/research/dataset/refresh", { method: "POST", body: payload, signal });
export const getResearchRanking = (weights, signal) => {
  const params = new URLSearchParams(Object.entries(weights).map(([key, value]) => [key, String(value)]));
  return request(`/api/research/ranking?${params}`, { signal });
};
export const startResearchBacktest = (payload, signal) => request("/api/research/backtests", { method: "POST", body: payload, signal });
export const getResearchBacktestJob = (jobId, signal) => request(`/api/research/backtests/${encodeURIComponent(jobId)}`, { signal });
