from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable
from uuid import uuid4

from ..market_data.history import get_ashare_daily_history
from .backtest import run_backtest
from .dataset import (
    activate_dataset,
    build_dataset,
    get_dataset_qlib_provider_uri,
    load_current_bars,
    load_current_manifest,
)
from .models import BacktestRequest, DatasetRefreshRequest, FactorWeights, ResearchJob
from .ranking import rank_bars
from .qlib_runtime import initialize_qlib
from .store import ResearchStore


class ResearchService:
    def __init__(
        self,
        root: Path,
        *,
        history_loader: Callable = get_ashare_daily_history,
        store: ResearchStore | None = None,
    ):
        self.root = Path(root)
        self.history_loader = history_loader
        self.store = store or ResearchStore(self.root)
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="research")

    def _new_job(self, kind: str) -> ResearchJob:
        now = datetime.now(timezone.utc)
        return self.store.save_job(
            ResearchJob(
                id=uuid4().hex,
                kind=kind,
                status="queued",
                created_at=now,
                updated_at=now,
            )
        )

    def _save_status(self, job: ResearchJob, status: str, *, result=None, error=None) -> ResearchJob:
        return self.store.save_job(
            job.model_copy(
                update={
                    "status": status,
                    "updated_at": datetime.now(timezone.utc),
                    "result": result,
                    "error": error,
                }
            )
        )

    def get_dataset(self):
        return load_current_manifest(self.root)

    def refresh_dataset(self, request: DatasetRefreshRequest) -> ResearchJob:
        job = self._new_job("dataset_refresh")

        def work() -> None:
            running = self._save_status(job, "running")
            try:
                history = self.history_loader(request.symbols, request.start_date, request.end_date)
                manifest = build_dataset(history.bars, self.root, activate=False)
                qlib_version = initialize_qlib(get_dataset_qlib_provider_uri(self.root, manifest.dataset_id))
                activate_dataset(self.root, manifest.dataset_id)
                self._save_status(
                    running,
                    "succeeded",
                    result={
                        "manifest": manifest.model_dump(mode="json"),
                        "failures": history.failures,
                        "qlib_version": qlib_version,
                    },
                )
            except Exception as exc:  # noqa: BLE001 - persist safe diagnostics for polling clients.
                self._save_status(running, "failed", error=str(exc))

        self.executor.submit(work)
        return job

    def get_ranking(self, as_of, weights: FactorWeights):
        manifest = load_current_manifest(self.root)
        return rank_bars(load_current_bars(self.root), manifest, as_of=as_of, weights=weights)

    def start_backtest(self, request: BacktestRequest) -> ResearchJob:
        job = self._new_job("backtest")

        def work() -> None:
            running = self._save_status(job, "running")
            try:
                manifest = load_current_manifest(self.root)
                result = run_backtest(load_current_bars(self.root), manifest, request)
                self._save_status(running, "succeeded", result=result.model_dump(mode="json"))
            except Exception as exc:  # noqa: BLE001 - persist safe diagnostics for polling clients.
                self._save_status(running, "failed", error=str(exc))

        self.executor.submit(work)
        return job

    def get_job(self, job_id: str) -> ResearchJob | None:
        return self.store.get_job(job_id)
