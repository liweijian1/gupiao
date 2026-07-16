import json
import os
import re
import tempfile
from pathlib import Path


SAFE_PART = re.compile(r"^[A-Za-z0-9._-]+$")


class AiAnalysisCache:
    def __init__(self, directory: Path):
        self.directory = Path(directory)

    def _path(self, ticker: str, lang: str) -> Path:
        normalized = ticker.strip().upper()
        if not SAFE_PART.fullmatch(normalized) or lang not in {"zh", "en"}:
            raise ValueError("invalid cache key")
        return self.directory / f"{normalized}-{lang}.json"

    def read(self, ticker: str, lang: str, fingerprint: str) -> dict | None:
        path = self._path(ticker, lang)
        if not path.exists():
            return None
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if payload.get("config_fingerprint") == fingerprint else None

    def write(self, ticker: str, lang: str, payload: dict) -> None:
        path = self._path(ticker, lang)
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=".ai-analysis-", dir=path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, ensure_ascii=False)
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
