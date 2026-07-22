from datetime import date

import pytest
from pydantic import ValidationError

from app.research.models import BacktestRequest, FactorWeights


def test_factor_weights_normalize_positive_values_without_mutating_input():
    weights = FactorWeights(momentum=80, quality=20, valuation=0, liquidity=0, volatility=0)

    assert weights.normalized() == {
        "momentum": 0.8,
        "quality": 0.2,
        "valuation": 0.0,
        "liquidity": 0.0,
        "volatility": 0.0,
    }


def test_factor_weights_reject_all_zero_values():
    with pytest.raises(ValidationError, match="at least one"):
        FactorWeights()


def test_backtest_request_rejects_invalid_date_order_and_frequency():
    with pytest.raises(ValidationError, match="end_date"):
        BacktestRequest(
            symbols=["600519"],
            start_date=date(2026, 2, 1),
            end_date=date(2026, 1, 1),
        )

    with pytest.raises(ValidationError, match="weekly' or 'monthly"):
        BacktestRequest(
            symbols=["600519"],
            start_date=date(2026, 1, 1),
            end_date=date(2026, 2, 1),
            rebalance_frequency="daily",
        )


def test_backtest_request_normalizes_symbols_and_validates_cost_bounds():
    request = BacktestRequest(
        symbols=[" 600519 ", "000001", "600519"],
        start_date=date(2026, 1, 1),
        end_date=date(2026, 2, 1),
        top_n=2,
        transaction_cost_bps=12.5,
    )

    assert request.symbols == ["600519", "000001"]
    assert request.transaction_cost_bps == 12.5

    with pytest.raises(ValidationError, match="transaction_cost_bps"):
        BacktestRequest(
            symbols=["600519"],
            start_date=date(2026, 1, 1),
            end_date=date(2026, 2, 1),
            transaction_cost_bps=-1,
        )
