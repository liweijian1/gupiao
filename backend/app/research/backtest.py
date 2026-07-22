from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable

import numpy as np
import pandas as pd

from .models import (
    BacktestMetrics,
    BacktestPoint,
    BacktestRequest,
    BacktestResult,
    DailyBar,
    DatasetManifest,
    HoldingsSnapshot,
)
from .ranking import rank_bars


def _rebalance_dates(dates: list[pd.Timestamp], frequency: str) -> list[pd.Timestamp]:
    index = pd.DatetimeIndex(dates)
    periods = index.to_period("W-FRI" if frequency == "weekly" else "M")
    return [
        group.max()
        for _, group in pd.Series(index, index=index).groupby(periods)
    ]


def _fingerprint(manifest: DatasetManifest, request: BacktestRequest) -> str:
    payload = json.dumps(
        {
            "dataset": manifest.fingerprint,
            "request": request.model_dump(mode="json"),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _max_drawdown(values: list[float]) -> float:
    peak = values[0]
    worst = 0.0
    for value in values:
        peak = max(peak, value)
        worst = min(worst, value / peak - 1)
    return worst


def run_backtest(
    bars: Iterable[DailyBar],
    manifest: DatasetManifest,
    request: BacktestRequest,
) -> BacktestResult:
    all_bars = list(bars)
    selected_bars = [
        bar for bar in all_bars
        if bar.symbol in request.symbols and request.start_date <= bar.date <= request.end_date
    ]
    if not selected_bars:
        raise ValueError("No bars match the requested backtest universe and date range")
    prices = pd.DataFrame(
        [{"date": bar.date, "symbol": bar.symbol, "close": bar.close} for bar in selected_bars]
    ).pivot(index="date", columns="symbol", values="close").sort_index()
    dates = [pd.Timestamp(value) for value in prices.index]
    targets: dict[int, tuple[dict[str, float], pd.Timestamp]] = {}
    holdings: list[HoldingsSnapshot] = []
    for rebalance_date in _rebalance_dates(dates, request.rebalance_frequency):
        position = dates.index(rebalance_date)
        if position + 1 >= len(dates):
            continue
        try:
            ranking = rank_bars(
                (bar for bar in all_bars if bar.date <= rebalance_date.date()),
                manifest,
                as_of=rebalance_date.date(),
                weights=request.weights,
            )
        except ValueError:
            continue
        symbols = [row.symbol for row in ranking.rows if row.symbol in request.symbols][:request.top_n]
        if not symbols:
            continue
        targets[position + 1] = ({symbol: 1 / len(symbols) for symbol in symbols}, rebalance_date)
    if not targets:
        raise ValueError("No rebalance date has enough history for the selected factor model")

    portfolio_value = 1.0
    benchmark_value = 1.0
    weights: dict[str, float] = {}
    points: list[BacktestPoint] = [
        BacktestPoint(
            date=dates[0].date(),
            portfolio_value=portfolio_value,
            benchmark_value=benchmark_value,
        )
    ]
    turnovers: list[float] = []
    for index in range(1, len(dates)):
        current_date = dates[index]
        if index in targets:
            target, rebalance_date = targets[index]
            turnover = 0.5 * sum(abs(target.get(symbol, 0) - weights.get(symbol, 0)) for symbol in set(target) | set(weights))
            portfolio_value *= 1 - turnover * request.transaction_cost_bps / 10000
            weights = target
            turnovers.append(turnover)
            holdings.append(
                HoldingsSnapshot(
                    rebalance_date=rebalance_date.date(),
                    effective_date=current_date.date(),
                    symbols=sorted(target),
                    turnover=turnover,
                )
            )
        daily_returns = prices.iloc[index] / prices.iloc[index - 1] - 1
        portfolio_return = sum(weights.get(symbol, 0) * float(daily_returns.get(symbol, 0) or 0) for symbol in weights)
        benchmark_return = float(daily_returns.dropna().mean()) if daily_returns.notna().any() else 0.0
        portfolio_value *= 1 + portfolio_return
        benchmark_value *= 1 + benchmark_return
        points.append(
            BacktestPoint(
                date=current_date.date(),
                portfolio_value=portfolio_value,
                benchmark_value=benchmark_value,
            )
        )

    values = [point.portfolio_value for point in points]
    daily_returns = pd.Series(values).pct_change().dropna()
    periods = max(len(daily_returns), 1)
    annualized_return = values[-1] ** (252 / periods) - 1
    annualized_volatility = float(daily_returns.std(ddof=0) * np.sqrt(252)) if len(daily_returns) else 0.0
    sharpe = annualized_return / annualized_volatility if annualized_volatility else 0.0
    metrics = BacktestMetrics(
        cumulative_return=values[-1] - 1,
        benchmark_cumulative_return=points[-1].benchmark_value - 1,
        annualized_return=annualized_return,
        annualized_volatility=annualized_volatility,
        sharpe=sharpe,
        max_drawdown=_max_drawdown(values),
        average_turnover=float(np.mean(turnovers)) if turnovers else 0.0,
    )
    return BacktestResult(
        dataset_id=manifest.dataset_id,
        dataset_fingerprint=manifest.fingerprint,
        request=request,
        points=points,
        holdings=holdings,
        metrics=metrics,
        request_fingerprint=_fingerprint(manifest, request),
    )
