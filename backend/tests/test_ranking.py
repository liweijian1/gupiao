from datetime import date, timedelta

from app.research.models import DailyBar, DatasetManifest, FactorWeights
from app.research.ranking import rank_bars


def make_bars():
    bars = []
    start = date(2026, 1, 1)
    for index in range(22):
        current = start + timedelta(days=index)
        for symbol, close, amount in (
            ("600519", 100 + index * 2, 1000 + index * 10),
            ("000001", 100 - index, 2000 - index * 10),
        ):
            bars.append(
                DailyBar(
                    symbol=symbol,
                    date=current,
                    open=close,
                    high=close + 1,
                    low=close - 1,
                    close=close,
                    volume=100,
                    amount=amount,
                )
            )
    return bars


def test_ranking_uses_factor_weights_and_returns_dataset_fingerprint():
    manifest = DatasetManifest(
        dataset_id="dataset-a",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 1, 22),
        symbols=["000001", "600519"],
        row_count=44,
        created_at="2026-01-22T00:00:00Z",
        fingerprint="a" * 64,
    )
    result = rank_bars(
        make_bars(),
        manifest,
        as_of=date(2026, 1, 22),
        weights=FactorWeights(momentum=100),
    )

    assert [row.symbol for row in result.rows] == ["600519", "000001"]
    assert result.rows[0].rank == 1
    assert result.rows[0].score > result.rows[1].score
    assert result.dataset_fingerprint == manifest.fingerprint
    assert len(result.request_fingerprint) == 64
