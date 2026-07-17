import test from "node:test";
import assert from "node:assert/strict";

import { copy } from "../i18n/copy.js";
import { buildMarkdownReport } from "./reportExport.js";

test("retains selected stock, all-market ranking, macro, source notice, and provider chain", () => {
  const report = buildMarkdownReport({
    lang: "zh",
    t: copy.zh,
    selectedStock: { ticker: "600519", name: "Kweichow Moutai", exchange: "SSE", sector: "Consumer", currency: "¥", price: 1468.6, chg: 0.7, score: 83, pe: 23.4, growth: 15.1, rsi: 56 },
    filteredStocks: [{ ticker: "600519", name: "Kweichow Moutai", sector: "Consumer", currency: "¥", price: 1468.6, chg: 0.7, score: 83 }],
    macroScores: { growth: 61, liquidity: 68, inflation: 43, external: 52 },
    cycle: "Recovery",
    macroSeries: [{ key: "PMI", group: "Growth", value: 50.4, unit: "", score: 58, api: "macro_china_pmi()" }],
    stockSource: "eastmoney · 实时",
    macroSource: "akshare-cache",
    realtimeMeta: { warning: "fallback active" },
    providerDiag: [{ provider: "eastmoney", result: "ok", duration_ms: 82, error: null }],
  });

  assert.match(report, /600519/);
  assert.match(report, /全市场股票排名 Top 10/);
  assert.match(report, /PMI/);
  assert.match(report, /eastmoney · 实时/);
  assert.match(report, /akshare-cache/);
  assert.match(report, /fallback active/);
  assert.match(report, /eastmoney \| ok \| 82ms/);
});
