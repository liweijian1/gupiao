# Watchlist Realtime and History Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep authenticated watchlist prices current and make historical-chart provider failures safe and understandable.

**Architecture:** The frontend polls the existing realtime endpoint for eligible saved tickers and overlays each response onto the saved watchlist list without altering saved order. The history route emits a stable domain error, and the chart hook maps that error to localized user-facing copy instead of the upstream exception.

**Tech Stack:** React 19 hooks, FastAPI, pytest, Node test runner, Vite.

## Global Constraints

- Poll only six-digit A-share saved tickers, every 15 seconds while authenticated.
- Keep the latest successful saved row when a poll fails; do not erase rows or reorder the watchlist.
- Do not expose upstream exception text to the browser.
- Reuse `/api/stocks/realtime`; do not add live trading or new quote providers.

---

### Task 1: Stable history-unavailable API response

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/tests/test_stock_history_route.py`

**Interfaces:**
- Consumes: `StockHistoryUnavailable` from `app.market_data.stock_history`.
- Produces: HTTP 503 `{"detail":{"code":"history_unavailable","message":"Historical market data is temporarily unavailable."}}`.

- [ ] **Step 1: Write the failing route test**

```python
def test_history_route_hides_upstream_exception(monkeypatch):
    monkeypatch.setattr(main, "get_stock_history", lambda **_: (_ for _ in ()).throw(StockHistoryUnavailable("RemoteDisconnected secret detail")))
    response = TestClient(main.app).get("/api/stocks/history?symbol=600519")
    assert response.status_code == 503
    assert response.json()["detail"] == {"code": "history_unavailable", "message": "Historical market data is temporarily unavailable."}
```

- [ ] **Step 2: Verify RED**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stock_history_route.py::test_history_route_hides_upstream_exception -q`

Expected: FAIL because the response currently returns the upstream exception message.

- [ ] **Step 3: Return a fixed public message**

```python
except StockHistoryUnavailable as exc:
    raise HTTPException(
        status_code=503,
        detail={"code": "history_unavailable", "message": "Historical market data is temporarily unavailable."},
    ) from exc
```

- [ ] **Step 4: Verify GREEN and commit**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stock_history_route.py -q`

Expected: all route tests pass.

```bash
git add backend/app/main.py backend/tests/test_stock_history_route.py
git commit -m "fix: hide history provider failures"
```

### Task 2: Watchlist realtime polling and quote overlay

**Files:**
- Create: `frontend/src/hooks/useWatchlistRealtime.js`
- Modify: `frontend/src/hooks/useWatchlist.js`
- Create: `frontend/src/hooks/useWatchlistRealtime.test.js`
- Modify: `frontend/src/utils/equityDiscovery.js`
- Modify: `frontend/src/utils/equityDiscovery.test.js`

**Interfaces:**
- Consumes: saved `stocks`, `API_BASE_URL`, and `/api/stocks/realtime?symbol=<ticker>`.
- Produces: `useWatchlistRealtime({ user, stocks })` returning the saved rows with current quote fields overlaid, preserving input order.

- [ ] **Step 1: Write failing overlay and hook-contract tests**

```js
test("overlays watchlist quotes without changing saved order or score", () => {
  const result = applyRealtimeQuotes(WATCHLIST, [{ ticker: "002197", price: 6.9, chg: -10.04, provider: "tencent" }]);
  assert.deepEqual(result.map((stock) => stock.ticker), ["002197", "600519"]);
  assert.equal(result[0].price, 6.9);
  assert.equal(result[0].score, WATCHLIST[0].score);
});
```

```js
test("watchlist realtime hook polls eligible saved A-shares and aborts on cleanup", async () => {
  const source = await readFile(new URL("./useWatchlistRealtime.js", import.meta.url), "utf8");
  assert.match(source, /\/api\/stocks\/realtime/);
  assert.match(source, /15000/);
  assert.match(source, /AbortController/);
});
```

- [ ] **Step 2: Verify RED**

Run: `cd frontend && node --test src/utils/equityDiscovery.test.js src/hooks/useWatchlistRealtime.test.js`

Expected: FAIL because `applyRealtimeQuotes` and the polling hook do not exist.

- [ ] **Step 3: Implement a non-mutating multi-quote overlay**

```js
export function applyRealtimeQuotes(items, quotes) {
  const byTicker = new Map(quotes.filter((quote) => quote?.ticker).map((quote) => [quote.ticker, quote]));
  return items.map((stock) => {
    const quote = byTicker.get(stock.ticker);
    return quote ? { ...stock, ...quote, source: quote.source ?? stock.source } : stock;
  });
}
```

In `useWatchlistRealtime`, filter for `SSE`, `SZSE`, `BSE`, or `A-share` plus a six-digit ticker; fetch each quote with one cycle `AbortController`; retain the previous successful quote array after partial or complete failure; repeat after `15000` ms only while `user` exists.

- [ ] **Step 4: Merge realtime rows into the saved watchlist state**

```js
const liveWatchlistStocks = useWatchlistRealtime({ user: auth.user, stocks: watchlist.stocks });
const watchlistStocks = useMemo(() => stockQuery.trim()
  ? filterAndSortEquities(liveWatchlistStocks, { query: stockQuery, factors, sortKey, sectorLabels: t.sectors })
  : liveWatchlistStocks, [liveWatchlistStocks, stockQuery, factors, sortKey, t.sectors]);
