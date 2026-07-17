import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyStockSearchSnapshot,
  deriveMacroSourceStatus,
  deriveStockSourceStatus,
  retainStockSearchSnapshot,
} from "./dataSourceStatus.js";

test("describes live, cached, stale, and fallback equity sources", () => {
  assert.deepEqual(deriveStockSourceStatus({
    realtimeState: "live",
    realtimeQuote: { provider: "eastmoney", market_time: "10:31:02" },
    realtimeMeta: {},
    lang: "zh",
  }), {
    kind: "live",
    label: "eastmoney · 实时 · 10:31:02",
    provider: "eastmoney",
  });
  assert.deepEqual(deriveStockSourceStatus({
    realtimeState: "cached",
    realtimeQuote: { market_date: "2026-07-15" },
    realtimeMeta: { quote: { provider: "cache" }, market_status: "after_close", notice: "normal closed-market cache" },
    lang: "en",
  }), {
    kind: "cached",
    label: "cache · after close · 2026-07-15",
    provider: "cache",
  });
  assert.equal(deriveStockSourceStatus({
    realtimeState: "stale",
    realtimeQuote: { provider: "cache" },
    realtimeMeta: {},
    lang: "zh",
  }).label, "cache · 缓存重试中");
  assert.deepEqual(deriveStockSourceStatus({
    realtimeState: "idle",
    realtimeMeta: {},
    stockSnapshot: { source: "fallback", warning: "provider unavailable" },
    lang: "en",
  }), {
    kind: "degraded",
    label: "fallback · degraded",
    provider: null,
    message: "provider unavailable",
    retryTarget: "snapshot",
  });
});

test("keeps ordinary closed-market notices informational but exposes retries", () => {
  const base = { realtimeState: "idle", realtimeMeta: {}, lang: "en" };
  assert.deepEqual(deriveStockSourceStatus({ ...base, stockSnapshot: { source: "fallback" } }), {
    kind: "mock",
    label: "fallback · mock",
    provider: null,
  });
  assert.deepEqual(deriveStockSourceStatus({ ...base, stockSnapshotStatus: "loading" }), {
    kind: "loading",
    label: "mock · refreshing",
    provider: null,
    message: "Refreshing equity data; available content remains visible.",
  });
  assert.deepEqual(deriveStockSourceStatus({
    ...base,
    stockSnapshotStatus: "error",
    stockSnapshotError: new Error("offline"),
  }), {
    kind: "degraded",
    label: "mock · degraded",
    provider: null,
    message: "Equity data refresh failed; available content remains visible.",
    retryTarget: "snapshot",
  });
});

test("distinguishes no search matches from provider errors and retains only same-query results", () => {
  assert.equal(classifyStockSearchSnapshot({ stocks: [{ ticker: "600519" }] }), "ready");
  assert.equal(classifyStockSearchSnapshot({ stocks: [], warning: "symbol or company name not found" }), "empty");
  assert.equal(classifyStockSearchSnapshot({ stocks: [], warning: "remote A-share search failed: timeout" }), "error");
  const previous = { query: "600", stocks: [{ ticker: "600519" }], source: "search-api" };
  const failedRetry = { query: "600", stocks: [], warning: "remote A-share search failed: timeout" };
  assert.deepEqual(retainStockSearchSnapshot(previous, failedRetry, "error"), {
    ...previous,
    warning: failedRetry.warning,
  });
  assert.equal(retainStockSearchSnapshot(previous, { ...failedRetry, query: "NVDA" }, "error").stocks.length, 0);
});

test("describes macro loading, fallback, partial series, and request failure", () => {
  assert.deepEqual(deriveMacroSourceStatus({ requestStatus: "loading", snapshot: null, error: null, lang: "en" }), {
    kind: "loading",
    label: "mock · refreshing",
    message: "Refreshing macro data; fallback remains visible…",
  });
  assert.deepEqual(deriveMacroSourceStatus({ requestStatus: "ready", snapshot: { source: "fallback" }, error: null, lang: "en" }), {
    kind: "mock",
    label: "fallback · mock",
    message: "",
  });
  assert.deepEqual(deriveMacroSourceStatus({
    requestStatus: "ready",
    snapshot: { source: "akshare", series: [{ key: "PMI", source: "mock", error: "PMI provider timeout" }] },
    error: null,
    lang: "en",
  }), {
    kind: "degraded",
    label: "akshare · degraded",
    message: "PMI provider timeout",
  });
  assert.deepEqual(deriveMacroSourceStatus({ requestStatus: "error", snapshot: null, error: new Error("offline"), lang: "en" }), {
    kind: "degraded",
    label: "mock · degraded",
    message: "Macro data refresh failed; fallback remains visible.",
  });
});
