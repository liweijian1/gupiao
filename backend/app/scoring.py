from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import numpy as np

from .indicators import INDICATORS


def clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))


def z_score(points: list[dict[str, Any]]) -> float:
    values = np.array([float(point["value"]) for point in points[-36:]], dtype=float)
    if len(values) < 2:
        return 0.0
    std = float(np.std(values))
    if std == 0:
        return 0.0
    return float((values[-1] - np.mean(values)) / std)


def indicator_score(points: list[dict[str, Any]], direction: int) -> int:
    return round(clamp(50 + z_score(points) * direction * 18))


def fallback_points(value: float) -> list[dict[str, Any]]:
    return [{"date": "fallback", "value": float(value)}]


def build_fallback_series() -> list[dict[str, Any]]:
    series = []
    for indicator in INDICATORS:
        points = fallback_points(indicator["fallback"])
        series.append({
            "key": indicator["key"],
            "group": indicator["group"],
            "unit": indicator["unit"],
            "direction": indicator["direction"],
            "weight": indicator["weight"],
            "api": f"{indicator['api_candidates'][0]}()",
            "points": points,
            "source": "mock",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "error": "AkShare unavailable or fetch failed; using prototype fallback data.",
        })
    return enrich_series(series)


def enrich_series(series: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched = []
    for item in series:
        points = item.get("points") or fallback_points(0)
        latest = points[-1]
        score = indicator_score(points, int(item["direction"]))
        enriched.append({
            **item,
            "latest_date": latest["date"],
            "latest_value": float(latest["value"]),
            "z_score": round(z_score(points), 3),
            "score": score,
        })
    return enriched


def weighted_score(series: list[dict[str, Any]], groups: set[str]) -> int:
    selected = [item for item in series if item["group"] in groups]
    total_weight = sum(float(item["weight"]) for item in selected)
    if total_weight == 0:
        return 50
    value = sum(float(item["score"]) * float(item["weight"]) for item in selected) / total_weight
    return round(clamp(value))


def classify_cycle(growth: int, inflation: int) -> str:
    if growth > 58 and inflation < 55:
        return "Recovery"
    if growth > 60 and inflation >= 55:
        return "Overheat"
    if growth < 48 and inflation > 55:
        return "Stagflation"
    return "Slowdown"


def build_scores(series: list[dict[str, Any]]) -> dict[str, Any]:
    growth = weighted_score(series, {"Growth", "Property"})
    liquidity = weighted_score(series, {"Liquidity", "Rates"})
    inflation = weighted_score(series, {"Inflation"})
    external = weighted_score(series, {"External"})
    composite = round(clamp((growth + liquidity + (100 - inflation)) / 3))

    return {
        "economic_climate": growth,
        "liquidity": liquidity,
        "inflation": inflation,
        "external_pressure": external,
        "composite": composite,
        "cycle": classify_cycle(growth, inflation),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def build_snapshot(series: list[dict[str, Any]]) -> dict[str, Any]:
    enriched = enrich_series(series)
    return {
        "series": enriched,
        "scores": build_scores(enriched),
        "source": "akshare" if any(item["source"] == "akshare" for item in enriched) else "mock",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
