from datetime import date

import pandas as pd
import pytest

from app.market_data.stock_history import (
    StockHistoryUnavailable,
    date_range_for,
    get_stock_history,
)


class FakeAkShare:
    def stock_zh_a_hist(self, *, symbol, period, start_date, end_date, adjust):
        assert symbol == "600519"
        assert period == "daily"
        assert start_date == "20260624"
        assert end_date == "20260724"
        assert adjust == "qfq"
        return pd.DataFrame(
            [
                {"日期": "2026-07-22", "开盘": 1400, "最高": 1420, "最低": 1390, "收盘": 1415, "成交量": 100, "成交额": 141500},
                {"日期": "2026-07-21", "开盘": 1390, "最高": 1410, "最低": 1380, "收盘": 1400, "成交量": 80, "成交额": 112000},
                {"日期": "2026-07-22", "开盘": 1400, "最高": 1420, "最低": 1390, "收盘": 1415, "成交量": 100, "成交额": 141500},
                {"日期": "2026-06-20", "开盘": 1300, "最高": 1320, "最低": 1290, "收盘": 1310, "成交量": 10, "成交额": 13100},
            ]
        )


class EmptyAkShare:
    def stock_zh_a_hist(self, **_kwargs):
        return pd.DataFrame()


def failing_loader():
    raise RuntimeError("upstream unavailable")


def test_date_range_for_maps_supported_periods_from_requested_day():
    assert date_range_for("1M", date(2026, 7, 24)) == (date(2026, 6, 24), date(2026, 7, 24))
    assert date_range_for("3Y", date(2026, 7, 24)) == (date(2023, 7, 24), date(2026, 7, 24))


def test_get_stock_history_normalizes_filters_sorts_and_caches_ohlcv(tmp_path):
    result = get_stock_history(
        "600519",
        "1M",
        "qfq",
        today=date(2026, 7, 24),
        load_akshare=lambda: FakeAkShare(),
        cache_dir=tmp_path,
    )

    assert result["symbol"] == "600519"
    assert result["range"] == "1M"
    assert result["adjust"] == "qfq"
    assert result["source"] == "akshare"
    assert result["warning"] is None
    assert result["bars"] == [
        {"date": "2026-07-21", "open": 1390.0, "high": 1410.0, "low": 1380.0, "close": 1400.0, "volume": 80.0, "amount": 112000.0},
        {"date": "2026-07-22", "open": 1400.0, "high": 1420.0, "low": 1390.0, "close": 1415.0, "volume": 100.0, "amount": 141500.0},
    ]
    assert list(tmp_path.glob("stock_history_600519_1M_qfq_*.json"))


def test_get_stock_history_uses_same_day_cache_when_provider_fails(tmp_path):
    first = get_stock_history(
        "600519",
        "1M",
        "qfq",
        today=date(2026, 7, 24),
        load_akshare=lambda: FakeAkShare(),
        cache_dir=tmp_path,
    )

    fallback = get_stock_history(
        "600519",
        "1M",
        "qfq",
        today=date(2026, 7, 24),
        load_akshare=failing_loader,
        cache_dir=tmp_path,
    )

    assert fallback["bars"] == first["bars"]
    assert "缓存数据" in fallback["warning"]


def test_get_stock_history_uses_same_day_cache_when_provider_returns_no_bars(tmp_path):
    first = get_stock_history(
        "600519",
        "1M",
        "qfq",
        today=date(2026, 7, 24),
        load_akshare=lambda: FakeAkShare(),
        cache_dir=tmp_path,
    )

    fallback = get_stock_history(
        "600519",
        "1M",
        "qfq",
        today=date(2026, 7, 24),
        load_akshare=lambda: EmptyAkShare(),
        cache_dir=tmp_path,
    )

    assert fallback["bars"] == first["bars"]
    assert "缓存数据" in fallback["warning"]


@pytest.mark.parametrize(
    ("symbol", "range_key", "adjust"),
    [("MSFT", "1M", "qfq"), ("600519", "5Y", "qfq"), ("600519", "1M", "invalid")],
)
def test_get_stock_history_rejects_invalid_request_values(tmp_path, symbol, range_key, adjust):
    with pytest.raises(ValueError):
        get_stock_history(symbol, range_key, adjust, today=date(2026, 7, 24), cache_dir=tmp_path)


def test_get_stock_history_raises_when_provider_fails_without_cache(tmp_path):
    with pytest.raises(StockHistoryUnavailable, match="upstream unavailable"):
        get_stock_history(
            "600519",
            "1M",
            "qfq",
            today=date(2026, 7, 24),
            load_akshare=failing_loader,
            cache_dir=tmp_path,
        )
