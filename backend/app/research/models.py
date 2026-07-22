from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class DailyBar(BaseModel):
    model_config = ConfigDict(frozen=True)

    symbol: str = Field(min_length=1)
    date: date
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    volume: float = Field(ge=0)
    amount: float = Field(ge=0)


class DatasetManifest(BaseModel):
    model_config = ConfigDict(frozen=True)

    dataset_id: str
    universe: str = "ashare_daily"
    start_date: date
    end_date: date
    symbols: list[str]
    row_count: int = Field(ge=1)
    source: str = "akshare"
    created_at: datetime
    fingerprint: str = Field(min_length=12)


class RankingRow(BaseModel):
    model_config = ConfigDict(frozen=True)

    symbol: str
    rank: int = Field(ge=1)
    score: float = Field(ge=0, le=100)
    close: float = Field(gt=0)
    factor_scores: dict[str, float]


class RankingResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    as_of: date
    dataset_id: str
    dataset_fingerprint: str
    weights: FactorWeights
    rows: list[RankingRow]
    request_fingerprint: str


class FactorWeights(BaseModel):
    model_config = ConfigDict(frozen=True)

    momentum: float = Field(default=0, ge=0, le=100)
    quality: float = Field(default=0, ge=0, le=100)
    valuation: float = Field(default=0, ge=0, le=100)
    liquidity: float = Field(default=0, ge=0, le=100)
    volatility: float = Field(default=0, ge=0, le=100)

    @model_validator(mode="after")
    def require_positive_total(self) -> "FactorWeights":
        if sum(self.model_dump().values()) <= 0:
            raise ValueError("at least one factor weight must be positive")
        return self

    def normalized(self) -> dict[str, float]:
        values = self.model_dump()
        total = sum(values.values())
        return {key: value / total for key, value in values.items()}


class BacktestRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    symbols: list[str] = Field(min_length=1, max_length=500)
    start_date: date
    end_date: date
    top_n: int = Field(default=20, ge=1, le=100)
    rebalance_frequency: Literal["weekly", "monthly"] = "monthly"
    transaction_cost_bps: float = Field(default=10, ge=0, le=500)
    weights: FactorWeights = Field(
        default_factory=lambda: FactorWeights(
            momentum=68,
            quality=52,
            valuation=42,
            liquidity=70,
            volatility=39,
        )
    )

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, values: list[str]) -> list[str]:
        normalized = list(dict.fromkeys(symbol.strip().upper() for symbol in values if symbol.strip()))
        if not normalized:
            raise ValueError("symbols must contain at least one ticker")
        return normalized

    @model_validator(mode="after")
    def validate_date_range(self) -> "BacktestRequest":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class BacktestPoint(BaseModel):
    model_config = ConfigDict(frozen=True)

    date: date
    portfolio_value: float = Field(gt=0)
    benchmark_value: float = Field(gt=0)


class HoldingsSnapshot(BaseModel):
    model_config = ConfigDict(frozen=True)

    rebalance_date: date
    effective_date: date
    symbols: list[str]
    turnover: float = Field(ge=0)


class BacktestMetrics(BaseModel):
    model_config = ConfigDict(frozen=True)

    cumulative_return: float
    benchmark_cumulative_return: float
    annualized_return: float
    annualized_volatility: float
    sharpe: float
    max_drawdown: float
    average_turnover: float = Field(ge=0)


class BacktestResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    dataset_id: str
    dataset_fingerprint: str
    request: BacktestRequest
    points: list[BacktestPoint]
    holdings: list[HoldingsSnapshot]
    metrics: BacktestMetrics
    request_fingerprint: str


class DatasetRefreshRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    symbols: list[str] = Field(min_length=1, max_length=500)
    start_date: date
    end_date: date

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, values: list[str]) -> list[str]:
        normalized = list(dict.fromkeys(symbol.strip().upper() for symbol in values if symbol.strip()))
        if not normalized:
            raise ValueError("symbols must contain at least one ticker")
        return normalized

    @model_validator(mode="after")
    def validate_date_range(self) -> "DatasetRefreshRequest":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class ResearchJob(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    kind: Literal["dataset_refresh", "backtest"]
    status: Literal["queued", "running", "succeeded", "failed"]
    created_at: datetime
    updated_at: datetime
    result: dict[str, Any] | None = None
    error: str | None = None
