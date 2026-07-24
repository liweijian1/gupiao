# A-share Historical Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated stock chart with A-share daily history that users can view as a close-price line, volume/amount bars, or candlesticks and adjust as qfq, none, or hfq.

**Architecture:** A dedicated backend history service wraps AkShare, validates daily OHLCV rows, and persists cache entries by ticker/range/adjustment. A single FastAPI endpoint exposes normalized bars. A focused frontend hook loads that endpoint; an isolated chart component renders the three modes from the same normalized data and owns only chart-local controls.

**Tech Stack:** FastAPI, pandas, AkShare, pytest, React 19, native SVG, Node test runner, Vite.

## Global Constraints

- Only six-digit A-share tickers are supported; SSE, SZSE, and BSE selections are eligible.
- Supported ranges are exactly `1M`, `3M`, `12M`, and `3Y`; supported adjustments are exactly `qfq`, `none`, and `hfq`.
- Never use `frontend/src/data/mockData.js` or synthetic series as a history fallback.
- Preserve the existing 1180px and 760px responsive breakpoints and dark cockpit visual system.
- The macro-comparison control and simulated macro overlay leave the price-chart toolbar; macro evidence remains in the bottom band.
- No live trading, orders, or execution paths are added.

---

## File Structure

- Create: `backend/app/market_data/stock_history.py` — validates requests, maps ranges to dates, loads/normalizes/cache daily OHLCV, and defines domain errors.
- Modify: `backend/app/main.py` — exposes the history endpoint and maps domain failures to stable HTTP responses.
- Create: `backend/tests/test_stock_history.py` — unit tests for range mapping, normalization, cache behavior, and provider failures.
- Create: `backend/tests/test_stock_history_route.py` — endpoint validation and response-shape tests using a stubbed service.
- Create: `frontend/src/hooks/useStockHistory.js` — abortable history request lifecycle keyed by stock/range/adjustment.
- Create: `frontend/src/utils/historicalChart.js` — pure view-model functions for line, bar, and candle SVG primitives.
- Create: `frontend/src/components/HistoricalStockChart.jsx` — chart controls, loading/unavailable states, and accessible SVG rendering.
- Modify: `frontend/src/components/StockDecisionWorkspace.jsx` — replace simulated `spark` rendering with `HistoricalStockChart`.
- Modify: `frontend/src/i18n/copy.js` — Chinese and English copy for chart modes, adjustments, metrics, source/warning, and unavailable/retry states.
- Modify: `frontend/src/styles.css` — compact chart controls, chart panels, tooltip/status, and responsive layout styles.
- Modify: `frontend/src/utils/decisionChart.test.js` — remove prototype-series assertions and protect against reintroducing synthetic series.
- Create: `frontend/src/utils/historicalChart.test.js` — pure geometry/view-model tests.
- Create: `frontend/src/hooks/useStockHistory.test.js` — source-level contract tests for request keys, cancellation, and failure state.
- Modify: `frontend/src/utils/decisionCockpitReference.test.js` — require the real-history component and removal of macro comparison UI.

### Task 1: Backend daily-history domain service

**Files:**
- Create: `backend/app/market_data/stock_history.py`
- Test: `backend/tests/test_stock_history.py`

**Interfaces:**
- Consumes: `app.akshare_client.load_akshare()` and `app.config.CACHE_DIR`.
- Produces: `StockHistoryUnavailable`, `StockHistoryUnsupportedMarket`, and `get_stock_history(symbol: str, range_key: str, adjust: str, *, today: date | None = None, load_akshare: Callable | None = None) -> dict[str, Any]`.

- [ ] **Step 1: Write failing domain tests**

```python
def test_get_stock_history_normalizes_ohlcv_and_sorts_rows(tmp_path):
    result = get_stock_history(
        "600519", "1M", "qfq", today=date(2026, 7, 24),
        load_akshare=lambda: FakeAkShare(), cache_dir=tmp_path,
    )
    assert result["bars"] == [
        {"date": "2026-07-22", "open": 1400.0, "high": 1420.0, "low": 1390.0,
         "close": 1415.0, "volume": 100.0, "amount": 141500.0},
    ]
    assert result["adjust"] == "qfq"

def test_get_stock_history_reuses_cache_when_provider_fails(tmp_path):
    first = get_stock_history("600519", "1M", "qfq", today=date(2026, 7, 24), load_akshare=lambda: FakeAkShare(), cache_dir=tmp_path)
    fallback = get_stock_history("600519", "1M", "qfq", today=date(2026, 7, 24), load_akshare=raising_loader, cache_dir=tmp_path)
    assert fallback["bars"] == first["bars"]
    assert "warning" in fallback
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stock_history.py -q`

