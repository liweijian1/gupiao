from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np

from .models import DailyBar, DatasetManifest


class DatasetUnavailable(RuntimeError):
    """Raised when the research store has no complete active data set."""


_BAR_FIELDS = ("open", "high", "low", "close", "volume", "amount")


def _canonical_bars(bars: Iterable[DailyBar]) -> list[DailyBar]:
    return sorted(bars, key=lambda item: (item.symbol, item.date))


def _fingerprint(bars: list[DailyBar]) -> str:
    payload = [bar.model_dump(mode="json") for bar in bars]
    encoded = json.dumps(
        {"builder": "qlib-ashare-daily-v1", "bars": payload},
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _write_qlib_bin(bars: list[DailyBar], destination: Path) -> None:
    qlib_root = destination / "qlib"
    calendar = sorted({bar.date for bar in bars})
    (qlib_root / "calendars").mkdir(parents=True, exist_ok=True)
    (qlib_root / "instruments").mkdir(parents=True, exist_ok=True)
    (qlib_root / "calendars" / "day.txt").write_text(
        "\n".join(day.isoformat() for day in calendar) + "\n",
        encoding="utf-8",
    )

    grouped: dict[str, list[DailyBar]] = {}
    for bar in bars:
        grouped.setdefault(bar.symbol, []).append(bar)
    instrument_lines: list[str] = []
    calendar_index = {value: index for index, value in enumerate(calendar)}
    for symbol, symbol_bars in sorted(grouped.items()):
        symbol_bars.sort(key=lambda item: item.date)
        instrument_lines.append(
            f"{symbol}\t{symbol_bars[0].date.isoformat()}\t{symbol_bars[-1].date.isoformat()}"
        )
        feature_root = qlib_root / "features" / symbol.lower()
        feature_root.mkdir(parents=True, exist_ok=True)
        symbol_calendar = calendar[
            calendar_index[symbol_bars[0].date] : calendar_index[symbol_bars[-1].date] + 1
        ]
        by_date = {bar.date: bar for bar in symbol_bars}
        start_index = calendar_index[symbol_calendar[0]]
        for field in _BAR_FIELDS:
            values = [
                getattr(by_date[day], field) if day in by_date else np.nan
                for day in symbol_calendar
            ]
            encoded = np.hstack([start_index, values]).astype("<f")
            encoded.tofile(feature_root / f"{field}.day.bin")
    (qlib_root / "instruments" / "all.txt").write_text(
        "\n".join(instrument_lines) + "\n",
        encoding="utf-8",
    )


def _write_json(path: Path, payload: object) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True),
        encoding="utf-8",
    )


def build_dataset(bars: Iterable[DailyBar], root: Path, *, activate: bool = True) -> DatasetManifest:
    normalized = _canonical_bars(bars)
    if not normalized:
        raise ValueError("at least one valid daily bar is required")
    root = Path(root)
    datasets_dir = root / "datasets"
    datasets_dir.mkdir(parents=True, exist_ok=True)
    fingerprint = _fingerprint(normalized)
    dataset_id = f"ashare-daily-{fingerprint[:12]}"
    target = datasets_dir / dataset_id
    manifest_path = target / "manifest.json"
    if manifest_path.exists():
        manifest = DatasetManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
    else:
        created_at = datetime.now(timezone.utc)
        manifest = DatasetManifest(
            dataset_id=dataset_id,
            start_date=min(bar.date for bar in normalized),
            end_date=max(bar.date for bar in normalized),
            symbols=sorted({bar.symbol for bar in normalized}),
            row_count=len(normalized),
            created_at=created_at,
            fingerprint=fingerprint,
        )
        temporary = Path(tempfile.mkdtemp(prefix=f".{dataset_id}-", dir=datasets_dir))
        try:
            _write_json(temporary / "bars.json", [bar.model_dump(mode="json") for bar in normalized])
            _write_qlib_bin(normalized, temporary)
            _write_json(temporary / "manifest.json", manifest.model_dump(mode="json"))
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                for child in sorted(temporary.rglob("*"), reverse=True):
                    if child.is_file() or child.is_symlink():
                        child.unlink()
                    elif child.is_dir():
                        child.rmdir()
                temporary.rmdir()
    if activate:
        activate_dataset(root, manifest.dataset_id)
    return manifest


def activate_dataset(root: Path, dataset_id: str) -> None:
    root = Path(root)
    manifest_path = root / "datasets" / dataset_id / "manifest.json"
    if not manifest_path.exists():
        raise DatasetUnavailable("The requested research dataset is incomplete")
    pointer = root / "current.json"
    pointer_tmp = root / ".current.json.tmp"
    _write_json(pointer_tmp, {"dataset_id": dataset_id})
    os.replace(pointer_tmp, pointer)


def _current_dataset_dir(root: Path) -> Path:
    pointer = Path(root) / "current.json"
    if not pointer.exists():
        raise DatasetUnavailable("No research dataset has been built")
    dataset_id = json.loads(pointer.read_text(encoding="utf-8")).get("dataset_id")
    directory = Path(root) / "datasets" / str(dataset_id)
    if not dataset_id or not (directory / "manifest.json").exists():
        raise DatasetUnavailable("The active research dataset is incomplete")
    return directory


def load_current_manifest(root: Path) -> DatasetManifest:
    directory = _current_dataset_dir(root)
    return DatasetManifest.model_validate_json((directory / "manifest.json").read_text(encoding="utf-8"))


def load_current_bars(root: Path) -> list[DailyBar]:
    directory = _current_dataset_dir(root)
    data = json.loads((directory / "bars.json").read_text(encoding="utf-8"))
    return [DailyBar.model_validate(item) for item in data]


def get_qlib_provider_uri(root: Path) -> Path:
    return _current_dataset_dir(root) / "qlib"


def get_dataset_qlib_provider_uri(root: Path, dataset_id: str) -> Path:
    root = Path(root)
    directory = root / "datasets" / dataset_id
    if not (directory / "manifest.json").exists():
        raise DatasetUnavailable("The requested research dataset is incomplete")
    return directory / "qlib"
