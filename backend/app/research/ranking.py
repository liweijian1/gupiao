from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Iterable

import pandas as pd

from .factors import FACTOR_COLUMNS, calculate_factor_frame, cross_sectional_zscores
from .models import DailyBar, DatasetManifest, FactorWeights, RankingResult, RankingRow


def _request_fingerprint(manifest: DatasetManifest, as_of: date, weights: FactorWeights) -> str:
    payload = json.dumps(
        {
            "dataset": manifest.fingerprint,
            "as_of": as_of.isoformat(),
            "weights": weights.model_dump(),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def rank_bars(
    bars: Iterable[DailyBar],
    manifest: DatasetManifest,
    *,
    as_of: date | None = None,
    weights: FactorWeights,
) -> RankingResult:
    factor_frame = calculate_factor_frame(bars)
    if factor_frame.empty:
        raise ValueError("No bars are available for ranking")
    current_date = pd.Timestamp(as_of or manifest.end_date)
    candidates = factor_frame[factor_frame["date"] == current_date].copy()
    candidates = candidates.dropna(subset=list(FACTOR_COLUMNS))
    if candidates.empty:
        raise ValueError("No symbols have enough daily history for ranking")
    normalized_weights = weights.normalized()
    scored = cross_sectional_zscores(candidates)
    scored["combined"] = sum(scored[key] * normalized_weights[key] for key in FACTOR_COLUMNS)
    scored["score"] = (50 + scored["combined"] * 20).clip(lower=0, upper=100)
    scored = scored.sort_values(["score", "symbol"], ascending=[False, True]).reset_index(drop=True)
    rows = [
        RankingRow(
            symbol=row.symbol,
            rank=index + 1,
            score=round(float(row.score), 2),
            close=float(row.close),
            factor_scores={key: round(float(row[key]), 4) for key in FACTOR_COLUMNS},
        )
        for index, row in scored.iterrows()
    ]
    selected_date = current_date.date()
    return RankingResult(
        as_of=selected_date,
        dataset_id=manifest.dataset_id,
        dataset_fingerprint=manifest.fingerprint,
        weights=weights,
        rows=rows,
        request_fingerprint=_request_fingerprint(manifest, selected_date, weights),
    )
