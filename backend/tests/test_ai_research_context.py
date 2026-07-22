from datetime import date

from app.ai.service import load_research_evidence
from app.research.dataset import build_dataset
from app.research.models import DailyBar, ResearchJob
from app.research.store import ResearchStore


def test_ai_research_evidence_only_returns_completed_result_for_matching_dataset_and_symbol(tmp_path):
    manifest = build_dataset(
        [
            DailyBar(symbol="600519", date=date(2026, 1, 1), open=10, high=11, low=9, close=10, volume=1, amount=10),
        ],
        tmp_path,
    )
    store = ResearchStore(tmp_path)
    store.save_job(
        ResearchJob(
            id="job-a",
            kind="backtest",
            status="succeeded",
            created_at="2026-01-02T00:00:00Z",
            updated_at="2026-01-02T00:00:00Z",
            result={
                "dataset_fingerprint": manifest.fingerprint,
                "metrics": {"cumulative_return": 0.1, "sharpe": 1.2},
                "holdings": [{"symbols": ["600519"]}],
                "request": {"start_date": "2026-01-01", "end_date": "2026-01-02"},
            },
        )
    )

    evidence = load_research_evidence("600519", tmp_path)

    assert evidence["dataset_fingerprint"] == manifest.fingerprint
    assert evidence["metrics"]["sharpe"] == 1.2
    assert load_research_evidence("000001", tmp_path) is None
