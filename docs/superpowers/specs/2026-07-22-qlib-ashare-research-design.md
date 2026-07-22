# Qlib A-Share Research Layer Design

## Goal

Add a read-only Qlib research layer to QuantDesk. It converts cached A-share daily data into a versioned Qlib dataset, evaluates a fixed cross-sectional multi-factor strategy, and exposes reproducible rankings and backtests to the existing cockpit. No part of this phase connects to brokers, creates orders, or performs paper/live execution.

## Scope

The first release supports mainland A shares on daily bars only. Its strategy is an equal-weight top-N ranking selected from a fixed five-factor score: momentum, quality, valuation, liquidity, and volatility. The user may set the five factor weights, rebalance frequency, backtest date range, and top-N count. The default remains the existing factor values, monthly rebalancing, and top 30 positions.

Excluded from this release: model training, Qlib RL workflows, intraday data, derivatives, portfolio optimization beyond equal weighting, vn.py gateways, broker credentials, order management, and all real or simulated order submission.

## Architecture

`backend/app/research/` is a self-contained application boundary. It has four responsibilities:

1. `dataset.py` obtains A-share daily OHLCV history through the existing market-data provider boundary, validates it, and writes a Qlib-compatible local dataset under `RESEARCH_DATA_DIR`. Each successful refresh produces an immutable `dataset_version` with source, date coverage, instrument count, and generated timestamp.
2. `factors.py` converts Qlib features into the five normalized cross-sectional factor values and returns deterministic rankings for one as-of date. Missing values exclude only that instrument for that date; no value is fabricated.
3. `backtest.py` runs a daily-bar, long-only, equal-weight top-N simulation from an explicit configuration. It deducts a configurable one-way transaction cost at rebalance, returns portfolio NAV, benchmark NAV, turnover, annualized return, maximum drawdown, Sharpe ratio, and constituent history.
4. `routes.py` validates API input, exposes dataset metadata, rankings, and backtest jobs/results, and returns structured errors. Long backtests run in a single in-process job registry initially; completed results are persisted by a fingerprint that includes the dataset version and configuration.

The existing `market_data` package remains the only source adapter. The research layer never calls AkShare directly: it consumes a narrow daily-history interface supplied by `market_data`. This keeps source fallback, caching, and later provider replacement isolated from Qlib and strategy code.

## Data Contract

The normalised daily input record is:

```json
{
  "ticker": "600519",
  "date": "2026-07-21",
  "open": 1250.0,
  "high": 1268.0,
  "low": 1242.0,
  "close": 1260.93,
  "volume": 12450000,
  "amount": 1563700000,
  "source": "akshare"
}
```

`dataset_version` is a SHA-256 digest of the canonical metadata and normalized daily files. The API always includes it, so an AI report or a later user run can identify the precise data revision used. Raw source files, normalized Qlib files, and result files live outside Git and are included in the service writable path.

## APIs

All endpoints are read-only except refresh and job creation. They are under `/api/research`.

- `GET /dataset`: latest dataset metadata, coverage, freshness, and warning.
- `POST /dataset/refresh`: request a dataset refresh; returns the resulting metadata or a structured source failure. It does not erase the last valid dataset on failure.
- `GET /ranking?as_of=YYYY-MM-DD&top_n=30&weights=...`: returns the ranked universe and five factor values for the selected date.
- `POST /backtests`: accepts `{start_date, end_date, rebalance, top_n, weights, transaction_cost_bps}` and returns `{job_id, status: "queued"}`.
- `GET /backtests/{job_id}`: returns `queued`, `running`, `failed`, or a complete immutable result. A completed result includes `dataset_version`, normalized configuration, metrics, dated NAV points, and holdings by rebalance date.

Backtest configuration is constrained to daily data: `rebalance` is `weekly` or `monthly`, `top_n` is 5–100, each factor weight is 0–100, at least one weight is positive, and `transaction_cost_bps` is 0–100. Dates must be inside dataset coverage and the range must contain at least two rebalance observations.

## User Experience

The existing factor builder gains an explicit “运行研究” action. Editing controls remains local until this action is used. Running research displays the selected as-of date, dataset version, factor ranking, and a dedicated backtest result view with NAV versus A-share benchmark, annualized return, maximum drawdown, Sharpe ratio, turnover, and rebalance holdings.

The AI panel may cite a completed research result only when its `ticker`, `as_of` date, and `dataset_version` match the current displayed research context. Otherwise it describes only the existing market and macro evidence. The permanent “仅供研究参考，不构成投资建议” disclaimer remains visible; no buy/sell action or execution control is added.

## Failure Handling

If no valid dataset exists, ranking and backtest endpoints return `409 dataset_unavailable`. If a refresh fails after a valid dataset exists, it preserves that dataset and returns the source warning. Invalid configuration returns `422` with field-level codes. A failed background job records a sanitized error code and keeps any previous completed result intact. The frontend shows the data version and failure state, never synthetic factor, return, or benchmark values.

## Testing and Acceptance

- Unit tests use a fixed two-stock, multi-date daily fixture to verify normalization, factor ranking order, missing-data exclusion, equal-weight returns, turnover, transaction costs, and drawdown.
- Route tests verify validation, persisted result reuse for the same configuration and dataset version, unavailable dataset behavior, and that a refresh failure preserves prior metadata.
- Frontend tests verify that controls call research APIs only after the explicit action and render all returned metrics without inventing values.
- Browser acceptance uses a fixed local fixture: refresh/load a dataset, run a monthly top-30 backtest, inspect the result, and confirm no route or control submits an order.

## Deployment

Qlib and its supported numerical dependencies are added to the backend environment only after a reproducible install check on the production host. The systemd service receives a writable `RESEARCH_DATA_DIR` below `/var/lib/stock-macro-terminal/research`; it must not write result data into release directories. The existing `/stock-macro/` Nginx prefix and unrelated `/api/` backend remain unchanged.

## Deferred Execution Phase

After this phase proves research quality and users approve execution separately, vn.py may be introduced as an independent service boundary for event routing, gateways, risk limits, and order lifecycle. That future phase must use separate credentials, explicit account selection, paper-trading validation, audit events, and an approval gate before any live order capability.
