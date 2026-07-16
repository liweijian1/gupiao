from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.ai.client import AiUpstreamError
from app.ai.models import AiConfigInput, AiConfigStatus, AiProviderConfig
from app.ai.routes import (
    get_ai_client,
    get_ai_service,
    get_ai_store,
    router,
)


class FakeStore:
    def __init__(self, configured=True):
        self.config = AiProviderConfig(
            base_url="https://api.example.com/v1",
            model="model-a",
            api_key="sk-secret",
        ) if configured else None

    def read(self):
        return self.config

    def status(self):
        if not self.config:
            return AiConfigStatus(configured=False)
        return AiConfigStatus(
            configured=True,
            base_url=self.config.base_url,
            model=self.config.model,
            api_key_masked="sk-••••••••cret",
        )

    def resolve(self, candidate: AiConfigInput):
        if not self.config and not candidate.api_key:
            raise ValueError("AI API key is required")
        return AiProviderConfig(
            base_url=candidate.base_url.rstrip("/"),
            model=candidate.model,
            api_key=candidate.api_key or self.config.api_key,
        )

    def save(self, candidate: AiConfigInput):
        self.config = self.resolve(candidate)
        return self.config


class FakeClient:
    def __init__(self, error=None):
        self.error = error

    def test_connection(self, config):
        if self.error:
            raise self.error
        return 42


class FakeService:
    def __init__(self, configured=True, error=None):
        self.configured = configured
        self.error = error

    def _result(self, ticker, lang):
        return {
            "ticker": ticker.upper(),
            "lang": lang,
            "model": "model-a",
            "generated_at": "2026-07-15T00:00:00+00:00",
            "data_as_of": "2026-07-14T00:00:00+00:00",
            "cached": False,
            "analysis": {
                "rating": "neutral",
                "position_range": {"min": 10, "max": 20},
                "summary": "summary",
                "opportunities": ["opportunity"],
                "risks": ["risk"],
                "watchlist": [{"name": "PMI", "value": "50", "reason": "reason"}],
                "disclaimer": "仅供研究参考，不构成投资建议。",
            },
        }

    def analyze(self, ticker, lang, force=False):
        if not self.configured:
            raise RuntimeError("ai_not_configured")
        if self.error:
            raise self.error
        return self._result(ticker, lang)

    def get_cached(self, ticker, lang):
        if not self.configured:
            raise RuntimeError("ai_not_configured")
        return self._result(ticker, lang)


def make_client(monkeypatch, store=None, ai_client=None, service=None):
    import app.ai.routes as routes

    monkeypatch.setattr(routes, "AI_ADMIN_PASSWORD", "admin-test")
    monkeypatch.setattr(routes, "AI_ANALYSIS_PASSWORD", "analysis-test")
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_ai_store] = lambda: store or FakeStore()
    app.dependency_overrides[get_ai_client] = lambda: ai_client or FakeClient()
    app.dependency_overrides[get_ai_service] = lambda: service or FakeService()
    return TestClient(app)


def test_status_returns_only_masked_configuration(monkeypatch):
    response = make_client(monkeypatch).get("/api/ai/config/status")
    assert response.status_code == 200
    assert response.json()["api_key_masked"] == "sk-••••••••cret"
    assert "sk-secret" not in response.text


def test_admin_routes_reject_missing_or_wrong_password(monkeypatch):
    client = make_client(monkeypatch)
    body = {"base_url": "https://api.example.com/v1", "model": "model-a", "api_key": "key"}
    for method, path in (("post", "/api/ai/config/test"), ("put", "/api/ai/config")):
        assert getattr(client, method)(path, json=body).status_code == 401
        assert getattr(client, method)(path, json=body, headers={"X-AI-Admin-Password": "wrong"}).status_code == 401


def test_analysis_routes_use_separate_password(monkeypatch):
    client = make_client(monkeypatch)
    assert client.post("/api/ai/analyze", json={"ticker": "600519"}).status_code == 401
    assert client.get(
        "/api/ai/analysis/600519",
        headers={"X-AI-Admin-Password": "admin-test"},
    ).status_code == 401
    response = client.post(
        "/api/ai/analyze",
        json={"ticker": "600519", "lang": "zh"},
        headers={"X-AI-Analysis-Password": "analysis-test"},
    )
    assert response.status_code == 200
    assert response.json()["analysis"]["rating"] == "neutral"


def test_not_configured_returns_conflict(monkeypatch):
    client = make_client(monkeypatch, service=FakeService(configured=False))
    response = client.post(
        "/api/ai/analyze",
        json={"ticker": "600519"},
        headers={"X-AI-Analysis-Password": "analysis-test"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "ai_not_configured"


def test_upstream_error_status_is_preserved(monkeypatch):
    for error in (
        AiUpstreamError("upstream_rate_limited", 429, 3),
        AiUpstreamError("upstream_failed", 502),
        AiUpstreamError("upstream_timeout", 504),
    ):
        client = make_client(monkeypatch, service=FakeService(error=error))
        response = client.post(
            "/api/ai/analyze",
            json={"ticker": "600519"},
            headers={"X-AI-Analysis-Password": "analysis-test"},
        )
        assert response.status_code == error.status_code
        assert response.json()["detail"]["code"] == error.code


def test_save_and_test_never_return_key(monkeypatch):
    client = make_client(monkeypatch)
    body = {"base_url": "https://api.example.com/v1", "model": "model-b", "api_key": "new-secret"}
    headers = {"X-AI-Admin-Password": "admin-test"}
    tested = client.post("/api/ai/config/test", json=body, headers=headers)
    saved = client.put("/api/ai/config", json=body, headers=headers)
    assert tested.status_code == saved.status_code == 200
    assert tested.json()["latency_ms"] == 42
    assert "new-secret" not in tested.text
    assert "new-secret" not in saved.text
