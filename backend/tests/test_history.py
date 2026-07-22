from datetime import date

import pandas as pd
import pytest

from app.market_data.history import HistoricalDataUnavailable, get_ashare_daily_history


class FakeAkShare:
    def stock_zh_a_hist(self, *, symbol, period, start_date, end_date, adjust):
        assert period == "daily"
        assert adjust == "qfq"
        if symbol == "000001":
            raise RuntimeError("upstream unavailable")
        return pd.DataFrame(
            [
                {"日期": "2026-01-03", "开盘": 11, "最高": 12, "最低": 10, "收盘": 11.5, "成交量": 200, "成交额": 2300},
                {"日期": "2026-01-02", "开盘": 10, "最高": 12, "最低": 9, "收盘": 11, "成交量": 100, "成交额": 1100},
                {"日期": "2026-01-02", "开盘": 10, "最高": 12, "最低": 9, "收盘": 11, "成交量": 100, "成交额": 1100},
                {"日期": "2025-12-31", "开盘": 9, "最高": 10, "最低": 8, "收盘": 9, "成交量": 50, "成交额": 450},
            ]
        )


def test_history_normalizes_filters_sorts_and_keeps_other_symbols_after_failure():
    result = get_ashare_daily_history(
        ["600519", "000001"],
        date(2026, 1, 1),
        date(2026, 1, 3),
        load_akshare=lambda: FakeAkShare(),
    )

    assert [(bar.symbol, bar.date, bar.close, bar.amount) for bar in result.bars] == [
        ("600519", date(2026, 1, 2), 11.0, 1100.0),
        ("600519", date(2026, 1, 3), 11.5, 2300.0),
    ]
    assert result.failures == {"000001": "upstream unavailable"}


def test_history_raises_a_domain_error_when_every_symbol_fails():
    with pytest.raises(HistoricalDataUnavailable, match="No A-share daily history"):
        get_ashare_daily_history(
            ["000001"],
            date(2026, 1, 1),
            date(2026, 1, 3),
            load_akshare=lambda: FakeAkShare(),
        )
