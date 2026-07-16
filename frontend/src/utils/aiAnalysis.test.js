import test from "node:test";
import assert from "node:assert/strict";

import { aiAnalysisReducer, initialAiAnalysisState, normalizeAiError } from "./aiAnalysis.js";

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
