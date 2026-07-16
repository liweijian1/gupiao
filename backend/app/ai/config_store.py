from __future__ import annotations

import os
import secrets
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from .models import AiConfigInput, AiConfigStatus, AiProviderConfig


def verify_secret(provided: str | None, expected: str | None) -> bool:
    if not provided or not expected:
        return False
    return secrets.compare_digest(provided, expected)


def _normalize_base_url(value: str) -> str:
    url = value.strip().rstrip("/")
    parsed = urlparse(url)
    if parsed.username or parsed.password or parsed.scheme not in {"http", "https"}:
        raise ValueError("invalid AI base URL")
    if parsed.scheme == "http" and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise ValueError("HTTP AI base URL must be loopback")
    if not parsed.hostname:
        raise ValueError("AI base URL requires a host")
    return url


def _mask_key(value: str) -> str:
    prefix = value[:3] if len(value) >= 3 else "key"
    suffix = value[-4:] if len(value) >= 4 else value
    return f"{prefix}••••••••{suffix}"


class AiConfigStore:
    def __init__(self, path: Path):
        self.path = Path(path)

    def read(self) -> AiProviderConfig | None:
        if not self.path.exists():
            return None
        return AiProviderConfig.model_validate_json(self.path.read_text(encoding="utf-8"))

    def status(self) -> AiConfigStatus:
        config = self.read()
        if not config:
            return AiConfigStatus(configured=False)
        return AiConfigStatus(
            configured=True,
            base_url=config.base_url,
            model=config.model,
            api_key_masked=_mask_key(config.api_key),
        )

    def resolve(self, candidate: AiConfigInput) -> AiProviderConfig:
        existing = self.read()
        api_key = (candidate.api_key or "").strip() or (existing.api_key if existing else "")
        if not api_key:
            raise ValueError("AI API key is required")
        return AiProviderConfig(
            base_url=_normalize_base_url(candidate.base_url),
            model=candidate.model.strip(),
            api_key=api_key,
        )

    def save(self, candidate: AiConfigInput) -> AiProviderConfig:
        config = self.resolve(candidate)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix=".ai-config-", dir=self.path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(config.model_dump_json())
            os.chmod(temporary, 0o600)
            os.replace(temporary, self.path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        return config