Expected: FAIL because `app.market_data.stock_history` does not exist.

- [ ] **Step 3: Implement validation, provider normalization, and cache**

```python
RANGE_MONTHS = {"1M": 1, "3M": 3, "12M": 12, "3Y": 36}
ADJUSTMENTS = {"qfq", "none", "hfq"}

def get_stock_history(symbol, range_key="12M", adjust="qfq", *, today=None, load_akshare=load_akshare, cache_dir=CACHE_DIR):
    ticker = validate_a_share_ticker(symbol)
    start_date, end_date = date_range_for(range_key, today or date.today())
    cache = read_history_cache(cache_dir, ticker, range_key, adjust, end_date)
    try:
        frame = load_akshare().stock_zh_a_hist(
            symbol=ticker, period="daily", start_date=start_date.strftime("%Y%m%d"),
            end_date=end_date.strftime("%Y%m%d"), adjust="" if adjust == "none" else adjust,
        )
        payload = normalize_history_frame(ticker, frame, range_key, adjust, end_date)
        write_history_cache(cache_dir, payload)
        return payload
    except Exception as exc:
        if cache:
            return {**cache, "warning": f"历史行情刷新失败，已显示缓存数据：{exc}"}
        raise StockHistoryUnavailable(str(exc)) from exc
```

Implement `normalize_history_frame` with the same Chinese-column mapping and positive OHLC validation used by `backend/app/market_data/history.py`; sort and deduplicate by `date`, serialize numbers as floats, and reject an empty normalized frame.

- [ ] **Step 4: Run focused and full backend tests**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stock_history.py tests/test_history.py -q`

Expected: all selected tests pass.

- [ ] **Step 5: Commit the domain service**

```bash
git add backend/app/market_data/stock_history.py backend/tests/test_stock_history.py
git commit -m "feat: add cached A-share history service"
```

### Task 2: History API endpoint

**Files:**
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_stock_history_route.py`

**Interfaces:**
- Consumes: `get_stock_history`, `StockHistoryUnavailable`, and `StockHistoryUnsupportedMarket` from `app.market_data.stock_history`.
- Produces: `GET /api/stocks/history?symbol=600519&range=12M&adjust=qfq` with normalized history payload.

- [ ] **Step 1: Write failing route tests**

```python
def test_history_route_returns_normalized_payload(monkeypatch):
    monkeypatch.setattr(main, "get_stock_history", lambda **_: {"symbol": "600519", "bars": [{"date": "2026-07-23", "close": 1415.0}]})
    response = TestClient(main.app).get("/api/stocks/history?symbol=600519&range=12M&adjust=qfq")
    assert response.status_code == 200
    assert response.json()["symbol"] == "600519"

def test_history_route_rejects_bad_range_and_non_a_share():
    client = TestClient(main.app)
    assert client.get("/api/stocks/history?symbol=MSFT&range=12M&adjust=qfq").status_code == 422
    assert client.get("/api/stocks/history?symbol=600519&range=5Y&adjust=qfq").status_code == 422
```

- [ ] **Step 2: Run the route tests to verify they fail**

Run: `cd backend && .venv/bin/python -m pytest tests/test_stock_history_route.py -q`

Expected: FAIL with 404 because the endpoint is absent.

- [ ] **Step 3: Add typed query validation and error mapping**

```python
@app.get("/api/stocks/history")
def stocks_history(
    symbol: str = Query(..., pattern=r"^\d{6}$"),
    range: str = Query(default="12M", pattern=r"^(1M|3M|12M|3Y)$"),
    adjust: str = Query(default="qfq", pattern=r"^(qfq|none|hfq)$"),
) -> Dict[str, Any]:
    try:
        return get_stock_history(symbol=symbol, range_key=range, adjust=adjust)
    except StockHistoryUnsupportedMarket as exc:
        raise HTTPException(status_code=422, detail={"code": "history_unsupported_market", "message": str(exc)}) from exc
    except StockHistoryUnavailable as exc:
        raise HTTPException(status_code=503, detail={"code": "history_unavailable", "message": str(exc)}) from exc
```

- [ ] **Step 4: Run the endpoint and complete backend suite**

Run: `cd backend && .venv/bin/python -m pytest -q`

