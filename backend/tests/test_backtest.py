from datetime import date, timedelta

from app.research.backtest import run_backtest
from app.research.models import BacktestRequest, DailyBar, DatasetManifest, FactorWeights


def make_bars():
    start = date(2026, 1, 1)
    bars = []
    for index in range(32):
        current = start + timedelta(days=index)
        for symbol, close in (("600519", 100 + index * 2), ("000001", 100 - index * 0.5)):
            bars.append(
                DailyBar(
                    symbol=symbol,
                    date=current,
                    open=close,
                    high=close + 1,
                    low=close - 1,
                    close=close,
                    volume=100,
                    amount=1000,
                )
            )
    return bars


def test_backtest_trades_the_next_day_and_keeps_reproducible_metadata():
    manifest = DatasetManifest(
        dataset_id="dataset-a",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1),
        symbols=["000001", "600519"],
        row_count=64,
        created_at="2026-02-01T00:00:00Z",
        fingerprint="b" * 64,
    )
    request = BacktestRequest(
        symbols=["600519", "000001"],
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1),
        top_n=1,
        rebalance_frequency="weekly",
        transaction_cost_bps=0,
        weights=FactorWeights(momentum=100),
    )

    result = run_backtest(make_bars(), manifest, request)

    assert result.dataset_fingerprint == manifest.fingerprint
    assert result.holdings
    assert result.holdings[0].symbols == ["600519"]
    assert result.points[-1].portfolio_value > 1
    first_effective_index = next(index for index, point in enumerate(result.points) if point.date == result.holdings[0].effective_date)
    assert result.points[first_effective_index - 1].portfolio_value == 1
    assert result.points[first_effective_index].portfolio_value > 1
    assert len(result.request_fingerprint) == 64


def test_backtest_accepts_a_one_shot_daily_bar_iterable():
    manifest = DatasetManifest(
        dataset_id="dataset-a",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1),
        symbols=["000001", "600519"],
        row_count=64,
        created_at="2026-02-01T00:00:00Z",
        fingerprint="e" * 64,
    )
    request = BacktestRequest(
        symbols=["600519", "000001"],
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1),
        top_n=1,
        weights=FactorWeights(momentum=100),
    )

    assert run_backtest((bar for bar in make_bars()), manifest, request).holdings
