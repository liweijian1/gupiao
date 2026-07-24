# A-share Historical Charts Design

## Goal

Replace the Decision Cockpit's simulated chart with verified A-share daily history. Users can select a time range, chart form, adjustment method, and bar metric without affecting realtime quotes, AI analysis, or the macro-validation evidence band.

## Scope

- Supported market: A shares only.
- Frequency: daily bars.
- Time ranges: 1M, 3M, 12M, and 3Y.
- Adjustment: qfq (forward-adjusted), none (unadjusted), and hfq (backward-adjusted).
- Chart forms: close-price line, volume/amount bars, and OHLC candlesticks with a volume sub-panel.
- Non-A-share selections receive an explicit unavailable state. They never receive synthetic bars.

## Data and API

Add `GET /api/stocks/history` with these query parameters:

- `symbol`: required six-digit A-share ticker.
- `range`: one of `1M`, `3M`, `12M`, or `3Y`; defaults to `12M`.
- `adjust`: one of `qfq`, `none`, or `hfq`; defaults to `qfq`.

The route delegates to a dedicated history service that calls AkShare's A-share daily-history API. The service validates and sorts the returned rows, then returns a stable payload:

```json
{
  "symbol": "600519",
  "range": "12M",
  "adjust": "qfq",
  "source": "akshare",
  "updated_at": "2026-07-24T00:00:00+00:00",
  "bars": [
    {"date": "2026-07-23", "open": 1400.0, "high": 1420.0, "low": 1395.0, "close": 1415.0, "volume": 123456, "amount": 123456789.0}
  ]
}
```

History cache keys include the symbol, range, and adjustment method. Cached daily series remain valid until the next China trading day; an upstream failure may return a previously cached series with a warning, but must never return mock values. No-cache failures return a structured unavailable error.

## User Experience

The stock workspace replaces the existing simulated SVG sequence and its "prototype preview" note.

The toolbar contains, in this order:

1. Existing time-range buttons.
2. Chart-form segmented control: `折线`, `柱状`, `K线`.
3. Adjustment select: `前复权`, `不复权`, `后复权`.
4. When `柱状` is active, metric control: `成交量` or `成交额`.

Line charts use each bar's close. Bar charts use the selected volume or amount field. K-line charts show each bar's open, high, low, and close, and always include a lower volume panel. Hover/focus reveals the bar date and values in an accessible tooltip/status area.

The existing macro-comparison selector and its synthetic comparison line are removed from the price-chart toolbar. The app does not yet have time-aligned macro history, so retaining it would imply a false relationship. Macro evidence remains available in the lower macro-validation band.

While a request is running, the chart surface shows a loading state. When a selected stock is not an A share, data is unavailable, or the provider fails without cache, the chart surface explains the condition and offers retry; it never displays placeholder price bars.

## Component Boundaries

- Backend history module: provider calls, date-range mapping, normalization, and cache read/write.
- Backend route: request validation and HTTP error mapping.
- Frontend history hook: cancellation-safe loading keyed by selected stock, range, and adjustment.
- Chart data adapter: scale calculation and conversion of normalized bars into line, bar, or candle primitives.
- Historical chart component: rendering and chart-local controls; it consumes normalized bars and contains no provider logic.
- Stock decision workspace: owns the selected chart settings and passes them to the hook/component.

## Failure Handling

- Invalid ticker, range, or adjustment returns a client error.
- A non-A-share ticker gets a deliberate unsupported-market response.
- Provider failures preserve usable cached data and state the source warning.
- An empty result is unavailable, not a zero-valued chart.
- Changing a setting aborts stale requests so an older response cannot overwrite the active chart.

## Verification

- Backend tests cover parameter validation, A-share normalization, range mapping, cache-hit behavior, stale-cache fallback, and no-data/provider failures.
- Frontend tests cover the history-request key, all three chart modes, both bar metrics, all adjustment choices, unavailable states, and removal of mock-series use.
- Production build must pass, and a local A-share request must return date-sorted OHLCV data before deployment.

