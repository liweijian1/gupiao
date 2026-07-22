from datetime import date

from app.research.dataset import (
    activate_dataset,
    build_dataset,
    load_current_bars,
    load_current_manifest,
)
from app.research.models import DailyBar


def sample_bars():
    return [
        DailyBar(symbol="600519", date=date(2026, 1, 2), open=10, high=11, low=9, close=10.5, volume=100, amount=1050),
        DailyBar(symbol="600519", date=date(2026, 1, 5), open=10.5, high=12, low=10, close=11.5, volume=200, amount=2300),
        DailyBar(symbol="000001", date=date(2026, 1, 2), open=8, high=9, low=7, close=8.5, volume=300, amount=2550),
    ]


def test_build_dataset_versions_bars_and_switches_current_pointer(tmp_path):
    manifest = build_dataset(sample_bars(), tmp_path)

    assert manifest.symbols == ["000001", "600519"]
    assert manifest.row_count == 3
    assert (tmp_path / "datasets" / manifest.dataset_id / "manifest.json").exists()
    assert (tmp_path / "datasets" / manifest.dataset_id / "qlib" / "calendars" / "day.txt").exists()
    assert load_current_manifest(tmp_path).fingerprint == manifest.fingerprint
    assert [(bar.symbol, bar.date) for bar in load_current_bars(tmp_path)] == [
        ("000001", date(2026, 1, 2)),
        ("600519", date(2026, 1, 2)),
        ("600519", date(2026, 1, 5)),
    ]


def test_failed_build_keeps_previous_current_dataset(tmp_path):
    first = build_dataset(sample_bars(), tmp_path)

    try:
        build_dataset([], tmp_path)
    except ValueError as exc:
        assert "at least one" in str(exc)

    assert load_current_manifest(tmp_path).dataset_id == first.dataset_id


def test_inactive_dataset_does_not_replace_current_until_qlib_validation_succeeds(tmp_path):
    first = build_dataset(sample_bars(), tmp_path)
    altered = sample_bars()
    altered[0] = altered[0].model_copy(update={"close": 12})

    pending = build_dataset(altered, tmp_path, activate=False)
    assert load_current_manifest(tmp_path).dataset_id == first.dataset_id

    activate_dataset(tmp_path, pending.dataset_id)
    assert load_current_manifest(tmp_path).dataset_id == pending.dataset_id
