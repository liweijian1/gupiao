# Decision Cockpit UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing single-screen stock and macro terminal as the approved Decision Cockpit: equity discovery on the left, a dominant selected-stock workspace in the center, a persistent AI research panel on the right, and an independent macro-validation band below.

**Architecture:** Keep `App.jsx` as the data and cross-region state orchestrator while moving presentation and region-local state into six focused components. Preserve all existing hooks, API contracts, AI authentication/cache behavior, Markdown report export, and AI PDF export; add pure view-model helpers where extraction needs testable behavior. Use explicit CSS grid areas for the approved desktop, medium, and mobile hierarchies, with `selectedTicker` and chart `indicator` as the only stock/macro cross-region coordination values.

**Tech Stack:** React 19.2, Vite 6.4.2, Lucide React, plain CSS, Node 22 built-in test runner, existing pdfmake 0.3.11 export path, in-app browser visual verification

## Global Constraints

- Treat `docs/superpowers/specs/assets/2026-07-16-decision-cockpit-ui.png` as the source of truth for layout hierarchy, density, spacing, color, typography, visible content, and component anatomy.
- Preserve the workflow: select an equity → understand price/factors → read or generate AI analysis → validate against macro conditions.
- The command-bar search is equity-only and uses “搜索股票、公司或代码” / “Search stocks, companies, or tickers”.
- `stockQuery` must never filter macro series. `macroQuery` and `activeGroup` live inside `MacroDataMap` and must never change the selected equity, equity query, or AI result.
- A macro row may change only the chart comparison `indicator`; it must not change `selectedTicker` or `stockQuery`.
- Preserve live, cached, stale, mock, and degraded source states with text plus icon/color; color alone is insufficient.
- Preserve the last valid stock, macro, and AI content during refresh whenever possible. Errors and empty states stay scoped to the affected region.
- Preserve AI password handling, cached refresh, settings access, recoverable failures, Markdown report export, and AI PDF visibility/busy/failure behavior.
- Use the existing Lucide icon set and existing hooks/API boundaries. Add no UI library, chart library, route, backend endpoint, deployment change, or new dependency.
- Do not synthesize historical equity prices, volume, AI confidence, or financial scores. The stock trace is explicitly labeled prototype context; macro comparison uses only backend `points`, and realtime market metadata uses only the unified quote fields already returned.
- Use flat graphite/charcoal surfaces, restrained teal `#3fe1c0`, lime `#d6f35b`, muted red `#ff7d87`, thin dividers, and tabular numeric alignment. Do not add gradients, glassmorphism, neon effects, heavy shadows, or cards inside cards.
- Keep body text and primary action labels at least 14px. Reserve 12px only for compact rail labels, source/status metadata, timestamps, and tertiary row details.
- Retain the `1180px` and `760px` breakpoints. Verify `1440×1024`, `1180×900`, `760×900`, and `390×844`.
- Wide layout: 72px rail; approximately 280px discovery, flexible decision workspace, 340px AI; macro evidence spans the full content width.
- Medium layout: 74px rail; 240px discovery plus flexible decision column; AI below the chart; macro spans both columns.
- Mobile order: equity command search → selected-stock identity/chart → AI → collapsible equity discovery → macro scores/conclusion → Macro Data Map. The page itself must not scroll horizontally.
- Interactive rows, filters, chart controls, AI actions, and exports must be keyboard reachable with visible focus. Mobile primary targets must be at least 44×44px.
- Respect `prefers-reduced-motion` for smooth scrolling, spinners, and transitions.
- Keep the application runnable and buildable after every task. Do not touch backend, Nginx, server configuration, or the three pre-existing untracked 2026-07-15 plan files.

---

## File Structure

### Create

- `frontend/src/utils/equityDiscovery.js` — pure equity-universe merge, quote overlay, selection fallback, factor/query sorting, and market classification.
- `frontend/src/utils/equityDiscovery.test.js` — TDD coverage for the equity view model and market scopes.
- `frontend/src/utils/dataSourceStatus.js` — pure accessible stock/macro source status and equity-search outcome derivation.
- `frontend/src/utils/dataSourceStatus.test.js` — live/cached/stale/mock/degraded status coverage.
- `frontend/src/utils/snapshotRequestState.js` — pure request-state reducer that preserves the last valid snapshot during refresh/failure.
- `frontend/src/utils/snapshotRequestState.test.js` — loading/success/failure retention coverage for stock and macro snapshot hooks.
- `frontend/src/utils/reportExport.test.js` — characterization coverage for the existing Markdown report contract.
- `frontend/src/utils/decisionChart.js` — pure, non-synthetic window selection over the existing prototype trace and real macro points.
- `frontend/src/utils/decisionChart.test.js` — verifies timeframe/indicator windows without inventing financial data.
- `frontend/src/components/AppShell.jsx` — application rail, command bar, global language/settings/report controls, and workspace slot.
- `frontend/src/components/EquityDiscoveryPanel.jsx` — market tabs, factor controls/presets, provider diagnostics, compact accessible equity ranking, and mobile disclosure.
- `frontend/src/components/StockDecisionWorkspace.jsx` — selected-stock identity, quote, native SVG chart, timeframe, comparison indicator, and factor summary.
- `frontend/src/components/AiResearchPanel.jsx` — renamed/evolved AI analysis panel with stable empty/loading/cached/error/result anatomy and existing PDF behavior.
- `frontend/src/components/MacroEvidenceBand.jsx` — macro scores, cycle regime, conclusion, and composition of the data map.
- `frontend/src/components/MacroDataMap.jsx` — locally owned macro query/group state, independent filtering, empty state, and indicator rows.

### Modify

- `frontend/src/App.jsx` — reduce to hooks, data derivation, cross-region state, navigation refs, AI authorization, exports, and component composition.
- `frontend/src/components/AiSettingsDialog.jsx` — add modal focus containment, background inertness, Escape behavior, and focus restoration.
- `frontend/src/i18n/copy.js` — exact bilingual command, market, region, status, chart, AI-refresh, and accessibility copy.
- `frontend/src/styles.css` — replace the current automatic card grid with the approved explicit cockpit areas, flat visual tokens, component styles, responsive rules, focus treatment, and reduced motion.
- `frontend/src/utils/metrics.test.js` — strengthen independent macro filter behavior.
- `frontend/src/utils/aiAnalysis.test.js` — characterize last-valid-result preservation across refresh/password/error states.
- `frontend/src/utils/aiAnalysis.js` — add the ticker/language visibility guard used by the AI panel and PDF export.
- `frontend/src/utils/reportExport.js` — clarify that the exported Top 10 is the all-market filtered ranking.
- `frontend/src/hooks/useMarketData.js` — expose tested snapshot loading/error/retry state and distinguish equity no-match from provider failure.

### Delete after the replacement import is live

- `frontend/src/components/AiAnalysisPanel.jsx` — replaced by `AiResearchPanel.jsx`; do not keep both implementations or add a wrapper card.

### Keep unchanged

- `frontend/src/hooks/useAiAnalysis.js`, `frontend/src/api/ai.js`
- `frontend/src/components/MiniBars.jsx`, `frontend/src/components/ScoreGauge.jsx`
- `frontend/src/utils/aiPdfReport.js`, `frontend/src/utils/aiPdfExportState.js`, `frontend/src/utils/reportExport.js`
- All backend and deployment files

---

### Task 1: Extract and protect the equity discovery view model

**Files:**
- Create: `frontend/src/utils/equityDiscovery.js`
- Create: `frontend/src/utils/equityDiscovery.test.js`
- Modify: `frontend/src/App.jsx:37,109-135,155,163-190`

**Interfaces:**
- Produces: `EQUITY_MARKETS: readonly ["CN", "HK", "US"]`; `filterEquitiesByMarket` still accepts internal `"All"` for unscoped tests/callers.
- Produces: `marketForExchange(exchange: string) -> "CN" | "HK" | "US" | null`.
- Produces: `filterEquitiesByMarket(items: Equity[], market: string) -> Equity[]`.
- Produces: `mergeEquityUniverses(...universes: Equity[][]) -> Equity[]`, preserving ticker order while letting later search/realtime objects replace earlier snapshot detail.
- Produces: `applyRealtimeQuote(items: Equity[], quote?: Quote) -> Equity[]` without mutating `items`, preserving the unified quote's open/high/low/previous-close/volume/amount/turnover metadata for the selected-stock workspace.
- Produces: `resolveSelectedEquity(items: Equity[], ticker: string, fallback: Equity) -> Equity`.
- Produces: `filterAndSortEquities(items: Equity[], options) -> Equity[]`, preserving the existing rule that a non-empty text query bypasses the factor gate.

- [ ] **Step 1: Write the failing pure-function tests**

Create `frontend/src/utils/equityDiscovery.test.js` with this complete content:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUITY_MARKETS,
  applyRealtimeQuote,
  filterAndSortEquities,
  filterEquitiesByMarket,
  marketForExchange,
  mergeEquityUniverses,
  resolveSelectedEquity,
} from "./equityDiscovery.js";

const factors = {
  momentum: 68,
  quality: 52,
  valuation: 35,
  liquidity: 70,
  volatility: 45,
};

const equities = [
  { ticker: "NVDA", name: "NVIDIA", aliases: ["英伟达"], exchange: "NASDAQ", sector: "Semis", price: 178, score: 92, growth: 31, trend: 88, pe: 38, liquidity: 96, beta: 1.5 },
  { ticker: "600519", name: "Kweichow Moutai", aliases: ["贵州茅台"], exchange: "SSE", sector: "Consumer", price: 1468, score: 83, growth: 15, trend: 73, pe: 23, liquidity: 88, beta: 0.6 },
  { ticker: "0700.HK", name: "Tencent", aliases: ["腾讯控股"], exchange: "HKEX", sector: "Internet", price: 418, score: 25, growth: 5, trend: 20, pe: 19, liquidity: 40, beta: 1.1 },
];

test("classifies supported exchanges into stable market scopes", () => {
  assert.deepEqual(EQUITY_MARKETS, ["CN", "HK", "US"]);
  assert.equal(marketForExchange("SSE"), "CN");
  assert.equal(marketForExchange("szse"), "CN");
  assert.equal(marketForExchange("BSE"), "CN");
  assert.equal(marketForExchange("HKEX"), "HK");
  assert.equal(marketForExchange("NASDAQ"), "US");
  assert.equal(marketForExchange("NYSE"), "US");
  assert.equal(marketForExchange("unknown"), null);
});

test("filters a copy of the equity list by market", () => {
  assert.deepEqual(filterEquitiesByMarket(equities, "All"), equities);
  assert.deepEqual(filterEquitiesByMarket(equities, "CN"), [equities[1]]);
  assert.deepEqual(filterEquitiesByMarket(equities, "HK"), [equities[2]]);
  assert.deepEqual(filterEquitiesByMarket(equities, "US"), [equities[0]]);
  assert.notEqual(filterEquitiesByMarket(equities, "All"), equities);
});

test("merges universes by ticker while letting later detail replace snapshots", () => {
  const newerNvda = { ...equities[0], price: 999 };
  assert.deepEqual(
    mergeEquityUniverses([equities[0], equities[1]], [newerNvda, equities[2]]),
    [newerNvda, equities[1], equities[2]],
  );
});

test("overlays a realtime quote and its essential market metadata only on the matching equity", () => {
  const result = applyRealtimeQuote(equities, {
    ticker: "600519",
    price: 1500,
    chg: 1.2,
    high: 1512,
    low: 1488,
    volume: 123456,
    source: "eastmoney",
  });
  assert.equal(result[0], equities[0]);
  assert.deepEqual(result[1], {
    ...equities[1],
    price: 1500,
    chg: 1.2,
    high: 1512,
    low: 1488,
    volume: 123456,
    source: "eastmoney",
  });
  const detailUniverse = mergeEquityUniverses(equities, result);
  assert.equal(resolveSelectedEquity(detailUniverse, "600519", equities[0]).price, 1500);
  assert.equal(equities[1].price, 1468);
});

test("resolves the selected equity and falls back without clearing the universe", () => {
  assert.equal(resolveSelectedEquity(equities, "600519", equities[0]), equities[1]);
  assert.equal(resolveSelectedEquity([], "missing", equities[0]), equities[0]);
  assert.equal(resolveSelectedEquity(equities, "missing", equities[0]), equities[0]);
});

test("empty query applies the existing factor gate and sort order", () => {
  const input = structuredClone(equities);
  const result = filterAndSortEquities(input, {
    query: "",
    factors,
    sortKey: "score",
    sectorLabels: { Semis: "半导体", Consumer: "消费", Internet: "互联网" },
  });
  assert.deepEqual(result.map((item) => item.ticker), ["NVDA", "600519"]);
  assert.deepEqual(input, equities);
});

test("text query matches aliases and localized sectors while bypassing factors", () => {
  assert.deepEqual(
    filterAndSortEquities(equities, {
      query: "腾讯",
      factors,
      sortKey: "score",
      sectorLabels: { Internet: "互联网" },
    }).map((item) => item.ticker),
    ["0700.HK"],
  );
  assert.deepEqual(
    filterAndSortEquities(equities, {
      query: "半导体",
      factors,
      sortKey: "score",
      sectorLabels: { Semis: "半导体" },
    }).map((item) => item.ticker),
    ["NVDA"],
  );
});

test("sorts numeric discovery fields descending without mutating input order", () => {
  const originalOrder = equities.map((item) => item.ticker);
  const result = filterAndSortEquities(equities, {
    query: "a",
    factors,
    sortKey: "growth",
    sectorLabels: {},
  });
  assert.deepEqual(result.map((item) => item.ticker), ["NVDA", "600519"]);
  assert.deepEqual(equities.map((item) => item.ticker), originalOrder);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```bash
cd frontend
node --test src/utils/equityDiscovery.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `equityDiscovery.js`.

- [ ] **Step 3: Implement the complete pure view model**

Create `frontend/src/utils/equityDiscovery.js` with this content:

```js
import { searchableText } from "./metrics.js";

export const EQUITY_MARKETS = Object.freeze(["CN", "HK", "US"]);

const EXCHANGE_MARKETS = Object.freeze({
  SSE: "CN",
  SZSE: "CN",
  BSE: "CN",
  "A-SHARE": "CN",
  HKEX: "HK",
  NASDAQ: "US",
  NYSE: "US",
  AMEX: "US",
});

export function marketForExchange(exchange) {
  return EXCHANGE_MARKETS[String(exchange ?? "").trim().toUpperCase()] ?? null;
}

export function filterEquitiesByMarket(items, market = "All") {
  const equities = Array.isArray(items) ? items : [];
  if (market === "All") return [...equities];
  return equities.filter((item) => marketForExchange(item.exchange) === market);
}

export function mergeEquityUniverses(...universes) {
  const byTicker = new Map();
  universes.flatMap((items) => (Array.isArray(items) ? items : [])).forEach((item) => {
    if (item?.ticker) byTicker.set(item.ticker, item);
  });
  return [...byTicker.values()];
}

export function applyRealtimeQuote(items, quote) {
  const equities = Array.isArray(items) ? items : [];
  if (!quote?.ticker) return [...equities];
  return equities.map((item) => (
    item.ticker === quote.ticker
      ? { ...item, ...quote, ticker: item.ticker, name: quote.name ?? item.name }
      : item
  ));
}

export function resolveSelectedEquity(items, ticker, fallback) {
  const equities = Array.isArray(items) ? items : [];
  return equities.find((item) => item.ticker === ticker) ?? equities[0] ?? fallback;
}

export function filterAndSortEquities(
  items,
  { query = "", factors, sortKey = "score", sectorLabels = {} },
) {
  const normalizedQuery = query.trim().toLowerCase();
  const activeFactors = factors ?? {
    momentum: 0,
    quality: 0,
    valuation: 0,
    liquidity: 0,
    volatility: 0,
  };

  return (Array.isArray(items) ? items : [])
    .filter((stock) => {
      const matchesQuery = normalizedQuery.length === 0 || searchableText(
        stock.ticker,
        stock.name,
        stock.aliases?.join(" "),
        stock.exchange,
        stock.sector,
        sectorLabels[stock.sector],
        stock.price,
        stock.score,
        stock.growth,
        stock.rsi,
      ).includes(normalizedQuery);
      const factorGate =
        stock.trend >= activeFactors.momentum - 25 &&
        stock.score >= activeFactors.quality - 10 &&
        stock.pe <= 65 - activeFactors.valuation * 0.35 &&
        stock.liquidity >= activeFactors.liquidity - 20 &&
        stock.beta <= 2.2 - activeFactors.volatility * 0.012;
      return matchesQuery && (normalizedQuery.length > 0 || factorGate);
    })
    .sort((left, right) => Number(right[sortKey] ?? 0) - Number(left[sortKey] ?? 0));
}
```

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run:

```bash
cd frontend
node --test src/utils/equityDiscovery.test.js
```

Expected: 8 tests pass, 0 fail.

- [ ] **Step 5: Replace App's inline equity derivation with the tested functions**

Add this import in `frontend/src/App.jsx` and remove `searchableText` from the metrics import:

```js
import {
  applyRealtimeQuote,
  filterAndSortEquities,
  mergeEquityUniverses,
  resolveSelectedEquity,
} from "./utils/equityDiscovery.js";
import { filterMacroSeries, weightedScore, zScore } from "./utils/metrics.js";
```

Replace the existing universe merge/quote blocks with:

```js
const stockUniverse = useMemo(() => mergeEquityUniverses(
  stocks.map((stock) => ({ ...stock, source: stock.source ?? "prototype" })),
  stockSnapshot?.stocks ?? [],
), [stockSnapshot]);

const activeStockUniverse = stockQuery.trim() && searchSnapshot
  ? searchSnapshot.stocks ?? []
  : stockUniverse;

const baseDetailStockUniverse = useMemo(
  () => mergeEquityUniverses(stockUniverse, activeStockUniverse),
  [activeStockUniverse, stockUniverse],
);
const selectedStockBase = resolveSelectedEquity(baseDetailStockUniverse, selectedTicker, stocks[0]);
const { realtimeQuote, realtimeMeta, realtimeState } = useRealtimeQuote(selectedStockBase);
const providerHealth = useProviderHealth(realtimeMeta?.updated_at);

const displayedStockUniverse = useMemo(
  () => applyRealtimeQuote(activeStockUniverse, realtimeQuote),
  [activeStockUniverse, realtimeQuote],
);
const detailStockUniverse = useMemo(
  () => mergeEquityUniverses(stockUniverse, displayedStockUniverse),
  [displayedStockUniverse, stockUniverse],
);
```

Always merge the built-in cross-market prototype rows before snapshot rows. A successful Baostock snapshot can be A-share-only; replacing the whole universe would make the approved HK/US tabs empty. Later snapshot/search objects still win by ticker, and each row retains a truthful `source` (`prototype`, `fallback`, `baostock`, or `akshare`).

Replace the selected-stock and filtering assignments with:

```js
const selectedStock = resolveSelectedEquity(detailStockUniverse, selectedTicker, stocks[0]);

useEffect(() => {
  const selectedStillExists = detailStockUniverse.some(
    (stock) => stock.ticker === selectedTicker,
  );
  if (!selectedStillExists && selectedStock.ticker !== selectedTicker) {
    setSelectedTicker(selectedStock.ticker);
  }
}, [detailStockUniverse, selectedStock.ticker, selectedTicker]);

const filteredStocks = useMemo(() => filterAndSortEquities(displayedStockUniverse, {
  query: stockQuery,
  factors,
  sortKey,
  sectorLabels: t.sectors,
}), [displayedStockUniverse, factors, sortKey, stockQuery, t.sectors]);
```

Keep the existing auto-selection effect exactly after `filteredStocks`; it remains the only query-driven equity selection effect:

```js
useEffect(() => {
  const selectedIsVisible = filteredStocks.some(
    (stock) => stock.ticker === selectedTicker,
  );
  if (stockQuery.trim().length > 0 && filteredStocks.length > 0 && !selectedIsVisible) {
    setSelectedTicker(filteredStocks[0].ticker);
  }
}, [filteredStocks, selectedTicker, stockQuery]);
```

The first effect reconciles `selectedTicker` with the stock that is actually rendered after a remote-only search result disappears; it prevents the ranking highlight, quote hook, AI request, and exports from referring to different tickers. The second effect remains the only query-driven auto-selection rule, but it selects the first result only when the current ticker is absent. A quote refresh or resort must not pull a user-selected second row back to the first result.

- [ ] **Step 6: Run all tests and the production build**

Run:

```bash
cd frontend
npm test
npm run build
```

Expected: 25 tests pass and Vite exits `0` with a production bundle.

- [ ] **Step 7: Commit the equity view-model extraction**

```bash
git add frontend/src/App.jsx frontend/src/utils/equityDiscovery.js frontend/src/utils/equityDiscovery.test.js
git commit -m "refactor: extract equity discovery view model"
```

---

### Task 2: Lock cross-domain, AI-retention, source-status, and report regressions

**Files:**
- Create: `frontend/src/utils/dataSourceStatus.js`
- Create: `frontend/src/utils/dataSourceStatus.test.js`
- Create: `frontend/src/utils/snapshotRequestState.js`
- Create: `frontend/src/utils/snapshotRequestState.test.js`
- Create: `frontend/src/utils/reportExport.test.js`
- Modify: `frontend/src/utils/metrics.test.js`
- Modify: `frontend/src/utils/aiAnalysis.test.js`
- Modify: `frontend/src/utils/reportExport.js`
- Modify: `frontend/src/hooks/useMarketData.js:1-67,69-122`
- Modify: `frontend/src/App.jsx:205-224,253-272`

**Interfaces:**
- Produces: `deriveStockSourceStatus(input) -> { kind: "loading" | "live" | "cached" | "stale" | "mock" | "degraded", label, provider, message?, retryTarget? }`; normal closed-market `notice` stays informational and never causes degradation.
- Produces: `deriveMacroSourceStatus({ requestStatus, snapshot, error, lang }) -> { kind, label, message }`.
- Produces: `classifyStockSearchSnapshot(snapshot) -> "ready" | "empty" | "error"`.
- Produces: `retainStockSearchSnapshot(previous, next, outcome)`, keeping rows only for a failed retry of the same query and never leaking rows across different queries.
- Produces: `snapshotRequestReducer(state, event)` and `initialSnapshotRequestState`, preserving `state.snapshot` on `start` and `failure`.
- Changes: `useMacroSnapshot()` and `useStockSnapshot()` return `{ snapshot, status, error, retry }` instead of a bare snapshot.
- Changes: `useStockSearch(query)` returns `{ searchSnapshot, searchState, retrySearch }`; no-match is `empty`, while only provider/transport failures are `error`.
- Preserves: `filterMacroSeries(items, { group, query, macroLabels, groupLabels })`; no stock query parameter is added.
- Preserves: `buildMarkdownReport(...)` output fields and the current reducer rule that failures do not clear a valid AI result.
- Clarifies: the Markdown Top 10 is the all-market filtered ranking; panel-local CN/HK/US tabs change only the discovery view.

- [ ] **Step 1: Add the failing source-status test file**

Create `frontend/src/utils/dataSourceStatus.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyStockSearchSnapshot,
  deriveMacroSourceStatus,
  deriveStockSourceStatus,
  retainStockSearchSnapshot,
} from "./dataSourceStatus.js";

test("describes a live quote with provider and market time", () => {
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
    realtimeState: "live",
    realtimeQuote: { provider: "eastmoney" },
    realtimeMeta: { warning: "realtime provider fell back to cache" },
    lang: "en",
  }), {
    kind: "degraded",
    label: "eastmoney · realtime · degraded",
    provider: "eastmoney",
    message: "realtime provider fell back to cache",
    retryTarget: "realtime-auto",
  });
  assert.deepEqual(deriveStockSourceStatus({
    realtimeState: "loading",
    realtimeMeta: {},
    stockSnapshot: { source: "stock-api" },
    lang: "en",
  }), {
    kind: "loading",
    label: "stock-api · refreshing",
    provider: null,
    message: "Refreshing the selected quote; equity rows remain available.",
  });
});

