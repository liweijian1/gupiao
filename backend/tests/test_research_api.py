from datetime import date

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.research.models import (
    BacktestRequest,
    DatasetManifest,
    FactorWeights,
    ResearchJob,
)
from app.routers.research import get_research_service, router


class FakeService:
    def __init__(self):
        self.manifest = DatasetManifest(
            dataset_id="dataset-a",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 31),
            symbols=["600519"],
            row_count=30,
            created_at="2026-02-01T00:00:00Z",
            fingerprint="c" * 64,
        )
        self.job = ResearchJob(id="job-a", kind="backtest", status="queued", created_at="2026-02-01T00:00:00Z", updated_at="2026-02-01T00:00:00Z")

    def get_dataset(self):
        return self.manifest

    def refresh_dataset(self, request):
        return self.job.model_copy(update={"kind": "dataset_refresh"})

    def get_ranking(self, as_of, weights):
        return {"as_of": str(as_of), "dataset_fingerprint": self.manifest.fingerprint, "weights": weights.model_dump(), "rows": []}

    def start_backtest(self, request: BacktestRequest):
        return self.job

    def get_job(self, job_id):
        return self.job if job_id == self.job.id else None


def make_client(service=None):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_research_service] = lambda: service or FakeService()
    return TestClient(app)


def test_dataset_ranking_and_backtest_routes_expose_only_research_results():
    client = make_client()

    dataset = client.get("/api/research/dataset")
    ranking = client.get("/api/research/ranking?as_of=2026-01-31&momentum=100")
    backtest = client.post(
        "/api/research/backtests",
        json={
            "symbols": ["600519"],
            "start_date": "2026-01-01",
            "end_date": "2026-01-31",
            "weights": {"momentum": 100},
        },
    )
    job = client.get("/api/research/backtests/job-a")

    assert dataset.status_code == ranking.status_code == job.status_code == 200
    assert backtest.status_code == 202
    assert ranking.json()["weights"]["momentum"] == 100
    assert job.json()["kind"] == "backtest"