```

Use `liveWatchlistStocks` when merging the detail universe as well, so selecting a saved stock shows the same current quote.

- [ ] **Step 5: Verify GREEN and commit**

Run: `cd frontend && node --test src/utils/equityDiscovery.test.js src/hooks/useWatchlistRealtime.test.js && npm test`

Expected: all frontend tests pass.

```bash
git add frontend/src/hooks/useWatchlistRealtime.js frontend/src/hooks/useWatchlistRealtime.test.js frontend/src/hooks/useWatchlist.js frontend/src/utils/equityDiscovery.js frontend/src/utils/equityDiscovery.test.js frontend/src/App.jsx
git commit -m "fix: refresh watchlist quotes in real time"
```

### Task 3: Safe localized history-chart unavailable state

**Files:**
- Modify: `frontend/src/hooks/useStockHistory.js`
- Modify: `frontend/src/components/HistoricalStockChart.jsx`
- Modify: `frontend/src/hooks/useStockHistory.test.js`

**Interfaces:**
- Consumes: backend error code `history_unavailable`.
- Produces: hook state `unavailable` and a component message that contains no server exception text.

- [ ] **Step 1: Write the failing source-contract test**

```js
assert.match(source, /history_unavailable/);
assert.match(source, /setState\("unavailable"\)/);
assert.doesNotMatch(component, /\{error\}/);
```

- [ ] **Step 2: Verify RED**

Run: `cd frontend && node --test src/hooks/useStockHistory.test.js`

Expected: FAIL because all non-OK responses currently become raw `error` text.

- [ ] **Step 3: Map stable error code to safe UI copy**

```js
if (body?.detail?.code === "history_unavailable") {
  setState("unavailable");
  return;
}
```

Render `历史数据源暂时不可用，请重试。` or `Historical data is temporarily unavailable. Please retry.` with the existing retry action. Retain `error` only for unexpected client failures.

- [ ] **Step 4: Verify GREEN, build, and commit**

Run: `cd frontend && node --test src/hooks/useStockHistory.test.js && npm test && npm run build`

Expected: all tests and the production build pass.

```bash
git add frontend/src/hooks/useStockHistory.js frontend/src/hooks/useStockHistory.test.js frontend/src/components/HistoricalStockChart.jsx
git commit -m "fix: show safe history source errors"
```

### Task 4: Final verification and deployment

- [ ] **Step 1: Run full suites**

Run: `cd backend && .venv/bin/python -m pytest -q && cd ../frontend && npm test && VITE_DEPLOY_BASE=/stock-macro/ VITE_API_BASE_URL=/stock-macro npm run build`

Expected: all backend tests, all frontend tests, and the production build pass.

- [ ] **Step 2: Local visual check**

Select a saved A-share and verify its list price updates after the next 15-second poll. Simulate a history `503` response and verify the chart shows only the localized unavailable state and retry action.

- [ ] **Step 3: Deploy and verify public endpoints**

Use the established release archive, server-side pytest, atomic symlink switch, and health checks. Then verify the public app returns 200 and a saved ticker’s `/api/stocks/realtime` response returns a current timestamp.