test("describes a cached closed-market quote in both languages", () => {
  const input = {
    realtimeState: "cached",
    realtimeQuote: { market_date: "2026-07-15" },
    realtimeMeta: { quote: { provider: "cache" }, market_status: "after_close", notice: "normal closed-market cache" },
  };
  assert.deepEqual(deriveStockSourceStatus({ ...input, lang: "zh" }), {
    kind: "cached",
    label: "cache · 收盘后 · 2026-07-15",
    provider: "cache",
  });
  assert.equal(deriveStockSourceStatus({ ...input, lang: "en" }).label, "cache · after close · 2026-07-15");
});

test("labels stale retries and degraded fallback with text", () => {
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
    stockQuery: "",
    lang: "en",
  }), {
    kind: "degraded",
    label: "fallback · degraded",
    provider: null,
    message: "provider unavailable",
    retryTarget: "snapshot",
  });
});

test("uses search source, snapshot source, then mock in that order", () => {
  const base = { realtimeState: "idle", realtimeMeta: {}, lang: "en" };
  assert.equal(deriveStockSourceStatus({
    ...base,
    stockQuery: "600519",
    searchSnapshot: { source: "search-api" },
    stockSnapshot: { source: "snapshot-api" },
  }).label, "search-api · cached");
  assert.equal(deriveStockSourceStatus({
    ...base,
    stockQuery: "",
    stockSnapshot: { source: "snapshot-api" },
  }).label, "snapshot-api · cached");
  assert.deepEqual(deriveStockSourceStatus(base), {
    kind: "mock",
    label: "mock",
    provider: null,
  });
  assert.deepEqual(deriveStockSourceStatus({
    ...base,
    stockSnapshot: { source: "fallback" },
  }), {
    kind: "mock",
    label: "fallback · mock",
    provider: null,
  });
  assert.deepEqual(deriveStockSourceStatus({
    ...base,
    stockSnapshotStatus: "loading",
  }), {
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

test("distinguishes an empty equity search from provider failure", () => {
  assert.equal(classifyStockSearchSnapshot({ stocks: [{ ticker: "600519" }] }), "ready");
  assert.equal(classifyStockSearchSnapshot({ stocks: [], warning: "symbol or company name not found" }), "empty");
  assert.equal(classifyStockSearchSnapshot({ stocks: [], warning: "remote A-share search failed: timeout" }), "error");
  assert.equal(classifyStockSearchSnapshot({ stocks: [] }), "empty");
  const previous = { query: "600", stocks: [{ ticker: "600519" }], source: "search-api" };
  const failedRetry = { query: "600", stocks: [], warning: "remote A-share search failed: timeout" };
  assert.deepEqual(retainStockSearchSnapshot(previous, failedRetry, "error"), {
    ...previous,
    warning: failedRetry.warning,
  });
  assert.equal(
    retainStockSearchSnapshot(previous, { ...failedRetry, query: "NVDA" }, "error").stocks.length,
    0,
  );
});

test("describes macro loading, fallback, warning, and request failure", () => {
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
  assert.deepEqual(deriveMacroSourceStatus({ requestStatus: "ready", snapshot: { source: "akshare", warning: "partial fallback" }, error: null, lang: "en" }), {
    kind: "degraded",
    label: "akshare · degraded",
    message: "partial fallback",
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
```

- [ ] **Step 2: Add snapshot-retention coverage and extend macro/AI characterization**

Create `frontend/src/utils/snapshotRequestState.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  initialSnapshotRequestState,
  snapshotRequestReducer,
} from "./snapshotRequestState.js";

test("preserves the last valid snapshot during refresh and failure", () => {
  const snapshot = { source: "akshare", rows: [1, 2, 3] };
  const ready = snapshotRequestReducer(initialSnapshotRequestState, { type: "success", snapshot });
  assert.deepEqual(ready, { status: "ready", snapshot, error: null });

  const refreshing = snapshotRequestReducer(ready, { type: "start" });
  assert.deepEqual(refreshing, { status: "loading", snapshot, error: null });

  const error = new Error("offline");
  const failed = snapshotRequestReducer(refreshing, { type: "failure", error });
  assert.deepEqual(failed, { status: "error", snapshot, error });
});
```

Append to `frontend/src/utils/metrics.test.js`:

```js
test("macro filtering searches zero values, source, and API without mutating input", () => {
  const extended = [
    ...items,
    { key: "Zero", group: "External", api: "zero_api()", value: 0, score: 0, source: "fallback-cache" },
  ];
  const before = structuredClone(extended);
  const extendedOptions = {
    ...options,
    macroLabels: { ...options.macroLabels, Zero: "零值指标" },
    groupLabels: { ...options.groupLabels, External: "外部" },
  };
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, query: "zero_api" }), [extended[3]]);
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, query: "fallback-cache" }), [extended[3]]);
  assert.deepEqual(filterMacroSeries(extended, { ...extendedOptions, group: "External", query: "0" }), [extended[3]]);
  assert.deepEqual(extended, before);
});
```

Append to `frontend/src/utils/aiAnalysis.test.js`:

```js
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
  const state = aiAnalysisReducer(
    { ...initialAiAnalysisState, result },
    { type: "password-required" },
  );
  assert.equal(state.result, result);
  assert.equal(state.needsPassword, true);
});
```

- [ ] **Step 3: Add the complete Markdown report characterization test**

Create `frontend/src/utils/reportExport.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { copy } from "../i18n/copy.js";
import { buildMarkdownReport } from "./reportExport.js";

test("retains selected stock, ranking, macro, source notice, and provider chain", () => {
  const report = buildMarkdownReport({
    lang: "zh",
    t: copy.zh,
    selectedStock: {
      ticker: "600519",
      name: "Kweichow Moutai",
      exchange: "SSE",
      sector: "Consumer",
      currency: "¥",
      price: 1468.6,
      chg: 0.7,
      score: 83,
      pe: 23.4,
      growth: 15.1,
      rsi: 56,
    },
    filteredStocks: [{
      ticker: "600519",
      name: "Kweichow Moutai",
      sector: "Consumer",
      currency: "¥",
      price: 1468.6,
      chg: 0.7,
      score: 83,
    }],
    macroScores: { growth: 61, liquidity: 68, inflation: 43, external: 52 },
    cycle: "Recovery",
    macroSeries: [{ key: "PMI", group: "Growth", value: 50.4, unit: "", score: 58, api: "macro_china_pmi()" }],
    stockSource: "eastmoney · 实时",
    macroSource: "akshare-cache",
    realtimeMeta: { warning: "fallback active" },
    providerDiag: [{ provider: "eastmoney", result: "ok", duration_ms: 82, error: null }],
  });

  assert.match(report, /600519/);
  assert.match(report, /贵州茅台|Kweichow Moutai/);
  assert.match(report, /全市场股票排名 Top 10/);
  assert.match(report, /PMI/);
  assert.match(report, /eastmoney · 实时/);
  assert.match(report, /akshare-cache/);
  assert.match(report, /fallback active/);
  assert.match(report, /eastmoney \| ok \| 82ms/);
});
```

In `frontend/src/utils/reportExport.js`, change only the ranking heading so the export does not imply that the panel-local market tab filters the report:

```js
`## ${isZh ? "全市场股票排名 Top 10" : "All-market ranked equities Top 10"}`,
```

- [ ] **Step 4: Run the focused tests to verify RED**

Run:

```bash
cd frontend
node --test \
  src/utils/dataSourceStatus.test.js \
  src/utils/snapshotRequestState.test.js \
  src/utils/metrics.test.js \
  src/utils/aiAnalysis.test.js \
  src/utils/reportExport.test.js
```

Expected: the existing characterization assertions pass during collection, and the command fails because `dataSourceStatus.js` and `snapshotRequestState.js` do not exist.

- [ ] **Step 5: Implement accessible source-status derivation**

Create `frontend/src/utils/dataSourceStatus.js`:

```js
const MARKET_STATUS = Object.freeze({
  zh: {
    before_open: "盘前",
    pre_market: "集合竞价",
    open: "交易中",
    lunch_break: "午休",
    after_close: "收盘后",
    weekend: "周末",
    closed: "休市",
  },
  en: {
    before_open: "before open",
    pre_market: "pre-market",
    open: "open",
    lunch_break: "lunch",
    after_close: "after close",
    weekend: "weekend",
    closed: "closed",
  },
});

function getMarketStatusLabel(meta, lang) {
  const labels = MARKET_STATUS[lang] ?? MARKET_STATUS.en;
  if (meta?.market_status && labels[meta.market_status]) return labels[meta.market_status];
  return meta?.market_open ? labels.open : labels.closed;
}

export function deriveStockSourceStatus({
  realtimeState,
  realtimeQuote,
  realtimeMeta,
  lang = "en",
  stockQuery = "",
  searchSnapshot,
  searchState = "idle",
  stockSnapshot,
  stockSnapshotStatus = "ready",
  stockSnapshotError,
}) {
  const provider = realtimeQuote?.provider ?? realtimeMeta?.quote?.provider ?? null;
  const fallback =
    (stockQuery.trim() && searchSnapshot?.source) ||
    stockSnapshot?.source ||
    "mock";
  const searchWarning = searchState === "error" ? searchSnapshot?.warning : null;
  const snapshotFailed = stockSnapshotStatus === "error";
  const warning =
    searchWarning ||
    (snapshotFailed ? stockSnapshotError?.message || "snapshot request failed" : null) ||
    stockSnapshot?.warning ||
    realtimeMeta?.warning ||
    null;

  let message = null;
  let retryTarget = null;
  if (searchWarning) {
    message = String(searchWarning);
    retryTarget = "search";
  } else if (snapshotFailed) {
    message = lang === "zh"
      ? "股票数据刷新失败；已保留可用内容。"
      : "Equity data refresh failed; available content remains visible.";
    retryTarget = "snapshot";
  } else if (stockSnapshotStatus === "loading") {
    message = lang === "zh"
      ? "正在刷新股票数据；已保留可用内容。"
      : "Refreshing equity data; available content remains visible.";
  } else if (stockSnapshot?.warning) {
    message = String(stockSnapshot.warning);
    retryTarget = "snapshot";
  } else if (realtimeMeta?.warning) {
    message = String(realtimeMeta.warning);
    retryTarget = "realtime-auto";
  } else if (realtimeState === "loading") {
    message = lang === "zh"
      ? "正在刷新选中股票行情；股票列表保持可用。"
      : "Refreshing the selected quote; equity rows remain available.";
  }

  const withFeedback = (status) => message
    ? { ...status, message, ...(retryTarget ? { retryTarget } : {}) }
    : status;
  const degradedSuffix = warning ? ` · ${lang === "zh" ? "降级" : "degraded"}` : "";

  if (realtimeState === "loading") {
    return withFeedback({
      kind: "loading",
      label: `${provider ?? fallback} · ${lang === "zh" ? "刷新中" : "refreshing"}`,
      provider,
    });
  }
  if (realtimeState === "live") {
    return withFeedback({
      kind: warning ? "degraded" : "live",
      label: `${provider ?? "realtime"} · ${lang === "zh" ? "实时" : "realtime"}${realtimeQuote?.market_time ? ` · ${realtimeQuote.market_time}` : ""}${degradedSuffix}`,
      provider,
    });
  }
  if (realtimeState === "cached") {
    return withFeedback({
      kind: warning ? "degraded" : "cached",
      label: `${provider ?? "cache"} · ${getMarketStatusLabel(realtimeMeta, lang)}${realtimeQuote?.market_date ? ` · ${realtimeQuote.market_date}` : ""}${degradedSuffix}`,
      provider,
    });
  }
  if (realtimeState === "stale") {
    return withFeedback({
      kind: warning ? "degraded" : "stale",
      label: `${provider ?? "cache"} · ${lang === "zh" ? "缓存重试中" : "cache retry"}${degradedSuffix}`,
      provider,
    });
  }
  if (stockSnapshotStatus === "loading") {
    return withFeedback({
      kind: "loading",
      label: `${fallback} · ${lang === "zh" ? "刷新中" : "refreshing"}`,
      provider,
    });
  }
  if (warning) {
    return withFeedback({
      kind: "degraded",
      label: `${fallback} · ${lang === "zh" ? "降级" : "degraded"}`,
      provider,
    });
  }

  const isMock = ["mock", "fallback"].includes(String(fallback).toLowerCase());
  return {
    kind: isMock ? "mock" : "cached",
    label: fallback === "mock"
      ? "mock"
      : `${fallback} · ${isMock ? (lang === "zh" ? "模拟" : "mock") : (lang === "zh" ? "缓存" : "cached")}`,
    provider,
  };
}

export function classifyStockSearchSnapshot(snapshot) {
  const stocks = Array.isArray(snapshot?.stocks) ? snapshot.stocks : [];
  if (stocks.length > 0) return "ready";
  const warning = String(snapshot?.warning ?? "").toLowerCase();
  if (!warning || warning.includes("not found")) return "empty";
  return "error";
}

export function retainStockSearchSnapshot(previous, next, outcome) {
  if (outcome !== "error") return next;
  const sameQuery = String(previous?.query ?? "") === String(next?.query ?? "");
  if (sameQuery && previous?.stocks?.length > 0) {
    return { ...previous, warning: next?.warning ?? previous.warning };
  }
  return next;
}

