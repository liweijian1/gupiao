from datetime import date

import pytest

pytest.importorskip("qlib")

from app.research.dataset import build_dataset, get_qlib_provider_uri
from app.research.models import DailyBar
from app.research.qlib_runtime import initialize_qlib


@pytest.mark.qlib
def test_generated_dataset_is_readable_by_qlib_provider(tmp_path):
    build_dataset(
        [
            DailyBar(symbol="600519", date=date(2026, 1, 2), open=10, high=11, low=9, close=10.5, volume=100, amount=1050),
            DailyBar(symbol="600519", date=date(2026, 1, 5), open=10.5, high=12, low=10, close=11.5, volume=200, amount=2300),
        ],
        tmp_path,
    )
    initialize_qlib(get_qlib_provider_uri(tmp_path))

    from qlib.data import D

    frame = D.features(["600519"], ["$close"], start_time="2026-01-02", end_time="2026-01-05", freq="day")
    assert list(frame["$close"].dropna()) == [10.5, 11.5]