Expected: all backend tests pass.

- [ ] **Step 5: Commit the API endpoint**

```bash
git add backend/app/main.py backend/tests/test_stock_history_route.py
git commit -m "feat: expose A-share history endpoint"
```

### Task 3: Frontend history request and deterministic chart view models

**Files:**
- Create: `frontend/src/hooks/useStockHistory.js`
- Create: `frontend/src/utils/historicalChart.js`
- Create: `frontend/src/utils/historicalChart.test.js`
- Create: `frontend/src/hooks/useStockHistory.test.js`

**Interfaces:**
- Consumes: `API_BASE_URL`, selected `stock.exchange`, `stock.ticker`, range, and adjustment.
- Produces: `useStockHistory({ stock, range, adjust })` returning `{ state, payload, error, retry }`; `buildHistoricalChartModel({ bars, mode, metric, width, height })` returning only finite SVG-ready primitives.

- [ ] **Step 1: Write failing pure-function and hook-contract tests**

```js
test("builds candles from real OHLC fields and bars from the selected metric", () => {
  const model = buildHistoricalChartModel({ bars: BARS, mode: "candle", metric: "volume", width: 720, height: 280 });
  assert.equal(model.candles[0].open, 10);
  assert.equal(model.candles[0].high, 12);
  assert.equal(model.volumeBars.length, BARS.length);
});

test("history hook targets the deployed API without a duplicated api segment", async () => {
  const source = await readFile(new URL("./useStockHistory.js", import.meta.url), "utf8");
  assert.match(source, /\/api\/stocks\/history/);
  assert.match(source, /AbortController/);
  assert.match(source, /range=.*adjust=/);
});
```

- [ ] **Step 2: Run frontend tests to verify they fail**

Run: `cd frontend && node --test src/utils/historicalChart.test.js src/hooks/useStockHistory.test.js`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement request lifecycle and chart model**

```js
export function useStockHistory({ stock, range, adjust }) {
  const eligible = ["SSE", "SZSE", "BSE", "A-share"].includes(stock?.exchange) && /^\d{6}$/.test(stock?.ticker ?? "");
  // On every eligible key change: abort prior request, set loading, fetch
  // `${API_BASE_URL}/api/stocks/history?symbol=${ticker}&range=${range}&adjust=${adjust}`,
  // then expose success, unavailable, or error state without retaining old bars.
}

export function buildHistoricalChartModel({ bars, mode, metric, width, height }) {
  const validBars = bars.filter((bar) => [bar.open, bar.high, bar.low, bar.close, bar.volume, bar.amount].every(Number.isFinite));
  return mode === "candle" ? buildCandleModel(validBars, width, height) : mode === "bar" ? buildBarModel(validBars, metric, width, height) : buildLineModel(validBars, width, height);
}
```

Line mode uses close only. Bar mode selects only `volume` or `amount`. Candle mode includes body, wick, and a separate volume geometry list. Do not import `mockData.js` or `decisionChart.js`.

- [ ] **Step 4: Run focused frontend tests**

Run: `cd frontend && node --test src/utils/historicalChart.test.js src/hooks/useStockHistory.test.js`

Expected: all selected tests pass.

- [ ] **Step 5: Commit frontend data plumbing**

```bash
git add frontend/src/hooks/useStockHistory.js frontend/src/hooks/useStockHistory.test.js frontend/src/utils/historicalChart.js frontend/src/utils/historicalChart.test.js
git commit -m "feat: add A-share history chart data plumbing"
```

### Task 4: Real-history chart UI and cockpit integration

**Files:**
- Create: `frontend/src/components/HistoricalStockChart.jsx`
- Modify: `frontend/src/components/StockDecisionWorkspace.jsx`
- Modify: `frontend/src/i18n/copy.js`
- Modify: `frontend/src/styles.css`
- Modify: `frontend/src/utils/decisionChart.test.js`
- Modify: `frontend/src/utils/decisionCockpitReference.test.js`

**Interfaces:**
- Consumes: `useStockHistory` and `buildHistoricalChartModel` from Task 3.
- Produces: `HistoricalStockChart({ stock, t, lang })`, which renders all chart-specific controls and replaces the prior `price-chart` SVG in the workspace.

- [ ] **Step 1: Write failing integration/reference tests**