export function deriveMacroSourceStatus({
  requestStatus = "loading",
  snapshot,
  error,
  lang = "en",
}) {
  const source = snapshot?.source ?? "mock";
  if (requestStatus === "loading") {
    return {
      kind: "loading",
      label: `${source} · ${lang === "zh" ? "刷新中" : "refreshing"}`,
      message: lang === "zh"
        ? "正在刷新宏观数据；已保留可用内容。"
        : "Refreshing macro data; fallback remains visible…",
    };
  }
  if (requestStatus === "error" || error) {
    return {
      kind: "degraded",
      label: `${source} · ${lang === "zh" ? "降级" : "degraded"}`,
      message: lang === "zh"
        ? "宏观数据刷新失败；已保留可用内容。"
        : "Macro data refresh failed; fallback remains visible.",
    };
  }
  const degradedSeries = snapshot?.series?.find(
    (item) => item?.error || String(item?.source ?? "").toLowerCase() === "mock",
  );
  if (snapshot?.warning || degradedSeries) {
    return {
      kind: "degraded",
      label: `${source} · ${lang === "zh" ? "降级" : "degraded"}`,
      message: String(
        snapshot.warning ||
        degradedSeries.error ||
        (lang === "zh" ? "部分宏观指标正在使用模拟数据。" : "Some macro series are using fallback data."),
      ),
    };
  }
  const isMock = ["mock", "fallback"].includes(String(source).toLowerCase());
  return {
    kind: isMock ? "mock" : "cached",
    label: source === "mock"
      ? "mock"
      : `${source} · ${isMock ? (lang === "zh" ? "模拟" : "mock") : (lang === "zh" ? "缓存" : "cached")}`,
    message: "",
  };
}
```

- [ ] **Step 6: Implement the snapshot reducer and wire the request hooks**

Create `frontend/src/utils/snapshotRequestState.js`:

```js
export const initialSnapshotRequestState = Object.freeze({
  status: "loading",
  snapshot: null,
  error: null,
});

export function snapshotRequestReducer(state, event) {
  switch (event.type) {
    case "start":
      return { ...state, status: "loading", error: null };
    case "success":
      return { status: "ready", snapshot: event.snapshot, error: null };
    case "failure":
      return { ...state, status: "error", error: event.error };
    default:
      return state;
  }
}
```

In `frontend/src/hooks/useMarketData.js`, replace the React import and both snapshot hooks with this request helper:

```js
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
        if (!response.ok) throw new Error(`${label} API returned ${response.status}`);
        return response.json();
      })
      .then((snapshot) => dispatch({ type: "success", snapshot }))
      .catch((error) => {
        if (error.name !== "AbortError") dispatch({ type: "failure", error });
      });

    return () => controller.abort();
  }, [label, path, requestVersion]);

  return { ...state, retry };
}

export function useMacroSnapshot() {
  return useSnapshotRequest("/api/macro/snapshot", "Macro");
}

export function useStockSnapshot() {
  return useSnapshotRequest("/api/stocks/snapshot", "Stock");
}
```

Keep `useStockSearch`, `useProviderHealth`, and `useRealtimeQuote` below those functions. In `useStockSearch`, add a request version and stable manual retry beside its existing state:

```js
const [searchRequestVersion, setSearchRequestVersion] = useState(0);
const retrySearch = useCallback(
  () => setSearchRequestVersion((value) => value + 1),
  [],
);
```

Replace the warning branch after `response.json()` with:

```js
const outcome = classifyStockSearchSnapshot(snapshot);
if (outcome === "error" && attempt === 0) {
  retryTimer = window.setTimeout(() => runSearch(1), 800);
  return;
}
setSearchSnapshot((previous) => retainStockSearchSnapshot(previous, snapshot, outcome));
setSearchState(outcome);
```

At the start of the debounced request, clear rows only when they belong to a different query:

```js
setSearchState("loading");
setSearchSnapshot((previous) => (
  previous?.query === normalizedQuery ? previous : null
));
```

In the final fetch-exception branch, preserve a same-query valid result and attach the new warning instead of replacing it with an empty array:

```js
const failedSnapshot = {
  query: normalizedQuery,
  stocks: [],
  warning: error.message,
};
setSearchSnapshot((previous) => (
  retainStockSearchSnapshot(previous, failedSnapshot, "error")
));
setSearchState("error");
```

Keep the first exception retry. This makes `symbol or company name not found` an `empty` state, retries only actual provider failures, preserves last-valid rows for a same-query retry, and never shows a previous query's rows under a new query.
Add `searchRequestVersion` to the effect dependency array and return `{ searchSnapshot, searchState, retrySearch }`.

- [ ] **Step 7: Replace App's inline source labels with tested request-state objects**

Add:

```js
import {
  deriveMacroSourceStatus,
  deriveStockSourceStatus,
} from "./utils/dataSourceStatus.js";
```

Replace the two bare snapshot-hook calls with:

```js
const {
  snapshot: macroSnapshot,
  status: macroSnapshotStatus,
  error: macroSnapshotError,
  retry: retryMacroSnapshot,
} = useMacroSnapshot();
const {
  snapshot: stockSnapshot,
  status: stockSnapshotStatus,
  error: stockSnapshotError,
  retry: retryStockSnapshot,
} = useStockSnapshot();
const { searchSnapshot, searchState, retrySearch } = useStockSearch(stockQuery);
```

Remove the old two-field `useStockSearch` destructuring.

When mapping `macroSnapshot.series`, preserve `points: item.points`, `latestDate: item.latest_date`, `updatedAt: item.updated_at`, and `error: item.error`. The selected comparison trace consumes those real points; do not derive or synthesize a replacement series. Delete the inline `marketStatusLabel` object and nested `stockSource` ternary, then add:

```js
const stockSourceStatus = deriveStockSourceStatus({
  realtimeState,
  realtimeQuote,
  realtimeMeta,
  lang,
  stockQuery,
  searchSnapshot,
  searchState,
  stockSnapshot,
  stockSnapshotStatus,
  stockSnapshotError,
});
const stockSource = stockSourceStatus.label;
const macroSourceStatus = deriveMacroSourceStatus({
  requestStatus: macroSnapshotStatus,
  snapshot: macroSnapshot,
  error: macroSnapshotError,
  lang,
});
const macroSource = macroSnapshot?.source ?? "mock";
```

Keep `stockSource` and `macroSource` as Markdown report values. Later components consume the full status objects plus `retryStockSnapshot`, `retryMacroSnapshot`, and `retrySearch`; do not discard them as unused during component extraction.

- [ ] **Step 8: Run focused and full verification**

Run:

```bash
cd frontend
node --test \
  src/utils/dataSourceStatus.test.js \
  src/utils/snapshotRequestState.test.js \
  src/utils/metrics.test.js \
  src/utils/aiAnalysis.test.js \
  src/utils/reportExport.test.js
npm test
npm run build
```

Expected: the focused command passes 18 tests; the full suite passes 36 tests; Vite exits `0`.

- [ ] **Step 9: Commit the behavior guards**

```bash
git add \
  frontend/src/App.jsx \
  frontend/src/hooks/useMarketData.js \
  frontend/src/utils/dataSourceStatus.js \
  frontend/src/utils/dataSourceStatus.test.js \
  frontend/src/utils/snapshotRequestState.js \
  frontend/src/utils/snapshotRequestState.test.js \
  frontend/src/utils/metrics.test.js \
  frontend/src/utils/aiAnalysis.test.js \
  frontend/src/utils/reportExport.js \
  frontend/src/utils/reportExport.test.js
git commit -m "test: protect decision cockpit data behavior"
```

---

### Task 3: Isolate the Macro Data Map and compose the macro evidence band

**Files:**
- Create: `frontend/src/components/MacroDataMap.jsx`
- Create: `frontend/src/components/MacroEvidenceBand.jsx`
- Modify: `frontend/src/App.jsx:1-38,42-45,198-204,503-576`
- Modify: `frontend/src/i18n/copy.js`

**Interfaces:**
- `MacroDataMap({ t, series, selectedIndicator, sectionRef, onSelectIndicator })` owns `macroQuery`, `activeGroup`, and `visibleSeries` internally.
- `MacroEvidenceBand({ t, scores, cycle, trendValues, macroSeries, sourceStatus, selectedIndicator, overviewRef, dataMapRef, onRetry, onSelectIndicator })` composes the map while keeping loading/degraded feedback scoped to macro data.
- `onSelectIndicator(key: string)` is the only output from the macro domain to the stock domain.
- Neither macro component accepts `stockQuery`, `selectedTicker`, `onSelectTicker`, or AI state.

- [ ] **Step 1: Add the exact bilingual region copy**

Add these keys at the top level of both locales in `frontend/src/i18n/copy.js`:

```js
// copy.en
macroEvidence: "Macro validation",
macroConclusion: "Current macro conclusion",
macroGroupFilter: "Macro series group",
compareMacro: "Compare this macro series on the price chart",
macroDirection: { up: "Up", flat: "Flat", down: "Down" },
macroSupportScore: "Model support",
retry: "Retry",

// copy.zh
macroEvidence: "宏观验证",
macroConclusion: "当前宏观结论",
macroGroupFilter: "宏观指标分组",
compareMacro: "在价格图表中对比该宏观指标",
macroDirection: { up: "上行", flat: "走平", down: "下行" },
macroSupportScore: "模型支持度",
retry: "重试",
```

- [ ] **Step 2: Create the independent Macro Data Map component**

Create `frontend/src/components/MacroDataMap.jsx`:

```jsx
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { filterMacroSeries, zScore } from "../utils/metrics.js";

const MACRO_GROUPS = ["All", "Growth", "Liquidity", "Inflation", "Property", "Rates", "External"];

