from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class AiConfigInput(BaseModel):
    base_url: str
    model: str = Field(min_length=1, max_length=120)
    api_key: str | None = Field(default=None, max_length=500)


class AiProviderConfig(BaseModel):
    base_url: str
    model: str
    api_key: str


class AiConfigStatus(BaseModel):
    configured: bool
    base_url: str | None = None
    model: str | None = None
    api_key_masked: str | None = None


class PositionRange(BaseModel):
    min: int = Field(ge=0, le=100)
    max: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_order(self):
        if self.min > self.max:
            raise ValueError("position min exceeds max")
        return self


class WatchItem(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=1, max_length=300)


class AiAnalysis(BaseModel):
    rating: Literal["bullish", "neutral", "bearish"]
    position_range: PositionRange
    summary: str = Field(min_length=1, max_length=2000)
    opportunities: list[str] = Field(min_length=1, max_length=3)
    risks: list[str] = Field(min_length=1, max_length=3)
    watchlist: list[WatchItem] = Field(min_length=1, max_length=5)
    disclaimer: str = Field(min_length=1, max_length=500)

    @field_validator("opportunities", "risks")
    @classmethod
    def validate_items(cls, items):
        if any(not item.strip() or len(item) > 400 for item in items):
            raise ValueError("invalid analysis list item")
        return [item.strip() for item in items]
