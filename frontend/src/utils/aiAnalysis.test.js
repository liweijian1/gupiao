import test from "node:test";
import assert from "node:assert/strict";

import { aiAnalysisReducer, getVisibleAiResult, initialAiAnalysisState, normalizeAiError } from "./aiAnalysis.js";

test("loading preserves a cached result during refresh", () => {
  const cached = { ticker: "600519", cached: true, analysis: { rating: "neutral" } };
  const state = aiAnalysisReducer({ ...initialAiAnalysisState, result: cached }, { type: "loading" });
  assert.equal(state.status, "loading");
  assert.equal(state.result, cached);
});

test("unauthorized clears the in-memory analysis password flag", () => {
  const state = aiAnalysisReducer(initialAiAnalysisState, {
    type: "error",
    error: { code: "invalid_analysis_password" },
  });
  assert.equal(state.needsPassword, true);
});

test("normalizes nested FastAPI error codes", () => {
  assert.deepEqual(normalizeAiError(401, { detail: { code: "invalid_analysis_password" } }), {
    status: 401,
    code: "invalid_analysis_password",
    retryAfter: null,
  });
});

test("refresh failure keeps the last valid analysis visible", () => {
  const result = { ticker: "600519", cached: true, analysis: { rating: "bullish" } };
  const state = aiAnalysisReducer(
    { status: "loading", result, error: null, needsPassword: false },
    { type: "error", error: { code: "upstream_timeout" } },
  );
  assert.equal(state.status, "error");
  assert.equal(state.result, result);
  assert.equal(state.error.code, "upstream_timeout");
});

test("password-required state keeps a previously visible analysis", () => {
  const result = { ticker: "600519", cached: true, analysis: { rating: "neutral" } };
  const state = aiAnalysisReducer({ ...initialAiAnalysisState, result }, { type: "password-required" });
  assert.equal(state.result, result);
  assert.equal(state.needsPassword, true);
});

test("shows an AI result only for the current ticker and language", () => {
  const result = { ticker: "600519", lang: "zh", analysis: { rating: "bullish" } };
  assert.equal(getVisibleAiResult(result, "600519", "zh"), result);
  assert.equal(getVisibleAiResult(result, "NVDA", "zh"), null);
  assert.equal(getVisibleAiResult(result, "600519", "en"), null);
  assert.equal(getVisibleAiResult(null, "600519", "zh"), null);
});
