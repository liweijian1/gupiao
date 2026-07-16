import json

import pytest

from app.ai.cache import AiAnalysisCache
from app.ai.client import AiUpstreamError
from app.ai.models import AiAnalysis, AiProviderConfig
from app.ai.service import AiAnalysisService


class FakeStore:
    def read(self):
        return AiProviderConfig(
            base_url="https://api.example.com/v1",
            model="model-a",
            api_key="sk-secret",
        )


class FakeClient:
    def __init__(self):
        self.calls = 0
        self.error = None

    def analyze(self, config, messages):
        self.calls += 1
        if self.error:
            raise self.error
        return AiAnalysis.model_validate({
            "rating": "neutral",
            "position_range": {"min": 10, "max": 20},
            "summary": f"summary-{self.calls}",
            "opportunities": ["opportunity"],
            "risks": ["risk"],
            "watchlist": [{"name": "PMI", "value": "50", "reason": "reason"}],
            "disclaimer": "provider disclaimer",
        })


@pytest.fixture
def cache_dir(tmp_path):
    return tmp_path / "analysis"


@pytest.fixture
def fake_client():
    return FakeClient()


@pytest.fixture
def service(cache_dir, fake_client):
    def context_loader(ticker):
        return {
            "stock": {"ticker": ticker, "name": "Test Stock", "price": 100},
            "macro": {"cycle": 60, "series": []},
            "data_as_of": "2026-07-15T00:00:00+00:00",
        }

    return AiAnalysisService(
        FakeStore(),
        AiAnalysisCache(cache_dir),
        fake_client,
        context_loader,
    )


def test_cache_hit_skips_provider(service, fake_client):
    first = service.analyze("600519", "zh", force=True)
    second = service.analyze("600519", "zh", force=False)
    assert first["analysis"] == second["analysis"]
    assert second["cached"] is True
    assert fake_client.calls == 1


def test_languages_have_separate_cache_entries(service, fake_client):
    service.analyze("600519", "zh", force=True)
    service.analyze("600519", "en", force=False)
    assert fake_client.calls == 2


def test_failed_refresh_preserves_previous_cache(service, fake_client):
    original = service.analyze("600519", "zh", force=True)
    fake_client.error = AiUpstreamError("upstream_timeout", 504)
    with pytest.raises(AiUpstreamError):
        service.analyze("600519", "zh", force=True)
    assert service.get_cached("600519", "zh")["analysis"] == original["analysis"]


def test_cache_contains_no_secrets(service, cache_dir):
    service.analyze("600519", "zh", force=True)
    content = next(cache_dir.glob("*.json")).read_text()
    assert "sk-secret" not in content
    assert "admin-password" not in content
    assert "analysis-password" not in content
    payload = json.loads(content)
    assert payload["analysis"]["disclaimer"] == "仅供研究参考，不构成投资建议。"