export function MacroDataMap({
  t,
  series,
  selectedIndicator,
  sectionRef,
  onSelectIndicator,
}) {
  const [macroQuery, setMacroQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const visibleSeries = useMemo(() => filterMacroSeries(series, {
    group: activeGroup,
    query: macroQuery,
    macroLabels: t.macro,
    groupLabels: t.groups,
  }), [activeGroup, macroQuery, series, t.groups, t.macro]);

  return (
    <section className="macro-data-map nav-target" ref={sectionRef} aria-labelledby="macro-data-map-title">
      <header className="region-heading macro-data-map-heading">
        <div>
          <small>{t.macroSeries}</small>
          <h3 id="macro-data-map-title">{t.macroMap}</h3>
        </div>
        <label className="macro-search">
          <Search size={15} aria-hidden="true" />
          <input
            value={macroQuery}
            onChange={(event) => setMacroQuery(event.target.value)}
            placeholder={t.macroSearch}
            aria-label={t.macroSearch}
          />
        </label>
      </header>

      <div className="segmented macro-groups" role="group" aria-label={t.macroGroupFilter}>
        {MACRO_GROUPS.map((group) => (
          <button
            type="button"
            className={activeGroup === group ? "selected" : ""}
            aria-pressed={activeGroup === group}
            onClick={() => setActiveGroup(group)}
            key={group}
          >
            {t.groups[group]}
          </button>
        ))}
      </div>

      <div className="macro-list">
        {visibleSeries.length === 0 && (
          <p className="macro-empty" role="status">{t.noMacroMatches}</p>
        )}
        {visibleSeries.map((item) => {
          const selected = selectedIndicator === item.key;
          const score = item.score ?? zScore(item.z, item.direction);
          const pointValues = (item.points ?? [])
            .map((point) => Number(point?.value))
            .filter(Number.isFinite);
          const firstPoint = pointValues[0];
          const lastPoint = pointValues.at(-1);
          const tolerance = Math.max(0.000001, Math.abs(firstPoint ?? 0) * 0.001);
          const direction = pointValues.length < 2 || Math.abs(lastPoint - firstPoint) <= tolerance
            ? "flat"
            : lastPoint > firstPoint ? "up" : "down";
          const valueLabel = `${item.value ?? "--"}${item.unit ?? ""}`;
          return (
            <button
              type="button"
              className={`macro-row${selected ? " selected" : ""}`}
              aria-pressed={selected}
              aria-label={`${t.compareMacro}: ${t.macro[item.key] ?? item.key}, ${valueLabel}, ${t.macroSupportScore} ${score}, ${t.macroDirection[direction]}`}
              onClick={() => onSelectIndicator(item.key)}
              key={item.key}
            >
              <span className="macro-row-identity">
                <strong>{t.macro[item.key] ?? item.key}</strong>
                <small>
                  {item.api}
                  {item.source ? ` · ${item.source}` : ""}
                  {item.latestDate ? ` · ${item.latestDate}` : ""}
                  {item.error ? ` · ${item.error}` : ""}
                </small>
              </span>
              <b>{valueLabel}</b>
              <em title={t.macroSupportScore}>{score} · {t.macroDirection[direction]}</em>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create the macro evidence composition**

Create `frontend/src/components/MacroEvidenceBand.jsx`:

```jsx
import { MiniBars } from "./MiniBars.jsx";
import { ScoreGauge } from "./ScoreGauge.jsx";
import { MacroDataMap } from "./MacroDataMap.jsx";

export function MacroEvidenceBand({
  t,
  scores,
  cycle,
  trendValues,
  macroSeries,
  sourceStatus,
  selectedIndicator,
  overviewRef,
  dataMapRef,
  onRetry,
  onSelectIndicator,
}) {
  const { growth, liquidity, inflation, external } = scores;
  const composite = Math.round((growth + liquidity + (100 - inflation)) / 3);
  const cycleX = Math.min(96, Math.max(4, growth));
  const cycleY = Math.min(96, Math.max(4, inflation));

  return (
    <section className="panel macro-evidence-band nav-target" ref={overviewRef} aria-labelledby="macro-evidence-title">
      <div className="macro-evidence-overview">
        <header className="region-heading">
          <div>
            <small>{t.macroModel} · {sourceStatus.label}</small>
            <h2 id="macro-evidence-title">{t.macroEvidence}</h2>
          </div>
          <span className="source-badge" data-source-kind={sourceStatus.kind}>
            {sourceStatus.label}
          </span>
        </header>

        {sourceStatus.message && (
          <div
            className="region-status-message"
            role={sourceStatus.kind === "loading" ? "status" : "alert"}
          >
            <span>{sourceStatus.message}</span>
            {sourceStatus.kind === "degraded" && (
              <button type="button" className="ghost" onClick={onRetry}>{t.retry}</button>
            )}
          </div>
        )}

        <div className="macro-score-grid">
          <ScoreGauge label={t.scores.growth[0]} value={growth} caption={t.scores.growth[1]} />
          <ScoreGauge label={t.scores.liquidity[0]} value={liquidity} caption={t.scores.liquidity[1]} />
          <ScoreGauge label={t.scores.inflation[0]} value={inflation} caption={t.scores.inflation[1]} />
          <ScoreGauge label={t.scores.external[0]} value={external} caption={t.scores.external[1]} />
        </div>

        <div className="regime-row">
          <div className="cycle-map" role="img" aria-label={`${t.macroDashboard}: ${t.cycles[cycle] ?? cycle}`}>
            <span className="axis-x">{t.axes.growth}</span>
            <span className="axis-y">{t.axes.inflation}</span>
            <span className="cycle-dot" style={{ left: `${cycleX}%`, bottom: `${cycleY}%` }}>
              {t.cycles[cycle] ?? cycle}
            </span>
            <small className="q1">{t.cycles.Recovery}</small>
            <small className="q2">{t.cycles.Overheat}</small>
            <small className="q3">{t.cycles.Slowdown}</small>
            <small className="q4">{t.cycles.Stagflation}</small>
          </div>
          <div className="macro-conclusion">
            <div>
              <small>{t.compositeScore}</small>
              <strong>{composite}</strong>
            </div>
            <MiniBars values={trendValues} tone="green" />
            <h3>{t.macroConclusion}</h3>
            <p>{t.currentRead}</p>
          </div>
        </div>
      </div>

      <MacroDataMap
        t={t}
        series={macroSeries}
        selectedIndicator={selectedIndicator}
        sectionRef={dataMapRef}
        onSelectIndicator={onSelectIndicator}
      />
    </section>
  );
}
```

- [ ] **Step 4: Replace the inline macro state and rendering in App**

Add the component import and narrow the metrics import:

```js
import { MacroEvidenceBand } from "./components/MacroEvidenceBand.jsx";
import { weightedScore } from "./utils/metrics.js";
```

Delete these App state values:

```js
const [macroQuery, setMacroQuery] = useState("");
const [activeGroup, setActiveGroup] = useState("All");
```

Delete `macroGroups` and the `visibleMacro` memo. Replace both old macro `<section>` elements with:

```jsx
<MacroEvidenceBand
  t={t}
  scores={{
    growth: growthScore,
    liquidity: liquidityScore,
    inflation: inflationScore,
    external: externalScore,
  }}
  cycle={cycle}
  trendValues={macroTrend}
  macroSeries={macroSeries}
  sourceStatus={macroSourceStatus}
  selectedIndicator={indicator}
  overviewRef={macroRef}
  dataMapRef={dataRef}
  onRetry={retryMacroSnapshot}
  onSelectIndicator={setIndicator}
/>
```

Remove `ScoreGauge`, `Filter`, `filterMacroSeries`, and `zScore` from App imports if no remaining App usage exists. Keep `MiniBars` until Task 6 extracts the equity panel.

- [ ] **Step 5: Verify the structural independence gate**

Run:

```bash
cd frontend
npm test
npm run build
if rg -n "stockQuery|selectedTicker|onSelectTicker|aiAnalysis" src/components/MacroDataMap.jsx src/components/MacroEvidenceBand.jsx; then
  echo "unexpected stock/AI state inside macro components"
  exit 1
fi
if rg -n "macroQuery|activeGroup|visibleMacro|macroGroups" src/App.jsx; then
  echo "unexpected macro filter state inside App"
  exit 1
fi
```

Expected: all tests pass; Vite exits `0`; both forbidden-reference gates exit `0` without printing an error.

- [ ] **Step 6: Commit the macro-domain extraction**

```bash
git add frontend/src/App.jsx frontend/src/i18n/copy.js frontend/src/components/MacroDataMap.jsx frontend/src/components/MacroEvidenceBand.jsx
git commit -m "refactor: isolate macro evidence workspace"
```

---

### Task 4: Extract the selected-stock decision workspace

**Files:**
- Create: `frontend/src/components/StockDecisionWorkspace.jsx`
- Create: `frontend/src/utils/decisionChart.js`
- Create: `frontend/src/utils/decisionChart.test.js`
- Modify: `frontend/src/App.jsx:1-25,46,450-501`
- Modify: `frontend/src/i18n/copy.js`

**Interfaces:**
- Produces: `StockDecisionWorkspace({ t, lang, stock, indicator, indicatorOptions, realtimeMeta, sectionRef, onIndicatorChange })`.
- Owns: `timeframe`, initialized to `"12M"` and preserved when `stock` changes.
- Consumes: controlled `indicator`; changes call `onIndicatorChange(key)` so Macro Data Map and chart remain synchronized.
- Produces: `selectDecisionChartSeries({ baseValues, timeframe, indicator, indicatorOptions }) -> { stockContextValues, comparisonValues }`; timeframes select a window from the existing prototype trace and indicators select actual backend macro points.
- Does not render or own AI analysis state.
- Labels the dependency-free series as a context model because this repository has no historical-price endpoint; it must not be presented as live historical candles.

- [ ] **Step 1: Add the complete bilingual chart copy**

Add to both locale roots in `frontend/src/i18n/copy.js`:

```js
// copy.en
priceContext: "Price and factor context",
timeframe: "Timeframe",
comparison: "Macro comparison",
priceChart: "Selected equity context preview",
marketUpdated: "Market data updated",
chartContextNote: "Prototype context preview · historical equity series unavailable",
marketMetadata: "Market metadata",
marketOpen: "Open",
marketHigh: "High",
marketLow: "Low",
previousClose: "Previous close",
volume: "Volume",
amount: "Amount",
turnover: "Turnover",

// copy.zh
priceContext: "价格与因子背景",
timeframe: "时间范围",
comparison: "宏观对比",
priceChart: "选中股票情境预览",
marketUpdated: "行情更新时间",
chartContextNote: "原型情境预览 · 暂无股票历史序列",
marketMetadata: "行情元数据",
marketOpen: "开盘",
marketHigh: "最高",
marketLow: "最低",
previousClose: "昨收",
volume: "成交量",
amount: "成交额",
turnover: "换手率",
```

- [ ] **Step 2: Write failing chart-window tests**

Create `frontend/src/utils/decisionChart.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { selectDecisionChartSeries } from "./decisionChart.js";

const BASE_VALUES = [38, 44, 41, 52, 48, 61, 58, 66, 72, 69, 78, 84];
const INDICATORS = [
  {
    key: "PMI",
    points: [
      { date: "2026-03-01", value: 49.4 },
      { date: "2026-04-01", value: 50.1 },
      { date: "2026-05-01", value: 50.4 },
      { date: "2026-06-01", value: 50.7 },
    ],
  },
  {
    key: "M2",
    points: [
      { date: "2026-05-01", value: 6.8 },
      { date: "2026-06-01", value: 7.0 },
    ],
  },
];

test("selects windows only from existing prototype and macro values", () => {
  const baseBefore = [...BASE_VALUES];
  const indicatorsBefore = structuredClone(INDICATORS);
  const result = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "1M",
    indicator: "PMI",
    indicatorOptions: INDICATORS,
  });
  assert.deepEqual(result.stockContextValues, BASE_VALUES.slice(-4));
  assert.deepEqual(result.comparisonValues, [50.4, 50.7]);
  assert.deepEqual(BASE_VALUES, baseBefore);
  assert.deepEqual(INDICATORS, indicatorsBefore);
});

test("timeframes change the visible window without inventing values", () => {
  const oneMonth = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "1M",
    indicator: "PMI",
    indicatorOptions: INDICATORS,
  });
  const threeYears = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "3Y",
    indicator: "PMI",
    indicatorOptions: INDICATORS,
  });
  assert.deepEqual(oneMonth.stockContextValues, BASE_VALUES.slice(-4));
  assert.deepEqual(threeYears.stockContextValues, BASE_VALUES);
  assert.deepEqual(threeYears.comparisonValues, [49.4, 50.1, 50.4, 50.7]);
});

test("indicator selection uses its actual points and Composite has no trace", () => {
  const pmi = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "12M",
    indicator: "PMI",
    indicatorOptions: INDICATORS,
  });
  const m2 = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "12M",
    indicator: "M2",
    indicatorOptions: INDICATORS,
  });
  const composite = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "12M",
    indicator: "Composite",
    indicatorOptions: INDICATORS,
  });
  const fallback = selectDecisionChartSeries({
    baseValues: BASE_VALUES,
    timeframe: "12M",
    indicator: "PMI",
    indicatorOptions: [{ key: "PMI", points: [{ date: "fallback", value: 50.4 }] }],
  });
  assert.deepEqual(pmi.comparisonValues, [49.4, 50.1, 50.4, 50.7]);
  assert.deepEqual(m2.comparisonValues, [6.8, 7.0]);
  assert.equal(composite.comparisonValues, null);
  assert.equal(fallback.comparisonValues, null);
});
```

Run:

```bash
cd frontend
node --test src/utils/decisionChart.test.js
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `decisionChart.js`.

- [ ] **Step 3: Implement the non-synthetic chart-window selector**

Create `frontend/src/utils/decisionChart.js`:

```js
const STOCK_WINDOWS = Object.freeze({ "1M": 4, "3M": 6, "12M": 9, "3Y": 12 });
const TIMEFRAME_MONTHS = Object.freeze({ "1M": 1, "3M": 3, "12M": 12, "3Y": 36 });

function finiteValues(values) {
  return (Array.isArray(values) ? values : [])
    .map(Number)
    .filter(Number.isFinite);
}

function datedMacroValues(points, timeframe) {
  const dated = (Array.isArray(points) ? points : [])
    .map((point) => ({ date: new Date(point?.date), value: Number(point?.value) }))
    .filter((point) => !Number.isNaN(point.date.valueOf()) && Number.isFinite(point.value))
    .sort((left, right) => left.date - right.date);
  if (dated.length < 2) return null;
  const latest = dated.at(-1).date;
  const cutoff = new Date(latest);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - (TIMEFRAME_MONTHS[timeframe] ?? 12));
  const values = dated.filter((point) => point.date >= cutoff).map((point) => point.value);
  return values.length >= 2 ? values : null;
}

export function selectDecisionChartSeries({
  baseValues,
  timeframe = "12M",
  indicator = "Composite",
  indicatorOptions,
}) {
  const stockWindow = STOCK_WINDOWS[timeframe] ?? STOCK_WINDOWS["12M"];
  const stockContextValues = finiteValues(baseValues).slice(-stockWindow);
  if (indicator === "Composite") {
    return { stockContextValues, comparisonValues: null };
  }

  const selected = (Array.isArray(indicatorOptions) ? indicatorOptions : [])
    .find((item) => item.key === indicator);
  const comparisonValues = datedMacroValues(selected?.points, timeframe);

  return {
    stockContextValues,
    comparisonValues,
  };
}
```

Run `node --test src/utils/decisionChart.test.js` again. Expected: 3 tests pass.

This helper performs display-window selection only: it neither synthesizes historical equity prices/volume nor derives new scores. The stock context trace remains the repository's existing prototype `spark`; selected macro comparisons use actual dated backend `points` and calendar cutoffs, not frequency assumptions. Undated/fallback or single-point macro series produce no trace.

- [ ] **Step 4: Create the complete stock workspace component**

Create `frontend/src/components/StockDecisionWorkspace.jsx`:

```jsx
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { spark } from "../data/mockData.js";
import { selectDecisionChartSeries } from "../utils/decisionChart.js";

const TIMEFRAMES = ["1M", "3M", "12M", "3Y"];

function buildChartPoints(values, width = 720, height = 280, padding = 24) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  return values.map((value, index) => {
    const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - minimum) / range) * (height - padding * 2);
    return { x, y };
  });
}

export function StockDecisionWorkspace({
  t,
  lang,
  stock,
  indicator,
  indicatorOptions,
  realtimeMeta,
  sectionRef,
  onIndicatorChange,
}) {
  const [timeframe, setTimeframe] = useState("12M");
  const chartSeries = useMemo(() => selectDecisionChartSeries({
    baseValues: spark,
    timeframe,
    indicator,
    indicatorOptions,
  }), [indicator, indicatorOptions, timeframe]);
  const points = useMemo(
    () => buildChartPoints(chartSeries.stockContextValues),
    [chartSeries.stockContextValues],
  );
  const comparisonPoints = useMemo(
    () => chartSeries.comparisonValues
      ? buildChartPoints(chartSeries.comparisonValues)
      : [],
    [chartSeries.comparisonValues],
  );
  const polyline = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const comparisonPolyline = comparisonPoints.map(({ x, y }) => `${x},${y}`).join(" ");
  const change = Number(stock.chg ?? 0);
  const positive = change >= 0;
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const formatNumber = (value, { currency = false, compact = false } = {}) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "--";
    const formatted = new Intl.NumberFormat(locale, {
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : 2,
    }).format(numeric);
    return `${currency ? stock.currency ?? "" : ""}${formatted}`;
  };

  return (
    <section className="panel stock-decision-workspace nav-target" ref={sectionRef} aria-labelledby="stock-workspace-title">
      <header className="stock-identity">
        <div>
          <small>{t.selectedEquity} · {stock.exchange}</small>
          <h2 id="stock-workspace-title">{stock.ticker} <span>{stock.name}</span></h2>
          {realtimeMeta?.updated_at && (
            <p>{t.marketUpdated}: {new Date(realtimeMeta.updated_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}</p>
          )}
        </div>
        <div className="stock-price-block">
          <strong>{stock.currency}{Number(stock.price ?? 0).toFixed(2)}</strong>
          <span className={positive ? "up" : "down"}>
            {positive ? <TrendingUp size={16} aria-hidden="true" /> : <TrendingDown size={16} aria-hidden="true" />}
            {positive ? "+" : ""}{change}%
          </span>
        </div>
      </header>

      <div className="market-metadata-grid" aria-label={t.marketMetadata}>
        <span>{t.marketOpen}<b>{formatNumber(stock.open, { currency: true })}</b></span>
        <span>{t.marketHigh}<b>{formatNumber(stock.high, { currency: true })}</b></span>
        <span>{t.marketLow}<b>{formatNumber(stock.low, { currency: true })}</b></span>
        <span>{t.previousClose}<b>{formatNumber(stock.previous_close, { currency: true })}</b></span>
        <span>{t.volume}<b>{formatNumber(stock.volume, { compact: true })}</b></span>
        <span>{t.amount}<b>{formatNumber(stock.amount, { compact: true })}</b></span>
        <span>{t.turnover}<b>{Number.isFinite(Number(stock.turnover)) ? `${formatNumber(stock.turnover)}%` : "--"}</b></span>
      </div>

      <div className="chart-toolbar">
        <div className="timeframe-control" role="group" aria-label={t.timeframe}>
          {TIMEFRAMES.map((item) => (
            <button
              type="button"
              className={timeframe === item ? "selected" : ""}
              aria-pressed={timeframe === item}
              onClick={() => setTimeframe(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="indicator-control">
          <span>{t.comparison}</span>
          <select value={indicator} onChange={(event) => onIndicatorChange(event.target.value)}>
            <option value="Composite">{t.composite}</option>
            {indicatorOptions.map((item) => (
              <option value={item.key} key={item.key}>{t.macro[item.key] ?? item.key}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="price-chart" role="img" aria-label={`${t.priceChart}: ${stock.ticker}, ${timeframe}`}>
        <svg viewBox="0 0 720 280" preserveAspectRatio="none" aria-hidden="true">
          {[64, 118, 172, 226].map((y) => (
            <line className="chart-grid-line" x1="24" x2="696" y1={y} y2={y} key={y} />
          ))}
          {comparisonPolyline && <polyline className="chart-comparison-line" points={comparisonPolyline} />}
          <polyline className="chart-line" points={polyline} />
          <circle className="chart-endpoint" cx={points.at(-1).x} cy={points.at(-1).y} r="4" />
        </svg>
        <span className="chart-comparison-label">{t.macro[indicator] ?? (indicator === "Composite" ? t.composite : indicator)}</span>
      </div>
      <p className="chart-context-note">{t.chartContextNote}</p>

      <div className="metric-grid">
        <span>{lang === "zh" ? "因子评分" : "Factor score"}<b>{stock.score}</b></span>
        <span>P/E<b>{stock.pe}</b></span>
        <span>{lang === "zh" ? "增长" : "Growth"}<b>{stock.growth}%</b></span>
        <span>RSI<b>{stock.rsi}</b></span>
        <span>Beta<b>{stock.beta}</b></span>
        <span>{t.factors.liquidity}<b>{stock.liquidity}</b></span>
        <span>{t.factors.momentum}<b>{stock.trend}</b></span>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Replace the inline stock detail and keep AI as a separate sibling**

Add:

```js
import { StockDecisionWorkspace } from "./components/StockDecisionWorkspace.jsx";
```

Delete App's `timeframe` state. Replace the old `.detail-panel` section with:

```jsx
<StockDecisionWorkspace
  t={t}
  lang={lang}
  stock={selectedStock}
  indicator={indicator}
  indicatorOptions={macroSeries}
  realtimeMeta={realtimeMeta}
  sectionRef={chartRef}
  onIndicatorChange={setIndicator}
/>
<AiAnalysisPanel
  t={t}
  ticker={selectedStock.ticker}
  status={aiAnalysis.status}
  result={aiAnalysis.result}
  error={aiAnalysis.error}
  needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
  onAnalyze={() => requestAnalysis(false)}
  onRefresh={() => requestAnalysis(true)}
  onExport={handleExportAiAnalysis}
  onSubmitPassword={(password) => {
    setAnalysisPassword(password);
    setShowAnalysisPassword(false);
    if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
  }}
  onOpenSettings={() => setShowAiSettings(true)}
/>
```

Remove `timeframe`, `ChevronDown`, `Target`, `TrendingDown`, `TrendingUp`, and the detail-panel `Sparkles` usage/imports from App. The AI panel remains a sibling in this intermediate task so every commit stays runnable.

- [ ] **Step 6: Verify component boundaries and build**

Run:

```bash
cd frontend
npm test
npm run build
if rg -n "aiAnalysis|analysisPassword|onAnalyze|onRefresh|onExport" src/components/StockDecisionWorkspace.jsx; then
  echo "unexpected AI state inside stock workspace"
  exit 1
fi
if rg -n "timeframe" src/App.jsx; then
  echo "timeframe state was not localized to stock workspace"
  exit 1
fi
```

Expected: tests and build pass; both forbidden-reference gates exit `0` without printing an error. In addition, click all four timeframes and two macro indicators: the existing prototype trace changes only by selecting a shorter/longer window, and the dashed comparison trace uses the selected series' real `points`. Switching stocks updates identity, quote, factors, and AI context but does not fabricate a different historical path.

- [ ] **Step 7: Commit the stock workspace extraction**

```bash
git add \
  frontend/src/App.jsx \
  frontend/src/i18n/copy.js \
  frontend/src/components/StockDecisionWorkspace.jsx \
  frontend/src/utils/decisionChart.js \
  frontend/src/utils/decisionChart.test.js
git commit -m "refactor: extract stock decision workspace"
```

---

### Task 5: Promote the AI analysis into a stable research panel

**Files:**
- Create: `frontend/src/components/AiResearchPanel.jsx`
- Delete: `frontend/src/components/AiAnalysisPanel.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/i18n/copy.js`
- Modify: `frontend/src/utils/aiAnalysis.js`
- Modify: `frontend/src/utils/aiAnalysis.test.js`

**Interfaces:**
- Produces: `AiResearchPanel({ t, lang, ticker, score, status, result, error, needsPassword, onAnalyze, onRefresh, onExport, onSubmitPassword, onOpenSettings })`; `score` is the selected equity's existing factor score, not a newly invented AI confidence value.
- Preserves the existing export reducer, ticker-change reset, password form, cached result, settings recovery, refresh, and sanitized PDF failure behavior.
- Produces: `getVisibleAiResult(result, ticker, lang)`, preventing a result for the previous ticker or language from being displayed/exported during the render before the hook reset effect runs.
- AI is not a rail destination, so it does not accept a navigation ref and does not introduce `forwardRef` or a wrapper panel.

- [ ] **Step 1: Re-run the AI and PDF behavior guards before moving JSX**

Run:

```bash
cd frontend
node --test src/utils/aiAnalysis.test.js src/utils/aiPdfExportState.test.js src/utils/aiPdfReport.test.js
```

Expected: all AI and PDF tests pass.

- [ ] **Step 2: Add the failing ticker-identity guard**

Append this test to `frontend/src/utils/aiAnalysis.test.js` and add `getVisibleAiResult` to its import:

```js
test("shows an AI result only for the current ticker and language", () => {
  const result = { ticker: "600519", lang: "zh", analysis: { rating: "bullish" } };
  assert.equal(getVisibleAiResult(result, "600519", "zh"), result);
  assert.equal(getVisibleAiResult(result, "NVDA", "zh"), null);
  assert.equal(getVisibleAiResult(result, "600519", "en"), null);
  assert.equal(getVisibleAiResult(null, "600519", "zh"), null);
});
```

Run:

```bash
cd frontend
node --test src/utils/aiAnalysis.test.js
```

Expected: FAIL because `getVisibleAiResult` is not exported.

Add to `frontend/src/utils/aiAnalysis.js`:

```js
export function getVisibleAiResult(result, ticker, lang) {
  return result?.ticker === ticker && result?.lang === lang ? result : null;
}
```

Run the same command again. Expected: all AI reducer tests pass.

- [ ] **Step 3: Add the refresh-in-place copy**

Add inside each locale's `ai` object:

```js
// copy.en.ai
refreshing: "Refreshing analysis; the last result remains visible…",
factorScore: "Factor score",

// copy.zh.ai
refreshing: "正在刷新分析，当前结果会继续保留…",
factorScore: "因子评分",
```

- [ ] **Step 4: Create the complete stable AI research component**

Create `frontend/src/components/AiResearchPanel.jsx`:

```jsx
import { useEffect, useReducer, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCcw, Settings2, Sparkles } from "lucide-react";

import {
  canExportAiPdf,
  initialAiPdfExportState,
  reduceAiPdfExportState,
} from "../utils/aiPdfExportState.js";
import { getVisibleAiResult } from "../utils/aiAnalysis.js";

export function AiResearchPanel({
  t,
  lang,
  ticker,
  score,
  status,
  result,
  error,
  needsPassword,
  onAnalyze,
  onRefresh,
  onExport,
  onSubmitPassword,
  onOpenSettings,
}) {
  const [password, setPassword] = useState("");
  const [exportState, dispatchExport] = useReducer(reduceAiPdfExportState, initialAiPdfExportState);
  const activeRequestKeyRef = useRef(`${ticker}:${lang}`);

  useEffect(() => {
    if (!needsPassword) setPassword("");
    return () => setPassword("");
  }, [lang, needsPassword, ticker]);

  useEffect(() => {
    activeRequestKeyRef.current = `${ticker}:${lang}`;
    dispatchExport({ type: "ticker_changed" });
  }, [lang, ticker]);

  const visibleResult = getVisibleAiResult(result, ticker, lang);
  const analysis = visibleResult?.analysis;
  const errorText = error ? (t.ai.errors[error.code] ?? t.ai.errors.generic) : "";
  const canExport = canExportAiPdf({
    hasAnalysis: Boolean(analysis),
    analysisStatus: status,
    exportStatus: exportState.status,
  });

  const handleExport = async () => {
    if (!canExport) return;
    const startedRequestKey = `${ticker}:${lang}`;
    dispatchExport({ type: "start" });
    try {
      await onExport();
      if (activeRequestKeyRef.current === startedRequestKey) dispatchExport({ type: "success" });
    } catch {
      if (activeRequestKeyRef.current === startedRequestKey) dispatchExport({ type: "failure" });
    }
  };

  return (
    <section
      className="panel ai-research-panel"
      aria-labelledby="ai-research-title"
      aria-busy={status === "loading" || exportState.status === "exporting"}
    >
      <header className="region-heading ai-research-heading">
        <div>
          <small>{t.ai.researchAssistant}</small>
          <h2 id="ai-research-title"><Sparkles size={17} aria-hidden="true" /> {t.ai.analysis}</h2>
        </div>
        <button type="button" className="ghost" data-ai-settings-trigger onClick={onOpenSettings}>
          <Settings2 size={14} aria-hidden="true" /> {t.ai.settings}
        </button>
      </header>

      {needsPassword && (
        <div className="ai-password-block">
          <form
            className="ai-password-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (password) onSubmitPassword(password);
            }}
          >
            <label htmlFor={`ai-analysis-password-${ticker}`}>{t.ai.analysisPassword}</label>
            <div>
              <input
                id={`ai-analysis-password-${ticker}`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
              />
              <button type="submit" className="primary" disabled={!password}>{t.ai.continue}</button>
            </div>
          </form>
          {errorText && <p className="ai-inline-error" role="alert">{errorText}</p>}
        </div>
      )}

      {errorText && !needsPassword && (
        <div className="ai-message error" role="alert">
          <span>{errorText}</span>
          {error.code === "ai_not_configured" && (
            <button type="button" className="ghost" onClick={onOpenSettings}>{t.ai.openSettings}</button>
          )}
        </div>
      )}

      {status === "loading" && analysis && (
        <p className="ai-refresh-status" role="status">
          <LoaderCircle className="spin" size={15} aria-hidden="true" /> {t.ai.refreshing}
        </p>
      )}

      {!analysis && !needsPassword && (
        <button type="button" className="ai-run-button" onClick={onAnalyze} disabled={status === "loading"}>
          {status === "loading" ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          {status === "loading" ? t.ai.analyzing : t.ai.analyze}
        </button>
      )}

      {analysis && (
        <div className="ai-analysis-content">
          <p className="sr-only" role="status" aria-live="polite">
            {t.ai.analysis}: {ticker}, {t.ai[analysis.rating]}, {visibleResult.generated_at}
          </p>
          <div className="ai-analysis-summary">
            <div>
              <small>{t.ai.rating}</small>
              <strong className={`ai-rating ${analysis.rating}`}>{t.ai[analysis.rating]}</strong>
            </div>
            <div>
              <small>{t.ai.factorScore}</small>
              <strong>{score}/100</strong>
            </div>
            <div>
              <small>{t.ai.position}</small>
              <strong>{analysis.position_range.min}%–{analysis.position_range.max}%</strong>
            </div>
            <p>{analysis.summary}</p>
          </div>
          <div className="ai-analysis-grid">
            <article>
              <h3>{t.ai.opportunities}</h3>
              <ul>{analysis.opportunities.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h3>{t.ai.risks}</h3>
              <ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </div>
          <article className="ai-watchlist">
            <h3>{t.ai.watchlist}</h3>
            <div>
              {analysis.watchlist.map((item) => (
                <span key={`${item.name}-${item.value}`}>
                  <b>{item.name}</b><em>{item.value}</em><small>{item.reason}</small>
                </span>
              ))}
            </div>
          </article>
          <div className="ai-analysis-meta">
            <span>
              {visibleResult.cached ? t.ai.cached : t.ai.generated} · {new Date(visibleResult.generated_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
            </span>
            <div className="ai-analysis-actions">
              <button
                type="button"
                className="primary"
                onClick={onRefresh}
                disabled={status === "loading" || exportState.status === "exporting"}
              >
                <RefreshCcw className={status === "loading" ? "spin" : ""} size={14} aria-hidden="true" />
                {status === "loading" ? t.ai.analyzing : t.ai.refresh}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={handleExport}
                disabled={!canExport}
                aria-busy={exportState.status === "exporting"}
              >
                {exportState.status === "exporting"
                  ? <LoaderCircle className="spin" size={14} aria-hidden="true" />
                  : <Download size={14} aria-hidden="true" />}
                {exportState.status === "exporting" ? t.ai.exportingPdf : t.ai.exportPdf}
              </button>
            </div>
          </div>
          {exportState.error && <p className="ai-inline-error" role="alert">{t.ai.exportPdfFailed}</p>}
        </div>
      )}
      <p className="ai-disclaimer">{t.ai.disclaimer}</p>
    </section>
  );
}
```

- [ ] **Step 5: Switch App to the renamed component and remove the old file**

Replace the import and JSX name:

```js
import { AiResearchPanel } from "./components/AiResearchPanel.jsx";
```

```jsx
<AiResearchPanel
  t={t}
  lang={lang}
  ticker={selectedStock.ticker}
  score={selectedStock.score}
  status={aiAnalysis.status}
  result={aiAnalysis.result}
  error={aiAnalysis.error}
  needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
  onAnalyze={() => requestAnalysis(false)}
  onRefresh={() => requestAnalysis(true)}
  onExport={handleExportAiAnalysis}
  onSubmitPassword={(password) => {
    setAnalysisPassword(password);
    setShowAnalysisPassword(false);
    if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
  }}
  onOpenSettings={() => setShowAiSettings(true)}
/>
```

Harden the parent PDF handler as defense in depth:

```js
const handleExportAiAnalysis = async () => {
  if (
    !aiAnalysis.result ||
    aiAnalysis.result.ticker !== selectedStock.ticker ||
    aiAnalysis.result.lang !== lang
  ) return;
  await downloadAiAnalysisPdf({
    lang,
    t,
    selectedStock,
    result: aiAnalysis.result,
  });
};
```

Before deleting the old component, verify no files other than its own definition still reference it:

```bash
cd frontend
if rg -n "AiAnalysisPanel" src --glob '!**/AiAnalysisPanel.jsx'; then
  echo "old AI component is still imported or rendered"
  exit 1
fi
```

Then delete `frontend/src/components/AiAnalysisPanel.jsx`.

- [ ] **Step 6: Verify AI behavior and the build after the rename**

Run:

```bash
cd frontend
node --test src/utils/aiAnalysis.test.js src/utils/aiPdfExportState.test.js src/utils/aiPdfReport.test.js
npm run build
if rg -n "AiAnalysisPanel" src; then
  echo "old AI component remains after deletion"
  exit 1
fi
```

Expected: all AI/PDF tests pass; Vite exits `0`; the old-component gate exits `0` without printing an error.

- [ ] **Step 7: Commit the AI panel promotion**

```bash
git add \
  frontend/src/App.jsx \
  frontend/src/i18n/copy.js \
  frontend/src/components/AiResearchPanel.jsx \
  frontend/src/components/AiAnalysisPanel.jsx \
  frontend/src/utils/aiAnalysis.js \
  frontend/src/utils/aiAnalysis.test.js
git commit -m "refactor: promote AI research panel"
```

---

### Task 6: Build the compact accessible equity discovery panel

**Files:**
- Create: `frontend/src/components/EquityDiscoveryPanel.jsx`
- Modify: `frontend/src/App.jsx:22-23,48-50,346-448`
- Modify: `frontend/src/i18n/copy.js`

**Interfaces:**
- Produces: `EquityDiscoveryPanel({ t, stocks, selectedTicker, factors, sortKey, searchState, stockSourceStatus, realtimeMeta, activeProvider, activeProviderHealth, providerDiag, sectionRef, onRetryStockSnapshot, onRetrySearch, onSelectTicker, onFactorsChange, onSortChange })`.
- Owns: `activeMarket`, `showProviderDiag`, `rankingOpen`, and `filtersOpen`; disclosure state survives parent rerenders.
- Uses: `filterEquitiesByMarket(stocks, activeMarket)` from Task 1.
- Emits only equity-domain callbacks; it never accepts macro query/group state.
- Displays the active market's row count. The command-bar Markdown export intentionally remains an all-market Top 10 and is labeled as such by Task 2.

- [ ] **Step 1: Add exact bilingual discovery/status copy**

Add these top-level keys to both locales in `frontend/src/i18n/copy.js`:

```js
// copy.en
equityDiscovery: "Equity discovery",
factorFilters: "Factor filters",
rankingList: "Equity ranking",
marketScope: "Market scope",
markets: { CN: "A-shares", HK: "Hong Kong", US: "U.S." },
provider: "Provider",
providerDetails: "Provider diagnostics",
searchingEquities: "Searching live A-share data…",
equitySearchError: "Live market source is temporarily unavailable. Try again later.",
noEquityMatches: "No matching equities",
chips: ["Momentum", "Quality", "Value", "Liquidity", "Low beta"],

// copy.zh
equityDiscovery: "股票发现",
factorFilters: "因子筛选",
rankingList: "股票排名",
marketScope: "市场范围",
markets: { CN: "A股", HK: "港股", US: "美股" },
provider: "数据源",
providerDetails: "数据源诊断",
searchingEquities: "正在查询 A 股实时数据…",
equitySearchError: "实时行情源暂时不可用，请稍后重试",
noEquityMatches: "没有找到匹配的股票",
chips: ["动量", "质量", "价值", "流动性", "低 Beta"],
```

- [ ] **Step 2: Create the complete discovery panel**

Create `frontend/src/components/EquityDiscoveryPanel.jsx`:

```jsx
import { useEffect, useMemo, useState } from "react";
import { Database, SlidersHorizontal } from "lucide-react";

import { MiniBars } from "./MiniBars.jsx";
import { spark } from "../data/mockData.js";
import {
  EQUITY_MARKETS,
  filterEquitiesByMarket,
  marketForExchange,
} from "../utils/equityDiscovery.js";

const FACTOR_PRESETS = [
  { momentum: 85, quality: 52, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 85, valuation: 35, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 85, liquidity: 70, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 35, liquidity: 90, volatility: 45 },
  { momentum: 68, quality: 52, valuation: 35, liquidity: 70, volatility: 90 },
];

export function EquityDiscoveryPanel({
  t,
  stocks,
  selectedTicker,
  factors,
  sortKey,
  searchState,
  stockSourceStatus,
  realtimeMeta,
  activeProvider,
  activeProviderHealth,
  providerDiag,
  sectionRef,
  onRetryStockSnapshot,
  onRetrySearch,
  onSelectTicker,
  onFactorsChange,
  onSortChange,
}) {
  const [activeMarket, setActiveMarket] = useState("CN");
  const [showProviderDiag, setShowProviderDiag] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const marketStocks = useMemo(
    () => filterEquitiesByMarket(stocks, activeMarket),
    [activeMarket, stocks],
  );

  useEffect(() => {
    const selected = stocks.find((stock) => stock.ticker === selectedTicker);
    if (!selected || marketStocks.some((stock) => stock.ticker === selectedTicker)) return;
    setActiveMarket(marketForExchange(selected.exchange) ?? "CN");
  }, [marketStocks, selectedTicker, stocks]);

  const selectMarket = (market) => {
    setActiveMarket(market);
    const nextRows = filterEquitiesByMarket(stocks, market);
    if (nextRows.length > 0 && !nextRows.some((stock) => stock.ticker === selectedTicker)) {
      onSelectTicker(nextRows[0].ticker);
    }
  };

  const emptyLabel = searchState === "loading"
    ? t.searchingEquities
    : searchState === "error"
      ? t.equitySearchError
      : t.noEquityMatches;
  const scopedStatusMessage = searchState === "loading"
    ? t.searchingEquities
    : searchState === "error"
      ? t.equitySearchError
      : stockSourceStatus.message;
  const statusIsError = searchState === "error" || stockSourceStatus.kind === "degraded";

  return (
    <section className="panel equity-discovery-panel nav-target" ref={sectionRef} aria-labelledby="equity-discovery-title">
      <header className="region-heading equity-discovery-heading">
        <div>
          <small>{marketStocks.length} {t.matches}</small>
          <h2 id="equity-discovery-title">{t.equityDiscovery}</h2>
        </div>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </header>

      <div className="segmented market-tabs" role="group" aria-label={t.marketScope}>
        {EQUITY_MARKETS.map((market) => (
          <button
            type="button"
            className={activeMarket === market ? "selected" : ""}
            aria-pressed={activeMarket === market}
            onClick={() => selectMarket(market)}
            key={market}
          >
            {t.markets[market]}
          </button>
        ))}
      </div>

      <details
        className="discovery-section discovery-ranking"
        open={rankingOpen}
        onToggle={(event) => setRankingOpen(event.currentTarget.open)}
      >
        <summary>{t.rankingList}</summary>
        <div className="discovery-section-content">
          <div className="discovery-list-toolbar">
            <div className="segmented" role="group" aria-label={t.ranked}>
              {["score", "growth", "trend"].map((key) => (
                <button
                  type="button"
                  className={sortKey === key ? "selected" : ""}
                  aria-pressed={sortKey === key}
                  onClick={() => onSortChange(key)}
                  key={key}
                >
                  {t.sort[key]}
                </button>
              ))}
            </div>
            <span className="source-badge" data-source-kind={stockSourceStatus.kind}>
              <Database size={13} aria-hidden="true" /> {stockSourceStatus.label}
            </span>
          </div>

          {scopedStatusMessage && (
            <div className="region-status-message" role={statusIsError ? "alert" : "status"}>
              <span>{scopedStatusMessage}</span>
              {(searchState === "error" || stockSourceStatus.retryTarget === "search") && (
                <button type="button" className="ghost" onClick={onRetrySearch}>{t.retry}</button>
              )}
              {stockSourceStatus.retryTarget === "snapshot" && (
                <button type="button" className="ghost" onClick={onRetryStockSnapshot}>{t.retry}</button>
              )}
            </div>
          )}

          {realtimeMeta?.notice && (
            <p className="source-notice" role="status">{realtimeMeta.notice}</p>
          )}

          {activeProvider && (
            <button
              type="button"
              className="ghost provider-status"
              aria-expanded={showProviderDiag}
              onClick={() => setShowProviderDiag((value) => !value)}
            >
              {t.provider}: {activeProvider} {activeProviderHealth?.status === "cooldown" ? "⏸" : "✓"}
            </button>
          )}

          {showProviderDiag && providerDiag.length > 0 && (
            <div className="provider-diag" aria-label={t.providerDetails}>
              {providerDiag.map((entry) => (
                <span key={`${entry.provider}-${entry.result}`}>
                  {entry.provider} · {entry.result} · {entry.duration_ms}ms{entry.error ? ` · ${entry.error}` : ""}
                </span>
              ))}
            </div>
          )}

          <div className="equity-list" aria-label={t.rankingList}>
            {marketStocks.length === 0 && <p className="equity-empty" role="status">{emptyLabel}</p>}
            {marketStocks.map((stock) => {
              const selected = selectedTicker === stock.ticker;
              const positive = Number(stock.chg ?? 0) >= 0;
              return (
                <button
                  type="button"
                  className={`equity-row${selected ? " selected" : ""}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelectTicker(stock.ticker)}
                  key={stock.ticker}
                >
                  <span className="equity-row-main">
                    <strong>{stock.ticker}</strong>
                    <b className="score-pill">{stock.score}</b>
                  </span>
                  <span className="equity-row-name">
                    {stock.name} · {stock.exchange} · {stock.source ?? "prototype"}
                  </span>
                  <span className="equity-row-quote">
                    <b>{stock.currency}{Number(stock.price ?? 0).toFixed(2)}</b>
                    <em className={positive ? "up" : "down"}>{positive ? "+" : ""}{stock.chg}%</em>
                  </span>
                  <span className="equity-row-metrics">
                    P/E {stock.pe} · {t.sort.growth} {stock.growth}% · RSI {stock.rsi}
                  </span>
                  <MiniBars values={spark.map((value) => Math.max(18, value - (90 - stock.trend) / 2))} tone={positive ? "cyan" : "red"} />
                </button>
              );
            })}
          </div>
        </div>
      </details>

      <details
        className="discovery-section discovery-filters"
        open={filtersOpen}
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary>{t.factorFilters}</summary>
        <div className="discovery-section-content">
          {Object.entries(factors).map(([key, value]) => (
            <label className="slider-row" key={key}>
              <span>{t.factors[key]}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={value}
                onChange={(event) => onFactorsChange({ ...factors, [key]: Number(event.target.value) })}
              />
              <b>{value}</b>
            </label>
          ))}
          <div className="filter-chips">
            {t.chips.map((chip, index) => (
              <button
                type="button"
                onClick={() => onFactorsChange(FACTOR_PRESETS[index])}
                key={chip}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
```

- [ ] **Step 3: Replace the two old left-side panels in App**

Add:

```js
import { EquityDiscoveryPanel } from "./components/EquityDiscoveryPanel.jsx";
```

Delete `showProviderDiag` state. Change the initial selected equity to the approved visual's A-share context so the initial discovery tab, stock workspace, and backend-supported AI ticker agree:

```js
const [selectedTicker, setSelectedTicker] = useState("600519");
```

This is the approved visual default, not a search or scoring-rule change: all ticker selection, search, and macro-state contracts remain unchanged. It also avoids opening the AI workspace on a U.S. ticker when the configured backend snapshot is A-share-only.

Replace both `.factor-panel` and `.table-panel` sections with:

```jsx
<EquityDiscoveryPanel
  t={t}
  stocks={filteredStocks}
  selectedTicker={selectedTicker}
  factors={factors}
  sortKey={sortKey}
  searchState={searchState}
  stockSourceStatus={stockSourceStatus}
  realtimeMeta={realtimeMeta}
  activeProvider={activeProvider}
  activeProviderHealth={activeProviderHealth}
  providerDiag={providerDiag}
  sectionRef={screenerRef}
  onRetryStockSnapshot={retryStockSnapshot}
  onRetrySearch={retrySearch}
  onSelectTicker={setSelectedTicker}
  onFactorsChange={setFactors}
  onSortChange={setSortKey}
/>
```

Remove `MiniBars` and `SlidersHorizontal` from App imports when `rg` confirms there are no remaining usages.

- [ ] **Step 4: Verify accessibility and domain boundaries structurally**

Run:

```bash
cd frontend
npm test
npm run build
if rg -n "macroQuery|activeGroup|macroSeries|onSelectIndicator" src/components/EquityDiscoveryPanel.jsx; then
  echo "unexpected macro state inside equity discovery"
  exit 1
fi
if rg -n "<tr|onKeyDown|tabIndex" src/components/EquityDiscoveryPanel.jsx; then
  echo "non-native interactive row pattern found"
  exit 1
fi
```

Expected: tests and build pass; both structural gates exit `0` because the component uses native buttons and contains no macro state. Trigger a search provider error and a stock snapshot error once each; last valid rows remain visible, the scoped message is announced, and its retry button starts the correct request. A realtime warning remains visible but shows no incorrect snapshot retry button because the quote hook already retries automatically. Collapse ranking and filters independently, then select a stock/change language/refresh data; each disclosure keeps the user's chosen state.

- [ ] **Step 5: Commit the equity discovery component**

```bash
git add frontend/src/App.jsx frontend/src/i18n/copy.js frontend/src/components/EquityDiscoveryPanel.jsx
git commit -m "refactor: build equity discovery panel"
```

---

### Task 7: Extract the application shell and recompose the cockpit regions

**Files:**
- Create: `frontend/src/components/AppShell.jsx`
- Modify: `frontend/src/App.jsx:1-20,68-80,285-345,577-587`
- Modify: `frontend/src/i18n/copy.js`

**Interfaces:**
- Produces: `AppShell({ t, lang, stockQuery, activeNav, stockSourceStatus, macroSourceStatus, reportButtonRef, onStockQueryChange, onLanguageChange, onNavigate, onOpenAiSettings, onExportReport, children })`.
- `children` must be one `.content-grid` containing, in DOM and keyboard order: stock, AI, discovery, macro. Desktop CSS grid areas place discovery on the left without changing that DOM order.
- Navigation refs remain owned by App and are passed explicitly through `sectionRef` props.

- [ ] **Step 1: Add exact command-bar accessibility copy and correct the equity placeholder**

Replace each locale's existing `search` value and add these keys:

```js
// copy.en
search: "Search stocks, companies, or tickers",
language: "Language selector",
alerts: "Alerts",
alertsUnavailable: "Alerts are not available in this prototype",
stockData: "Equity data",
macroData: "Macro data",
prototypeMarketContext: "Static prototype market context",

// copy.zh
search: "搜索股票、公司或代码",
language: "语言选择",
alerts: "提醒",
alertsUnavailable: "当前原型暂不提供提醒功能",
stockData: "股票数据",
macroData: "宏观数据",
prototypeMarketContext: "静态原型市场背景",
```

- [ ] **Step 2: Create the complete application shell**

Create `frontend/src/components/AppShell.jsx`:

```jsx
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  Database,
  Download,
  LineChart,
  Search,
  Settings2,
} from "lucide-react";

const NAV_ICONS = [BarChart3, Activity, LineChart, BookOpenCheck, Database];

export function AppShell({
  t,
  lang,
  stockQuery,
  activeNav,
  stockSourceStatus,
  macroSourceStatus,
  reportButtonRef,
  onStockQueryChange,
  onLanguageChange,
  onNavigate,
  onOpenAiSettings,
  onExportReport,
  children,
}) {
  return (
    <main className="terminal">
      <aside className="rail">
        <div className="brand" aria-label="QuantDesk">
          <span>Q</span>
          <div><strong>QuantDesk</strong><small>{t.lab}</small></div>
        </div>
        <nav aria-label="QuantDesk">
          {NAV_ICONS.map((Icon, index) => (
            <button
              type="button"
              className={activeNav === index ? "active" : ""}
              aria-current={activeNav === index ? "page" : undefined}
              aria-label={t.nav[index]}
              data-tooltip={t.nav[index]}
              onClick={() => onNavigate(index)}
              key={t.nav[index]}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t.nav[index]}</span>
            </button>
          ))}
        </nav>
        <div className="rail-source" aria-label={t.macroData}>
          <Database size={17} aria-hidden="true" />
          <span>{macroSourceStatus.label}</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <label className="searchbox">
            <Search size={18} aria-hidden="true" />
            <input
              value={stockQuery}
              onChange={(event) => onStockQueryChange(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
            />
          </label>

          <div className="market-strip" aria-label={`${t.stockData}: ${t.prototypeMarketContext}`}>
            <span className="market-strip-context">{t.prototypeMarketContext}</span>
            <span>CSI 300 <b className="up">+0.42%</b></span>
            <span>HSI <b className="down">-0.18%</b></span>
            <span>CN10Y <b>1.72%</b></span>
            <span>USD/CNY <b>7.18</b></span>
          </div>

          <div className="command-source" title={stockSourceStatus.label}>
            <span className="source-badge" data-source-kind={stockSourceStatus.kind}>
              <Database size={13} aria-hidden="true" /> {stockSourceStatus.label}
            </span>
          </div>

          <button type="button" className="icon-button" data-ai-settings-trigger aria-label={t.ai.settings} onClick={onOpenAiSettings}>
            <Settings2 size={17} aria-hidden="true" />
          </button>
          <div className="segmented language-toggle" role="group" aria-label={t.language}>
            <button type="button" className={lang === "zh" ? "selected" : ""} aria-pressed={lang === "zh"} onClick={() => onLanguageChange("zh")}>中</button>
            <button type="button" className={lang === "en" ? "selected" : ""} aria-pressed={lang === "en"} onClick={() => onLanguageChange("en")}>EN</button>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`${t.alerts}: ${t.alertsUnavailable}`}
            title={t.alertsUnavailable}
            disabled
          >
            <Bell size={18} aria-hidden="true" />
          </button>
          <button type="button" className="primary report-export" ref={reportButtonRef} onClick={onExportReport}>
            <Download size={16} aria-hidden="true" /> {t.export}
          </button>
        </header>
        {children}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Make navigation scrolling honor reduced motion**

Replace `handleNavigation` in `frontend/src/App.jsx` with:

```js
const handleNavigation = (index) => {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  navigationLockRef.current = true;
  window.clearTimeout(navigationUnlockTimerRef.current);
  setActiveNav(index);
  const target = [screenerRef, macroRef, chartRef, reportRef, dataRef][index]?.current;
  target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: index === 3 ? "center" : "start" });
  if (index === 3) {
    window.setTimeout(() => target?.focus({ preventScroll: true }), reducedMotion ? 0 : 350);
  }
  navigationUnlockTimerRef.current = window.setTimeout(() => {
    navigationLockRef.current = false;
  }, reducedMotion ? 100 : 900);
};
```

- [ ] **Step 4: Replace App's shell markup with the final composition**

Remove the entire Lucide import from App and add:

```js
import { AppShell } from "./components/AppShell.jsx";
```

Replace App's return block with this composition, using the handlers and derived values created in prior tasks:

```jsx
return (
  <>
    <AppShell
      t={t}
      lang={lang}
      stockQuery={stockQuery}
      activeNav={activeNav}
      stockSourceStatus={stockSourceStatus}
      macroSourceStatus={macroSourceStatus}
      reportButtonRef={reportRef}
      onStockQueryChange={setStockQuery}
      onLanguageChange={setLang}
      onNavigate={handleNavigation}
      onOpenAiSettings={() => setShowAiSettings(true)}
      onExportReport={handleExportReport}
    >
      <div className="content-grid">
        <StockDecisionWorkspace
          t={t}
          lang={lang}
          stock={selectedStock}
          indicator={indicator}
          indicatorOptions={macroSeries}
          realtimeMeta={realtimeMeta}
          sectionRef={chartRef}
          onIndicatorChange={setIndicator}
        />
        <AiResearchPanel
          t={t}
          lang={lang}
          ticker={selectedStock.ticker}
          score={selectedStock.score}
          status={aiAnalysis.status}
          result={aiAnalysis.result}
          error={aiAnalysis.error}
          needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
          onAnalyze={() => requestAnalysis(false)}
          onRefresh={() => requestAnalysis(true)}
          onExport={handleExportAiAnalysis}
          onSubmitPassword={(password) => {
            setAnalysisPassword(password);
            setShowAnalysisPassword(false);
            if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
          }}
          onOpenSettings={() => setShowAiSettings(true)}
        />
        <EquityDiscoveryPanel
          t={t}
          stocks={filteredStocks}
          selectedTicker={selectedTicker}
          factors={factors}
          sortKey={sortKey}
          searchState={searchState}
          stockSourceStatus={stockSourceStatus}
          realtimeMeta={realtimeMeta}
          activeProvider={activeProvider}
          activeProviderHealth={activeProviderHealth}
          providerDiag={providerDiag}
          sectionRef={screenerRef}
          onRetryStockSnapshot={retryStockSnapshot}
          onRetrySearch={retrySearch}
          onSelectTicker={setSelectedTicker}
          onFactorsChange={setFactors}
          onSortChange={setSortKey}
        />
        <MacroEvidenceBand
          t={t}
          scores={{
            growth: growthScore,
            liquidity: liquidityScore,
            inflation: inflationScore,
            external: externalScore,
          }}
          cycle={cycle}
          trendValues={macroTrend}
          macroSeries={macroSeries}
          sourceStatus={macroSourceStatus}
          selectedIndicator={indicator}
          overviewRef={macroRef}
          dataMapRef={dataRef}
          onRetry={retryMacroSnapshot}
          onSelectIndicator={setIndicator}
        />
      </div>
    </AppShell>
    <AiSettingsDialog
      open={showAiSettings}
      onClose={() => setShowAiSettings(false)}
      onSaved={() => setShowAiSettings(false)}
      t={t}
    />
  </>
);
```

- [ ] **Step 5: Verify state ownership and a clean build**

Run:

```bash
cd frontend
npm test
npm run build
if rg -n "macroQuery|activeGroup|timeframe|showProviderDiag" src/App.jsx; then
  echo "region-local state remains in App"
  exit 1
fi
if rg -n "stockQuery" src/components/MacroDataMap.jsx src/components/MacroEvidenceBand.jsx; then
  echo "stock query leaked into macro components"
  exit 1
fi
if rg -n "macroQuery" src/components/AppShell.jsx src/components/EquityDiscoveryPanel.jsx; then
  echo "macro query leaked outside MacroDataMap"
  exit 1
fi
```

Expected: tests and build pass; all three state-ownership gates exit `0`. App retains `stockQuery`, `selectedTicker`, and `indicator` as the intended shared domain state, plus language, AI access/settings, navigation, factors, request/retry state, and report state.

- [ ] **Step 6: Commit the final component composition**

```bash
git add frontend/src/App.jsx frontend/src/i18n/copy.js frontend/src/components/AppShell.jsx
git commit -m "refactor: compose decision cockpit shell"
```

---

### Task 8: Implement the wide-screen Decision Cockpit visual system

**Files:**
- Modify: `frontend/src/styles.css:1-530,647-1078`

**Interfaces:**
- Establishes CSS areas: `discovery`, `stock`, `ai`, and `macro`.
- Keeps `.ai-settings-*`, `.ai-password-*`, `.ai-message`, `.mini-bars`, `.score-gauge`, `.up`, `.down`, `.spin`, `.primary`, `.ghost`, `.segmented`, and `.icon-button` as shared public style contracts.
- Produces the 1181px+ reference layout. Task 9 adds the two narrower layouts.

- [ ] **Step 1: Replace the global, shell, command, and grid rules**

Replace the existing rules from `:root` through `.content-grid`, plus the existing shared `.panel`/heading/button rules, with this exact block. Keep the existing AI settings dialog rules for now.

```css
:root {
  color: #dce4eb;
  background: #07090d;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-synthesis: none;
  text-rendering: geometricPrecision;
  color-scheme: dark;
  --bg: #07090d;
  --surface: #0d1015;
  --surface-raised: #11151b;
  --surface-active: #13211e;
  --line: #252a31;
  --line-strong: #303841;
  --text: #e8edf2;
  --muted: #87939d;
  --teal: #3fe1c0;
  --lime: #d6f35b;
  --red: #ff7d87;
  --amber: #f2c76e;
  --radius: 7px;
}

* { box-sizing: border-box; }

html { min-width: 320px; background: var(--bg); }

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

button,
input,
select,
summary { font: inherit; }

button,
summary { cursor: pointer; }

button:disabled,
input:disabled,
select:disabled { cursor: not-allowed; opacity: 0.55; }

small {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.up { color: #4ee6ae !important; }
.down { color: var(--red) !important; }

.terminal {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--bg);
}

.rail {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  padding: 14px 9px;
  border-right: 1px solid var(--line);
  background: #090c10;
}

.brand {
  display: grid;
  place-items: center;
  min-height: 42px;
}

.brand > span {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid #315149;
  border-radius: 6px;
  background: #10201c;
  color: var(--teal);
  font-weight: 800;
}

.brand > div { display: none; }

.rail nav {
  display: grid;
  gap: 6px;
}

.rail nav button {
  position: relative;
  width: 100%;
  min-height: 42px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: transparent;
  color: #7e8993;
}

.rail nav button > span {
  display: block;
  max-width: 52px;
  overflow: hidden;
  color: currentColor;
  font-size: 12px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail nav button.active,
.rail nav button:hover {
  border-color: #29453d;
  background: var(--surface-active);
  color: var(--teal);
}

.rail nav button::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  z-index: 30;
  padding: 7px 9px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  background: #11171c;
  color: var(--text);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translate(4px, -50%);
  transition: opacity 140ms ease, transform 140ms ease;
}

.rail nav button:hover::after,
.rail nav button:focus-visible::after {
  opacity: 1;
  transform: translate(0, -50%);
}

.rail-source {
  margin-top: auto;
  min-height: 42px;
  display: grid;
  place-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.rail-source span {
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace {
  min-width: 0;
  padding: 0 8px 8px;
}

.topbar {
  min-width: 0;
  min-height: 62px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto minmax(130px, 210px) 36px auto 36px auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--line);
}

.searchbox,
.macro-search {
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 11px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: #0a0e13;
  color: var(--muted);
}

.searchbox input,
.macro-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
}

.market-strip {
  min-width: 0;
  display: flex;
  gap: 13px;
  overflow-x: auto;
  color: #9aa5ae;
  font-size: 12px;
  white-space: nowrap;
  scrollbar-width: thin;
}

.market-strip b { margin-left: 3px; color: var(--text); }

.market-strip-context {
  color: var(--muted);
  font-size: 12px;
  font-style: italic;
}

.command-source {
  min-width: 0;
  overflow: hidden;
}

.source-badge {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #a8b3bc;
  font-size: 12px;
  line-height: 1.35;
}

.source-badge::before {
  content: "";
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--muted);
}

.source-badge[data-source-kind="live"]::before { background: var(--teal); }
.source-badge[data-source-kind="cached"]::before { background: var(--lime); }
.source-badge[data-source-kind="loading"]::before { background: var(--teal); }
.source-badge[data-source-kind="stale"]::before,
.source-badge[data-source-kind="degraded"]::before { background: var(--amber); }
.source-badge[data-source-kind="mock"]::before { background: #7e8993; }

.command-source .source-badge {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary,
.ghost,
.icon-button,
.segmented button,
.filter-chips button,
.chart-toolbar button,
.provider-status {
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.primary {
  padding: 0 13px;
  border-color: var(--lime);
  background: var(--lime);
  color: #12160c;
  font-weight: 750;
}

.ghost,
.icon-button,
.provider-status {
  padding: 0 10px;
  border-color: #293139;
  background: #10151a;
  color: #b4bec6;
}

.icon-button { width: 36px; padding: 0; }

.segmented {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border: 1px solid #293038;
  border-radius: 6px;
  background: #090d12;
}

.segmented button {
  min-height: 28px;
  padding: 0 8px;
  background: transparent;
  color: #94a0a9;
  font-size: 14px;
  white-space: nowrap;
}

.segmented button.selected {
  border-color: #315148;
  background: var(--surface-active);
  color: var(--text);
}

.language-toggle button { min-width: 31px; }

.content-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: clamp(240px, 19.4vw, 280px) minmax(0, 1fr) clamp(300px, 23.6vw, 340px);
  grid-template-areas:
    "discovery stock ai"
    "macro macro macro";
  grid-template-rows: minmax(560px, calc(100vh - 420px)) 340px;
  gap: 8px;
  padding-top: 8px;
  align-items: stretch;
}

.panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.equity-discovery-panel { grid-area: discovery; }
.stock-decision-workspace { grid-area: stock; }
.ai-research-panel { grid-area: ai; }
.macro-evidence-band { grid-area: macro; }

.nav-target { scroll-margin-top: 70px; }

.region-heading {
  min-height: 58px;
  padding: 11px 13px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.region-heading h2,
.region-heading h3 {
  margin: 3px 0 0;
  color: var(--text);
  font-size: 16px;
  line-height: 1.2;
}
```

- [ ] **Step 2: Replace the old factor/table/detail styles with discovery and stock styles**

Delete the obsolete `.factor-panel`, `.table-panel`, `.panel-title`, table, `.active-row`, `.detail-panel`, `.detail-title-actions`, `.price-line`, and `.price-chart i` blocks. Add:

```css
.equity-discovery-panel {
  display: flex;
  flex-direction: column;
}

.equity-discovery-heading { flex: 0 0 auto; }

.market-tabs {
  flex: 0 0 auto;
  margin: 10px 11px 0;
}

.market-tabs button { flex: 1; }

.discovery-section {
  min-height: 0;
  border-top: 1px solid var(--line);
}

.discovery-section:first-of-type { margin-top: 10px; }

.discovery-section > summary {
  min-height: 36px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  color: #bcc6ce;
  font-size: 14px;
  font-weight: 650;
  list-style: none;
}

.discovery-section > summary::-webkit-details-marker { display: none; }

.discovery-section > summary::after {
  content: "+";
  margin-left: auto;
  color: var(--muted);
}

.discovery-section[open] > summary::after { content: "−"; }

.discovery-section-content { min-width: 0; }

.discovery-filters { flex: 0 0 auto; }

.slider-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 4px 12px;
}

.slider-row span {
  color: #b5c0c8;
  font-size: 12px;
  text-transform: capitalize;
}

.slider-row b {
  color: var(--text);
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

input[type="range"] { min-width: 0; accent-color: var(--teal); }

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 7px 11px 10px;
}

.filter-chips button {
  min-height: 27px;
  padding: 0 8px;
  border-color: #2a333a;
  background: #10151a;
  color: #a9b4bc;
  font-size: 14px;
}

.discovery-ranking {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.discovery-ranking[open] > .discovery-section-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.discovery-list-toolbar {
  min-width: 0;
  display: grid;
  gap: 7px;
  padding: 0 11px 8px;
}

.discovery-list-toolbar .segmented { width: 100%; }
.discovery-list-toolbar .segmented button { flex: 1; }

.source-notice {
  margin: 0 11px 8px;
  padding: 8px 9px;
  border-left: 2px solid var(--amber);
  background: #191710;
  color: #d7cfae;
  font-size: 14px;
  line-height: 1.45;
}

.region-status-message {
  margin: 0 11px 8px;
  padding: 8px 9px;
  border-left: 2px solid var(--amber);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #191710;
  color: #d7cfae;
  font-size: 14px;
  line-height: 1.45;
}

.region-status-message .ghost { flex: 0 0 auto; }

.provider-status {
  align-self: flex-start;
  margin: 0 11px 8px;
  min-height: 30px;
  font-size: 12px;
}

.provider-diag {
  margin: 0 11px 8px;
  padding: 8px;
  border: 1px solid var(--line);
  display: grid;
  gap: 4px;
  color: var(--muted);
  font-size: 12px;
}

.equity-list {
  min-height: 0;
  overflow-y: auto;
  border-top: 1px solid var(--line);
  scrollbar-width: thin;
}

.equity-empty {
  min-height: 100px;
  margin: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

.equity-row {
  width: 100%;
  min-width: 0;
  min-height: 84px;
  padding: 9px 11px;
  border: 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 78px;
  gap: 3px 8px;
  background: transparent;
  color: #cbd4db;
  text-align: left;
}

.equity-row:hover,
.equity-row.selected { background: var(--surface-active); }

.equity-row.selected { box-shadow: inset 2px 0 0 var(--teal); }

.equity-row-main,
.equity-row-quote {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.equity-row-main { grid-column: 1 / -1; }
.equity-row-main strong { color: var(--text); font-size: 14px; }

.score-pill {
  min-width: 31px;
  padding: 3px 6px;
  border-radius: 999px;
  background: #17332c;
  color: var(--teal);
  font-size: 12px;
  text-align: center;
}

.equity-row-name,
.equity-row-metrics {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.equity-row-quote { grid-column: 1; font-size: 12px; }
.equity-row-quote em { font-style: normal; }
.equity-row-metrics { grid-column: 1; }
.equity-row .mini-bars { grid-column: 2; grid-row: 2 / 5; align-self: end; }

.stock-decision-workspace {
  display: flex;
  flex-direction: column;
}

.stock-identity {
  min-height: 86px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.stock-identity h2 {
  margin: 4px 0 0;
  color: var(--text);
  font-size: 20px;
}

.stock-identity h2 span { color: #aeb9c1; font-weight: 500; }

.stock-identity p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.stock-price-block {
  display: grid;
  justify-items: end;
  gap: 6px;
  font-variant-numeric: tabular-nums lining-nums;
}

.stock-price-block > strong { color: var(--text); font-size: 27px; line-height: 1; }
.stock-price-block > span { display: inline-flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 700; }

.market-metadata-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.market-metadata-grid span {
  min-width: 0;
  min-height: 42px;
  padding: 7px 10px;
  border-right: 1px solid var(--line);
  display: grid;
  gap: 2px;
  color: var(--muted);
  font-size: 12px;
}

.market-metadata-grid b {
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-toolbar {
  min-width: 0;
  min-height: 52px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.timeframe-control { display: flex; gap: 4px; }

.chart-toolbar button {
  min-height: 30px;
  padding: 0 9px;
  background: transparent;
  color: #96a2ab;
  font-size: 14px;
}

.chart-toolbar button.selected {
  border-color: #315148;
  background: var(--surface-active);
  color: var(--text);
}

.indicator-control {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}

.indicator-control select {
  max-width: 180px;
  height: 32px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  padding: 0 28px 0 9px;
  background: #0a0e13;
  color: var(--text);
}

.price-chart {
  position: relative;
  flex: 1 1 auto;
  min-height: 320px;
  margin: 0 14px 12px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #090d12;
}

.price-chart svg { width: 100%; height: 100%; display: block; }

.chart-grid-line { stroke: #20262d; stroke-width: 1; }
.chart-line { fill: none; stroke: var(--teal); stroke-width: 2.3; vector-effect: non-scaling-stroke; }
.chart-comparison-line {
  fill: none;
  stroke: var(--lime);
  stroke-width: 1.4;
  stroke-dasharray: 6 5;
  opacity: 0.78;
  vector-effect: non-scaling-stroke;
}
.chart-endpoint { fill: var(--lime); stroke: #172018; stroke-width: 2; }

.chart-comparison-label {
  position: absolute;
  top: 10px;
  right: 11px;
  padding: 4px 7px;
  border: 1px solid #2d383e;
  background: #0d1217;
  color: #b4bec6;
  font-size: 12px;
}

.chart-context-note {
  margin: -4px 14px 10px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--line);
}

.metric-grid span {
  min-width: 0;
  min-height: 48px;
  padding: 8px 11px;
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: grid;
  gap: 3px;
  color: var(--muted);
  font-size: 12px;
}

.metric-grid b { color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; }
```

- [ ] **Step 3: Replace the old nested AI and split macro styles**

Delete the old `.ai-analysis-panel`, `.ai-analysis-heading`, `.macro-panel`, `.macro-table`, `.macro-trend`, and all obsolete auto-grid placement rules. Keep the existing AI dialog/input/message rules, then add:

```css
.ai-research-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ai-research-heading { flex: 0 0 auto; }
.ai-research-heading h2 { display: flex; align-items: center; gap: 7px; }

.ai-run-button {
  min-height: 100px;
  margin: 14px;
  border: 1px dashed #315147;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: #0f1c18;
  color: var(--teal);
  font-weight: 700;
}

.ai-refresh-status {
  margin: 10px 13px 0;
  padding: 8px 10px;
  border-left: 2px solid var(--teal);
  display: flex;
  align-items: center;
  gap: 7px;
  background: #0e1916;
  color: #b9d8d1;
  font-size: 14px;
}

.ai-password-block { padding: 12px 13px 0; }

.ai-password-form {
  padding: 12px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  display: grid;
  gap: 7px;
  background: #0a0f14;
  color: #b8c2ca;
  font-size: 14px;
}

.ai-password-form > div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }

.ai-password-form input {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: #090d12;
  color: var(--text);
}

.ai-message {
  margin: 12px 13px 0;
  padding: 10px;
  border: 1px solid var(--line-strong);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: #11171c;
  color: #c5d0d6;
  font-size: 14px;
}

.ai-message.error {
  border-color: #5f343a;
  background: #1b1115;
  color: #ffadb4;
}

.ai-analysis-content {
  min-height: 0;
  padding: 13px;
  display: grid;
  gap: 11px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.ai-analysis-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--line);
}

.ai-analysis-summary > div { display: grid; gap: 4px; }
.ai-analysis-summary strong { color: var(--text); font-size: 18px; font-variant-numeric: tabular-nums; }

.ai-analysis-summary p {
  grid-column: 1 / -1;
  margin: 2px 0 0;
  color: #c1cbd2;
  font-size: 14px;
  line-height: 1.6;
}

.ai-analysis-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }

.ai-analysis-grid article,
.ai-watchlist {
  min-width: 0;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.ai-analysis-content h3 { margin: 0 0 8px; color: #dfe7ec; font-size: 14px; }

.ai-analysis-content ul {
  margin: 0;
  padding-left: 18px;
  color: #aab6be;
  font-size: 14px;
  line-height: 1.55;
}

.ai-rating.bullish { color: var(--teal); }
.ai-rating.neutral { color: var(--amber); }
.ai-rating.bearish { color: var(--red); }

.ai-watchlist > div { display: grid; gap: 7px; }

.ai-watchlist span {
  display: grid;
  grid-template-columns: minmax(70px, 0.7fr) minmax(54px, auto) minmax(0, 1.4fr);
  gap: 7px;
  padding-top: 7px;
  border-top: 1px solid #20272d;
  align-items: baseline;
}

.ai-watchlist b,
.ai-watchlist em { color: #d9e4e1; font-size: 14px; font-style: normal; }
.ai-watchlist small { font-size: 14px; }

.ai-analysis-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.ai-analysis-actions {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 7px;
}

.ai-analysis-actions button { width: 100%; }

.ai-inline-error { margin: 0; color: #ff9aa3; font-size: 14px; }

.ai-disclaimer {
  margin: auto 13px 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.macro-evidence-band {
  height: 340px;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.9fr);
}

.macro-evidence-overview,
.macro-data-map { min-width: 0; min-height: 0; }

.macro-evidence-overview { overflow-y: auto; }

.macro-data-map {
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
}

.macro-data-map-heading { align-items: flex-start; }
.macro-data-map-heading .macro-search { width: min(230px, 42%); }

.macro-groups {
  margin: 9px 12px;
  overflow-x: auto;
  scrollbar-width: thin;
}

.macro-score-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.score-gauge {
  min-width: 0;
  padding: 12px;
  border-right: 1px solid var(--line);
}

.score-gauge:last-child { border-right: 0; }
.score-gauge div:first-child { display: flex; justify-content: space-between; align-items: baseline; gap: 7px; }
.score-gauge span { color: #a6b1b9; font-size: 12px; }
.score-gauge strong { color: var(--text); font-size: 24px; font-variant-numeric: tabular-nums; }
.score-gauge p { margin: 6px 0 0; color: var(--muted); font-size: 12px; line-height: 1.4; }

.gauge-track {
  height: 4px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #20272e;
}

.gauge-track span { display: block; height: 100%; background: var(--teal); }

.regime-row {
  display: grid;
  grid-template-columns: minmax(250px, 0.9fr) minmax(0, 1.1fr);
  gap: 10px;
  padding: 10px;
}

.cycle-map {
  position: relative;
  min-height: 160px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  background: #090d12;
}

.cycle-map::before,
.cycle-map::after {
  content: "";
  position: absolute;
  background: var(--line);
}

.cycle-map::before { top: 50%; left: 0; width: 100%; height: 1px; }
.cycle-map::after { top: 0; left: 50%; width: 1px; height: 100%; }

.cycle-dot {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, 50%);
  min-height: 28px;
  padding: 5px 9px;
  border: 1px solid var(--lime);
  border-radius: 999px;
  background: #1b2419;
  color: #e9ff91;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.axis-x,
.axis-y,
.cycle-map small { position: absolute; z-index: 1; color: var(--muted); font-size: 12px; }
.axis-x { right: 9px; bottom: 7px; }
.axis-y { left: 9px; top: 7px; }
.q1 { right: 10px; bottom: 30px; }
.q2 { right: 10px; top: 10px; }
.q3 { left: 10px; bottom: 30px; }
.q4 { left: 10px; top: 10px; }

.macro-conclusion {
  min-width: 0;
  display: grid;
  align-content: center;
  gap: 10px;
}

.macro-conclusion > div { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.macro-conclusion strong { color: var(--text); font-size: 38px; font-variant-numeric: tabular-nums; }
.macro-conclusion h3 { margin: 0; color: #dce5ea; font-size: 14px; }
.macro-conclusion p { margin: 0; color: #aab5bd; font-size: 14px; line-height: 1.55; }

.macro-list { min-height: 0; flex: 1 1 auto; overflow-y: auto; border-top: 1px solid var(--line); scrollbar-width: thin; }

.macro-empty {
  min-height: 116px;
  margin: 0;
  display: grid;
  place-items: center;
  padding: 14px;
  color: var(--muted);
  font-size: 14px;
  text-align: center;
}

.macro-row {
  width: 100%;
  min-height: 60px;
  padding: 9px 12px;
  border: 0;
  border-bottom: 1px solid var(--line);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px 90px;
  gap: 9px;
  align-items: center;
  background: transparent;
  color: #d1dae0;
  text-align: left;
}

.macro-row:hover,
.macro-row.selected { background: var(--surface-active); }
.macro-row.selected { box-shadow: inset 2px 0 0 var(--lime); }

.macro-row-identity { min-width: 0; display: grid; gap: 3px; }
.macro-row-identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.macro-row b,
.macro-row em { text-align: right; font-variant-numeric: tabular-nums; }
.macro-row em { color: var(--teal); font-style: normal; }

.mini-bars {
  height: 26px;
  min-width: 76px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.mini-bars span { flex: 1; min-width: 2px; border-radius: 2px 2px 0 0; background: var(--teal); }
.mini-bars.red span { background: var(--red); }
.mini-bars.green span { background: var(--lime); }

.spin { animation: spin 800ms linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.ai-settings-fields label,
.ai-settings-dialog .ai-message,
.ai-inline-error { font-size: 14px; }
```

In the preserved AI-settings block, delete `backdrop-filter: blur(8px)` from `.ai-settings-backdrop` and delete the `0 24px 72px` box shadow from `.ai-settings-dialog`. The modal stays flat and opaque like the cockpit panels; do not replace either effect with another blur or heavy shadow.

- [ ] **Step 4: Remove conflicting legacy selectors and order the stylesheet**

Use `rg -n` to locate and delete every remaining obsolete rule for this exact selector list:

```text
.rail-card
.panel-title
.factor-panel
.table-panel
.backtest-box
table
thead
tbody
th
td
.active-row
.detail-panel
.detail-title-actions
.price-line
.ai-analysis-panel
.ai-analysis-heading
.macro-panel
.macro-table
.macro-table-tools
.macro-trend
.segmented.scroll
```

Also delete the old trailing block that currently begins with `.table-actions` after the mobile media query and contains the legacy `.provider-status`, `.source-notice`, and `.provider-diag` rules. Keep the new discovery-panel versions from Step 2; there must be only one active definition of each after the rewrite.

Move all base/shared/component rules before any media query. Leave the AI settings dialog block intact, except update its hard-coded colors to the matching CSS variables where a direct equivalent exists. After deletion, this check must return no obsolete selectors:

```bash
cd frontend
if rg -n '(^|[,{[:space:]])(table|thead|tbody|th|td)([[:space:],.{:#]|$)|\.(rail-card|panel-title|factor-panel|table-panel|backtest-box|active-row|detail-panel|detail-title-actions|price-line|ai-analysis-panel|ai-analysis-heading|macro-panel|macro-table|macro-table-tools|macro-trend)([[:space:],.{:#]|$)|\.segmented\.scroll([[:space:],.{:#]|$)' src/styles.css; then
  echo "obsolete cockpit selector remains"
  exit 1
fi
```

Expected: the obsolete-selector gate exits `0` without printing an error.

- [ ] **Step 5: Build and inspect the 1440×1024 reference viewport**

Run:

```bash
cd frontend
npm test
npm run build
```

Expected: all tests pass and Vite exits `0`.

Start the existing backend and frontend in reusable terminal sessions if they are not already running:

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm run dev -- --port 5173
```

Use `browser:control-in-app-browser` to open `http://127.0.0.1:5173`, set the viewport to `1440×1024`, and capture `/tmp/decision-cockpit-1440x1024.png`. Compare it side by side with `docs/superpowers/specs/assets/2026-07-16-decision-cockpit-ui.png`. Before committing, fix all of these concrete wide-screen failures if present:

- rail is not 72px;
- discovery is outside 240–280px or AI outside 300–340px;
- chart is not the dominant center object;
- AI is nested inside the stock panel;
- macro band does not span all three upper columns;
- the 340px desktop macro evidence band expands to show all rows instead of keeping the Macro Data Map list internally scrollable;
- any panel clips content or the page scrolls horizontally;
- gradients, glass surfaces, heavy shadows, or nested-card borders appear;
- primary text is below 14px or numeric columns do not align.

- [ ] **Step 6: Commit the verified wide-screen visual system**

```bash
git add frontend/src/styles.css
git commit -m "style: implement decision cockpit desktop layout"
```

---

### Task 9: Add responsive layouts, keyboard focus, touch sizing, and reduced motion

**Files:**
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/App.jsx` only if the Task 7 child DOM order has not already been changed to stock → AI → discovery → macro.
- Modify: `frontend/src/components/AiSettingsDialog.jsx`

**Interfaces:**
- Medium `761–1180px`: explicit `discovery/stock`, `discovery/ai`, `macro/macro` areas.
- Mobile `≤760px`: DOM and visual task order stock → AI → discovery → macro; command-bar equity search remains before the grid.
- All supported widths: no page horizontal overflow, visible focus, scoped internal scrolling, readable source text.

- [ ] **Step 1: Ensure DOM order matches mobile keyboard order**

Inside App's `.content-grid`, the component order must be exactly:

```jsx
<StockDecisionWorkspace
  t={t}
  lang={lang}
  stock={selectedStock}
  indicator={indicator}
  indicatorOptions={macroSeries}
  realtimeMeta={realtimeMeta}
  sectionRef={chartRef}
  onIndicatorChange={setIndicator}
/>
<AiResearchPanel
  t={t}
  lang={lang}
  ticker={selectedStock.ticker}
  score={selectedStock.score}
  status={aiAnalysis.status}
  result={aiAnalysis.result}
  error={aiAnalysis.error}
  needsPassword={showAnalysisPassword || aiAnalysis.needsPassword}
  onAnalyze={() => requestAnalysis(false)}
  onRefresh={() => requestAnalysis(true)}
  onExport={handleExportAiAnalysis}
  onSubmitPassword={(password) => {
    setAnalysisPassword(password);
    setShowAnalysisPassword(false);
    if (pendingAnalysisForce === null) setPendingAnalysisForce(false);
  }}
  onOpenSettings={() => setShowAiSettings(true)}
/>
<EquityDiscoveryPanel
  t={t}
  stocks={filteredStocks}
  selectedTicker={selectedTicker}
  factors={factors}
  sortKey={sortKey}
  searchState={searchState}
  stockSourceStatus={stockSourceStatus}
  realtimeMeta={realtimeMeta}
  activeProvider={activeProvider}
  activeProviderHealth={activeProviderHealth}
  providerDiag={providerDiag}
  sectionRef={screenerRef}
  onRetryStockSnapshot={retryStockSnapshot}
  onRetrySearch={retrySearch}
  onSelectTicker={setSelectedTicker}
  onFactorsChange={setFactors}
  onSortChange={setSortKey}
/>
<MacroEvidenceBand
  t={t}
  scores={{
    growth: growthScore,
    liquidity: liquidityScore,
    inflation: inflationScore,
    external: externalScore,
  }}
  cycle={cycle}
  trendValues={macroTrend}
  macroSeries={macroSeries}
  sourceStatus={macroSourceStatus}
  selectedIndicator={indicator}
  overviewRef={macroRef}
  dataMapRef={dataRef}
  onRetry={retryMacroSnapshot}
  onSelectIndicator={setIndicator}
/>
```

CSS grid areas preserve discovery/stock/AI placement on desktop, while this DOM order preserves the approved mobile Tab sequence.

- [ ] **Step 2: Add the complete medium breakpoint**

Replace the old `@media (max-width: 1180px)` block with:

```css
@media (max-width: 1180px) {
  .terminal { grid-template-columns: 74px minmax(0, 1fr); }
  .rail nav button > span { display: none; }

  .topbar {
    min-height: 104px;
    padding: 8px 0;
    grid-template-columns: minmax(220px, 1fr) 36px auto 36px auto;
    grid-template-areas:
      "search settings language alerts export"
      "market market market source source";
  }

  .searchbox { grid-area: search; }
  .market-strip { grid-area: market; }
  .command-source { grid-area: source; justify-self: end; }
  .topbar > .icon-button:nth-of-type(1) { grid-area: settings; }
  .language-toggle { grid-area: language; }
  .topbar > .icon-button:nth-of-type(2) { grid-area: alerts; }
  .report-export { grid-area: export; }

  .content-grid {
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-areas:
      "discovery stock"
      "discovery ai"
      "macro macro";
    grid-template-rows: auto auto auto;
  }

  .equity-discovery-panel { max-height: calc(100vh - 120px); position: sticky; top: 112px; }
  .stock-decision-workspace { min-height: 560px; }
  .ai-research-panel { height: clamp(430px, 62vh, 620px); min-height: 430px; }
  .ai-analysis-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .macro-evidence-band { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
  .macro-evidence-band { height: 420px; }
  .macro-data-map { border-top: 1px solid var(--line); border-left: 0; }
  .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```

- [ ] **Step 3: Add the complete mobile breakpoint**

Replace the old `@media (max-width: 760px)` block with:

```css
@media (max-width: 760px) {
  .terminal { display: block; }

  .rail {
    position: sticky;
    top: 0;
    z-index: 20;
    width: 100%;
    height: 56px;
    padding: 6px 8px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
  }

  .brand { flex: 0 0 44px; min-height: 44px; }
  .brand > span { width: 34px; height: 34px; }

  .rail nav {
    flex: 1 0 auto;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .rail nav button { width: 44px; min-width: 44px; min-height: 44px; }
  .rail nav button::after { display: none; }
  .rail-source { display: none; }

  .workspace { width: 100%; padding: 0 6px 8px; }

  .topbar {
    min-height: 162px;
    padding: 7px 0;
    grid-template-columns: 44px auto 44px minmax(112px, 1fr);
    grid-template-areas:
      "search search search search"
      "market market market market"
      "settings language alerts export";
    gap: 7px;
  }

  .searchbox { grid-area: search; height: 44px; }
  .market-strip { grid-area: market; min-height: 36px; align-items: center; }
  .command-source { display: none; }
  .topbar > .icon-button:nth-of-type(1) { grid-area: settings; }
  .language-toggle { grid-area: language; }
  .topbar > .icon-button:nth-of-type(2) { grid-area: alerts; }
  .report-export { grid-area: export; width: 100%; }
  .topbar .icon-button,
  .language-toggle button,
  .report-export { min-height: 44px; }

  .content-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "stock"
      "ai"
      "discovery"
      "macro";
    grid-template-rows: auto;
    gap: 7px;
  }

  .panel,
  .content-grid > *,
  .macro-evidence-overview,
  .macro-data-map { min-width: 0; max-width: 100%; }

  .stock-decision-workspace { min-height: 520px; }
  .stock-identity { min-height: 112px; flex-direction: column; gap: 10px; }
  .stock-price-block { justify-items: start; }
  .chart-toolbar { align-items: stretch; flex-direction: column; }
  .timeframe-control { width: 100%; }
  .timeframe-control button { flex: 1; min-height: 44px; }
  .indicator-control { min-height: 44px; justify-content: space-between; }
  .indicator-control select { min-height: 44px; max-width: 62%; }
  .price-chart { min-height: 220px; margin: 0 10px 10px; }
  .market-metadata-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

  .ai-research-panel { height: clamp(430px, 72vh, 620px); min-height: 430px; }
  .ai-analysis-grid { grid-template-columns: 1fr; }
  .ai-analysis-actions { width: 100%; }
  .ai-analysis-actions button,
  .ai-run-button { width: 100%; min-height: 44px; }
  .ai-research-heading .ghost { min-height: 44px; }
  .ai-password-form > div { grid-template-columns: 1fr; }
  .ai-password-form input,
  .ai-password-form button { min-height: 44px; }

  .equity-discovery-panel { position: static; max-height: none; }
  .discovery-section > summary { min-height: 44px; }
  .slider-row { min-height: 44px; }
  .market-tabs { overflow-x: auto; }
  .market-tabs button,
  .discovery-list-toolbar .segmented button,
  .filter-chips button,
  .provider-status { min-height: 44px; }
  input[type="range"] { min-height: 44px; }
  .equity-row { min-height: 84px; }
  .equity-list { max-height: 520px; }

  .macro-evidence-band { height: auto; grid-template-columns: minmax(0, 1fr); }
  .macro-score-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .regime-row { grid-template-columns: minmax(0, 1fr); }
  .cycle-map { min-height: 210px; }
  .macro-data-map { max-height: 620px; border-left: 0; border-top: 1px solid var(--line); }
  .macro-data-map-heading { align-items: stretch; flex-direction: column; }
  .macro-data-map-heading .macro-search { width: 100%; min-height: 44px; }
  .macro-groups button { min-height: 44px; }
  .macro-row { min-height: 68px; grid-template-columns: minmax(0, 1fr) auto; }
  .macro-row em { grid-column: 2; }
  .macro-row-identity { grid-row: 1 / 3; }
  .region-status-message .ghost,
  .ai-settings-dialog .icon-button,
  .ai-settings-dialog input,
  .ai-dialog-actions button { min-height: 44px; }
}
```

- [ ] **Step 4: Add global focus and reduced-motion rules**

Add these rules after all width breakpoints:

```css
:where(button, input, select, summary, [role="button"]):focus-visible {
  outline: 2px solid var(--lime) !important;
  outline-offset: 2px;
}

.searchbox:focus-within,
.macro-search:focus-within {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
}

.searchbox input:focus-visible,
.macro-search input:focus-visible { outline: 0 !important; }

.equity-row:focus-visible,
.macro-row:focus-visible { outline-offset: -3px; }

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .spin { animation: none; }
}
```

- [ ] **Step 5: Contain AI-settings focus and restore the opener**

In `frontend/src/components/AiSettingsDialog.jsx`, add `useRef` to the React import and create these refs after the existing state:

```jsx
const dialogRef = useRef(null);
const closeButtonRef = useRef(null);
const returnFocusRef = useRef(null);
```

Replace the current open/keyboard effect with this complete effect. Task 7 has already made the dialog a sibling of `.terminal`, so inerting `.terminal` cannot inert the dialog itself:

```jsx
useEffect(() => {
  if (!open) return undefined;

  let active = true;
  let focusFrame;
  const returnTarget = document.activeElement;
  returnFocusRef.current = returnTarget instanceof HTMLElement ? returnTarget : null;
  const terminal = document.querySelector(".terminal");
  const previousInert = terminal?.inert ?? false;
  if (terminal) terminal.inert = true;

  setPending(true);
  setNotice("");
  setErrorCode("");
  getAiConfigStatus()
    .then((configStatus) => {
      if (!active) return;
      setBaseUrl(configStatus.base_url ?? "");
      setModel(configStatus.model ?? "");
      setMaskedKey(configStatus.api_key_masked ?? "");
    })
    .catch(() => active && setErrorCode("generic"))
    .finally(() => active && setPending(false));

  const focusableElements = () => [...dialogRef.current.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
  )].filter((element) => element.getClientRects().length > 0);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    const focusIsOutside = !dialogRef.current?.contains(document.activeElement);
    if (event.shiftKey && (document.activeElement === first || focusIsOutside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || focusIsOutside)) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", handleKeyDown, true);
  focusFrame = window.requestAnimationFrame(() => {
    (closeButtonRef.current ?? dialogRef.current)?.focus();
  });

  return () => {
    active = false;
    document.removeEventListener("keydown", handleKeyDown, true);
    window.cancelAnimationFrame(focusFrame);
    if (terminal) terminal.inert = previousInert;
    clearSensitiveState();
    const target = returnFocusRef.current;
    window.requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
      else document.querySelector("[data-ai-settings-trigger]")?.focus();
    });
  };
}, [open]);
```

Attach the refs and fallback focus target to the existing JSX:

```jsx
<section
  ref={dialogRef}
  className="ai-settings-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="ai-settings-title"
  tabIndex={-1}
>
  {/* existing header/fields/messages/actions */}
  <button
    ref={closeButtonRef}
    type="button"
    className="icon-button"
    onClick={closeDialog}
    aria-label={t.ai.close}
  >
    <X size={17} />
  </button>
</section>
```

Keep backdrop-click, save, test, and sensitive-state behavior unchanged. From both the command-bar and AI-panel settings triggers, verify initial focus enters the dialog, forward/reverse Tab wrap at the ends, Escape/X/backdrop/save return focus to the exact opener, and a removed opener falls back to `[data-ai-settings-trigger]`. While open, no background element may receive keyboard or assistive-technology focus.

- [ ] **Step 6: Verify the three responsive reference sizes in the in-app browser**

With the local servers running, use `browser:control-in-app-browser` and capture:

```text
/tmp/decision-cockpit-1180x900.png
/tmp/decision-cockpit-760x900.png
/tmp/decision-cockpit-390x844.png
```

At `1180×900`, verify a 74px rail, 240px discovery, stock then AI in the flexible right column, macro across both columns, and a horizontally scrollable market strip.

At `760×900`, verify the mobile breakpoint is active exactly at 760px, the sticky horizontal rail remains usable, and the page has no horizontal overflow.

At `390×844`, verify the visible content task order after the command bar is stock/chart → AI → discovery disclosures → macro overview → Macro Data Map. The single DOM intentionally preserves that mobile content order at every width; verify the full natural keyboard order separately in Task 10, including rail and all command-bar controls. Verify all primary controls are at least 44px, PDF/report actions remain reachable, and no macro value is hidden.

At `1440×1024`, `1180×900`, and `390×844`, capture the AI panel in empty, loading, password, error, and successful-analysis states. At each viewport the panel's `getBoundingClientRect().height` must remain within 2px across states; long successful analyses scroll inside the panel rather than expanding its grid row. At desktop, confirm the macro band remains compact with its list scrolling internally.

For each viewport, run this in the browser console and require `true`:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Enable the operating system/browser reduced-motion preference and verify rail navigation no longer scrolls smoothly and loading icons do not continuously rotate.

- [ ] **Step 7: Run regression and commit responsive/accessibility work**

Run:

```bash
cd frontend
npm test
npm run build
```

Expected: all tests pass, Vite exits `0`, and the browser console contains no React warnings or runtime errors at any reference viewport.

```bash
git add frontend/src/App.jsx frontend/src/components/AiSettingsDialog.jsx frontend/src/styles.css
git commit -m "style: add responsive accessible cockpit layouts"
```

---

### Task 10: Perform full behavior, visual, export, and completion verification

**Files:**
- Modify only an intended frontend file if this verification exposes a defect; otherwise create no new files and no commit.

**Interfaces:**
- Verifies the full acceptance contract in `docs/superpowers/specs/2026-07-16-decision-cockpit-ui-redesign-design.md`.
- Produces no deployment or server mutation beyond local development processes.

- [ ] **Step 1: Run clean automated verification**

Run from a clean terminal:

```bash
cd frontend
npm test
npm run build
cd ..
git diff --check de6570b..HEAD
git diff --check
```

Expected: every Node test passes, Vite exits `0`, and both committed-range and working-tree whitespace checks print no errors.

- [ ] **Step 2: Verify equity and macro state independence in both languages**

In the in-app browser at `1440×1024`, perform this exact sequence:

1. In Macro Data Map, choose `Liquidity`, enter `M2`, and record the selected chart comparison indicator.
2. In the top command search, enter `600519`; confirm the ranking/selected stock/stock chart/AI ticker update while the macro group remains `Liquidity` and macro query remains `M2`.
3. Clear the equity query and select `NVDA`; confirm macro state still does not change. Also clear a query whose selected result existed only in remote search results; confirm the rendered fallback equity, row highlight, realtime hook, AI ticker, and exports all reconcile to the same ticker.
4. In Macro Data Map, switch to `Inflation`, enter `CPI`, and select the CPI row; confirm only the chart comparison select changes to CPI. The equity query and ticker remain unchanged.
5. Enter a macro query with no matches; confirm the macro empty state appears while stock identity and AI content remain visible.
6. Enter an equity query with no matches; confirm the equity empty state appears while macro query/group and current macro content remain unchanged.
7. Switch Chinese → English → Chinese; confirm ticker, comparison indicator, macro query, macro group, and visible region remain stable.
8. With a successful A-share-only Baostock snapshot, open CN/HK/US tabs; confirm HK/US prototype rows remain available and every row displays its truthful source instead of being mislabeled as live.

Repeat steps 1–4 at `390×844` to prove responsive rendering did not reconnect the two search domains.

- [ ] **Step 3: Verify AI, settings, and both exports without losing visible results**

Using the existing page-session analysis password flow and configured provider/cache:

1. Select a stock without a visible analysis and verify the empty action, password request, invalid-password inline error, corrected password, loading state, and success state occur inside the AI panel without a global modal/toast.
2. With a valid analysis visible, trigger refresh and verify the last result stays visible with the localized refresh status.
3. Trigger a recoverable upstream failure; verify the error is inline and the last valid result remains. Retry and verify success clears the error.
4. Verify AI settings remains reachable from the command bar and AI panel. From each opener, initial focus enters the dialog; forward/reverse Tab wrap; Escape, X, backdrop, and save restore the exact opener; background controls stay inert; save/close behavior otherwise remains unchanged.
5. Verify `导出 PDF` is absent without a valid analysis, visible with one, disabled while generating, reports a localized sanitized failure, and succeeds on retry without clearing analysis.
6. Verify the command-bar Markdown report still downloads and includes selected stock, Top 10 ranking, macro scores/series, stock/macro source labels, notice/warning, and provider chain.
7. Change ticker or language during/after a PDF attempt and verify the prior ticker/language result is immediately hidden, cannot be exported, and transient PDF state resets for the new request key.

For an A-share realtime response, confirm open/high/low/previous close/volume/amount/turnover render only from returned quote fields and use `--` when unavailable. Confirm the chart note says the equity trace is a prototype preview, timeframe changes only select existing preview windows, and macro comparison lines use the selected series' real backend points.

Never place the analysis password, administrator password, API key, or downloaded report contents in the repository or terminal output.

- [ ] **Step 4: Verify data-source and keyboard/accessibility states**

Confirm each available source state displays text plus its visual marker: realtime, cached/closed market, stale retry, mock fallback, and degraded provider. Open provider diagnostics and confirm the provider chain remains readable and does not resize the whole page horizontally.

Force one macro snapshot failure, one equity snapshot failure, and one same-query search-provider failure. Confirm the last valid rows/scores remain visible, each scoped loading/error announcement appears, snapshot/search retry targets the correct request, macro/equity manual retries use `force=true`, and a realtime warning relies on its own automatic quote retry instead of showing a misleading snapshot retry. A no-match search must say “no matches,” never “provider unavailable.”

Using keyboard only, verify every focusable region in the actual DOM order (do not claim CSS grid placement changes Tab order):

```text
rail navigation → command search → AI settings → language → Markdown export → stock timeframe/comparison → AI action/PDF → discovery market/sort/row/factors → macro group/search/row
```

Require no unexpected focus jumps, visible unclipped focus throughout (including first/last list rows), `aria-pressed`/`aria-current` on selections, and scoped live announcements for loading/empty/error/success states. Focus is trapped only while the AI settings dialog is open and restored on close.

- [ ] **Step 5: Perform the final visual comparison**

Open these two images side by side in Codex:

```text
docs/superpowers/specs/assets/2026-07-16-decision-cockpit-ui.png
/tmp/decision-cockpit-1440x1024.png
```

Recapture the coded screenshot after every visual fix. Do not accept the desktop comparison until hierarchy, panel anatomy, spacing, border rhythm, typography, graphite surfaces, teal/lime emphasis, and visible content match the approved source closely while preserving the state constraints.

Review the three narrower screenshots again after the last desktop fix to catch breakpoint regressions.

- [ ] **Step 6: Inspect the final change set and prohibited scope**

Run:

```bash
git status --short
git diff --name-only de6570b..HEAD
if rg -n "radial-gradient|linear-gradient|backdrop-filter|0 24px 72px" frontend/src/styles.css frontend/src/components frontend/src/App.jsx; then
  echo "decorative gradient, glass blur, or heavy dialog shadow remains"
  exit 1
fi
if rg -n "stockQuery" frontend/src/components/MacroDataMap.jsx frontend/src/components/MacroEvidenceBand.jsx; then
  echo "stock query leaked into macro components"
  exit 1
fi
if rg -n "macroQuery|activeGroup" frontend/src/App.jsx frontend/src/components/AppShell.jsx frontend/src/components/EquityDiscoveryPanel.jsx; then
  echo "macro filter state leaked outside MacroDataMap"
  exit 1
fi
if rg -n "TODO|FIXME|TBD|PLACEHOLDER" frontend/src; then
  echo "unfinished implementation marker remains"
  exit 1
fi
rg -l "api[_-]?key|admin.*password|analysis.*password|authorization|<think>" frontend/src/components frontend/src/utils/reportExport.js frontend/src/utils/aiPdfReport.js || true
```

Expected:

- changed implementation files are limited to the frontend paths listed in this plan plus this plan document;
- the three pre-existing untracked 2026-07-15 plan files remain untouched and uncommitted;
- there are no unfinished implementation markers or decorative gradients in the cockpit UI; any password/API-key matches are existing settings/auth code or defensive export tests, never rendered/exported secrets;
- macro components contain no `stockQuery` and App/Shell/Discovery contain no `macroQuery` or `activeGroup`;
- no backend, deployment, Nginx, or dependency files changed.

- [ ] **Step 7: Review every approved acceptance criterion**

Read `docs/superpowers/specs/2026-07-16-decision-cockpit-ui-redesign-design.md` from top to bottom and check off each visual, behavior, loading/error/source, responsive, accessibility, and verification bullet against automated output or browser evidence from this task. If a defect required a code change, rerun Steps 1–6 and commit only the focused fix:

```bash
git add \
  frontend/src/App.jsx \
  frontend/src/hooks/useMarketData.js \
  frontend/src/components/AppShell.jsx \
  frontend/src/components/AiSettingsDialog.jsx \
  frontend/src/components/EquityDiscoveryPanel.jsx \
  frontend/src/components/StockDecisionWorkspace.jsx \
  frontend/src/components/AiResearchPanel.jsx \
  frontend/src/components/MacroEvidenceBand.jsx \
  frontend/src/components/MacroDataMap.jsx \
  frontend/src/i18n/copy.js \
  frontend/src/styles.css \
  frontend/src/utils/equityDiscovery.js \
  frontend/src/utils/equityDiscovery.test.js \
  frontend/src/utils/dataSourceStatus.js \
  frontend/src/utils/dataSourceStatus.test.js \
  frontend/src/utils/snapshotRequestState.js \
  frontend/src/utils/snapshotRequestState.test.js \
  frontend/src/utils/decisionChart.js \
  frontend/src/utils/decisionChart.test.js \
  frontend/src/utils/metrics.test.js \
  frontend/src/utils/aiAnalysis.js \
  frontend/src/utils/aiAnalysis.test.js \
  frontend/src/utils/reportExport.js \
  frontend/src/utils/reportExport.test.js
git commit -m "fix: resolve decision cockpit verification issues"
```

Do not push or deploy without a separate explicit user instruction.
