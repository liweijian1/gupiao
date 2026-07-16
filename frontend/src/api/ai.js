import { API_BASE_URL } from "../config.js";
import { normalizeAiError } from "../utils/aiAnalysis.js";


async function aiRequest(path, {
  method = "GET",
  body,
  adminPassword,
  analysisPassword,
  signal,
} = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (adminPassword) headers["X-AI-Admin-Password"] = adminPassword;
  if (analysisPassword) headers["X-AI-Analysis-Password"] = analysisPassword;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const normalized = normalizeAiError(response.status, payload);
    const error = new Error(normalized.code);
    Object.assign(error, normalized);
    throw error;
  }
  return payload;
}


export const getAiConfigStatus = () => aiRequest("/api/ai/config/status");
export const testAiConfig = (config, adminPassword) => aiRequest("/api/ai/config/test", {
  method: "POST",
  body: config,
  adminPassword,
});
export const saveAiConfig = (config, adminPassword) => aiRequest("/api/ai/config", {
  method: "PUT",
  body: config,
  adminPassword,
});
export const getCachedAiAnalysis = (ticker, lang, analysisPassword, signal) => aiRequest(
  `/api/ai/analysis/${encodeURIComponent(ticker)}?lang=${lang}`,
  { analysisPassword, signal },
);
export const requestAiAnalysis = (ticker, lang, force, analysisPassword, signal) => aiRequest(
  "/api/ai/analyze",
  {
    method: "POST",
    body: { ticker, lang, force },
    analysisPassword,
    signal,
  },
);