```js
test("stock workspace uses a real historical chart and not synthetic spark data", async () => {
  const workspace = await readFile(component("StockDecisionWorkspace.jsx"), "utf8");
  assert.match(workspace, /HistoricalStockChart/);
  assert.doesNotMatch(workspace, /from "\.\.\/data\/mockData\.js"/);
  assert.doesNotMatch(workspace, /indicator-control/);
});

test("historical chart exposes chart form, adjustment, and bar metric controls", async () => {
  const chart = await readFile(component("HistoricalStockChart.jsx"), "utf8");
  assert.match(chart, /chartMode/);
  assert.match(chart, /adjust/);
  assert.match(chart, /volume/);
  assert.match(chart, /amount/);
});
```

- [ ] **Step 2: Run the frontend reference tests to verify they fail**

Run: `cd frontend && node --test src/utils/decisionChart.test.js src/utils/decisionCockpitReference.test.js`

Expected: FAIL because the workspace still imports `mockData.js` and the new component is absent.

- [ ] **Step 3: Build the component and remove prototype chart code**

```jsx
<div className="historical-chart-toolbar">
  <TimeframeControl value={range} onChange={setRange} />
  <SegmentedControl value={chartMode} onChange={setChartMode} options={["line", "bar", "candle"]} />
  <select value={adjust} onChange={(event) => setAdjust(event.target.value)}>{adjustmentOptions}</select>
  {chartMode === "bar" && <SegmentedControl value={metric} onChange={setMetric} options={["volume", "amount"]} />}
</div>
```

Render loading, unsupported-market, unavailable, retry, warning, and ready states inside the chart surface. Render line, bar, and candle SVG branches from the shared model. In the candle branch, render a dedicated lower volume panel. Update both language dictionaries with concrete labels, including `折线`, `柱状`, `K线`, `前复权`, `不复权`, `后复权`, `成交量`, `成交额`, retry text, source text, and A-share-only text.

In `StockDecisionWorkspace.jsx`, delete `spark`, `selectDecisionChartSeries`, `buildChartPoints`, comparison polylines, the macro comparison select, and the prototype note; insert `<HistoricalStockChart stock={stock} t={t} lang={lang} />` in their place.

- [ ] **Step 4: Add compact cockpit styles and verify responsive behavior**

Add styles under a `.historical-stock-chart` namespace. Keep the desktop chart surface at the existing 285px minimum, stack the toolbar cleanly below 760px, maintain teal up / coral down candle colors, and use readable date/value status text. Do not alter the macro evidence band or right AI rail.

- [ ] **Step 5: Run all frontend tests and build**

Run: `cd frontend && npm test && npm run build`

Expected: all Node tests pass and Vite finishes successfully.

- [ ] **Step 6: Commit chart UI integration**

```bash
git add frontend/src/components/HistoricalStockChart.jsx frontend/src/components/StockDecisionWorkspace.jsx frontend/src/i18n/copy.js frontend/src/styles.css frontend/src/utils/decisionChart.test.js frontend/src/utils/decisionCockpitReference.test.js
git commit -m "feat: render real A-share historical charts"
```

### Task 5: End-to-end verification and deployment readiness

**Files:**
- No planned source changes. If a check fails, return to the task that owns the failing interface and repeat its test-first cycle before continuing.

**Interfaces:**
- Consumes: deployed API base `/stock-macro/api`, endpoint contract from Task 2, and chart component from Task 4.
- Produces: reproducible evidence that the real-history chart works without synthetic data.

- [ ] **Step 1: Verify a local endpoint with a known A-share**

Run: `curl -fsS 'http://127.0.0.1:8000/api/stocks/history?symbol=600519&range=1M&adjust=qfq'`

Expected: JSON with non-empty ascending `bars`; every bar has `date`, `open`, `high`, `low`, `close`, `volume`, and `amount`.

- [ ] **Step 2: Verify error semantics**

Run: `curl -sS -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:8000/api/stocks/history?symbol=MSFT&range=1M&adjust=qfq'`

Expected: `422`, never a mock-series response.

- [ ] **Step 3: Run complete regression suites and production build**

Run: `cd backend && .venv/bin/python -m pytest -q && cd ../frontend && npm test && VITE_DEPLOY_BASE=/stock-macro/ VITE_API_BASE_URL=/stock-macro npm run build`

Expected: backend tests, frontend tests, and production build all pass.

- [ ] **Step 4: Inspect local browser behavior**

Open the local app, select an A-share, and exercise each range, each adjustment, line mode, both bar metrics, and K-line mode. Then select a non-A-share and verify the A-share-only state appears with no fake chart.

