from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import RLock


@dataclass
class ProviderState:
    failures: int = 0
    last_error: str | None = None
    last_success: str | None = None
    cooldown_until: str | None = None


class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, cooldown_seconds: int = 300) -> None:
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self._state: dict[str, ProviderState] = {}
        self._lock = RLock()

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _get(self, provider: str) -> ProviderState:
        with self._lock:
            return self._state.setdefault(provider, ProviderState())

    def is_available(self, provider: str) -> bool:
        state = self._get(provider)
        if not state.cooldown_until:
            return True
        cooldown = datetime.fromisoformat(state.cooldown_until)
        if cooldown.tzinfo is None:
            cooldown = cooldown.replace(tzinfo=timezone.utc)
        return self._now() >= cooldown

    def record_success(self, provider: str) -> None:
        with self._lock:
            state = self._get(provider)
            state.failures = 0
            state.last_error = None
            state.cooldown_until = None
            state.last_success = self._now().isoformat()

    def record_failure(self, provider: str, error: str) -> None:
        with self._lock:
            state = self._get(provider)
            state.failures += 1
            state.last_error = error
            if state.failures >= self.failure_threshold:
                state.cooldown_until = (self._now() + timedelta(seconds=self.cooldown_seconds)).isoformat()

    def health_snapshot(self) -> list[dict]:
        rows: list[dict] = []
        with self._lock:
            for name, state in sorted(self._state.items()):
                status = "ok"
                if state.cooldown_until:
                    cooldown = datetime.fromisoformat(state.cooldown_until)
                    if cooldown.tzinfo is None:
                        cooldown = cooldown.replace(tzinfo=timezone.utc)
                    status = "cooldown" if self._now() < cooldown else "ok"
                rows.append(
                    {
                        "name": name,
                        "status": status,
                        "failures": state.failures,
                        "last_error": state.last_error,
                        "last_success": state.last_success,
                        "cooldown_until": state.cooldown_until,
                    }
                )
        return rows
