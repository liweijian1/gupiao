from __future__ import annotations

import json
from pathlib import Path

from .models import ResearchJob


class ResearchStore:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.jobs_dir = self.root / "results"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

    def save_job(self, job: ResearchJob) -> ResearchJob:
        temporary = self.jobs_dir / f".{job.id}.tmp"
        target = self.jobs_dir / f"{job.id}.json"
        temporary.write_text(job.model_dump_json(), encoding="utf-8")
        temporary.replace(target)
        return job

    def get_job(self, job_id: str) -> ResearchJob | None:
        target = self.jobs_dir / f"{job_id}.json"
        if not target.exists():
            return None
        return ResearchJob.model_validate(json.loads(target.read_text(encoding="utf-8")))

    def list_jobs(self) -> list[ResearchJob]:
        return sorted(
            (
                ResearchJob.model_validate(json.loads(path.read_text(encoding="utf-8")))
                for path in self.jobs_dir.glob("*.json")
            ),
            key=lambda job: job.updated_at,
            reverse=True,
        )
