import json

import httpx
import pytest

from app.ai.client import AiUpstreamError, OpenAiCompatibleClient
from app.ai.models import AiProviderConfig


CONFIG = AiProviderConfig(base_url="https://api.example.com/v1", model="model-a", api_key="sk-secret")


def client_for(handler):
    return OpenAiCompatibleClient(transport=httpx.MockTransport(handler))


def test_analyze_posts_chat_completion_and_validates_json():
    def handler(request):
        assert str(request.url) == "https://api.example.com/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer sk-secret"
        body = json.loads(request.content)
        assert body["model"] == "model-a"
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({
            "rating": "neutral",
            "position_range": {"min": 10, "max": 20},
            "summary": "summary",
            "opportunities": ["opportunity"],
            "risks": ["risk"],
            "watchlist": [{"name": "PMI", "value": "50", "reason": "reason"}],
            "disclaimer": "reference only",
        })}}]})

    result = client_for(handler).analyze(CONFIG, [{"role": "user", "content": "context"}])
    assert result.rating == "neutral"


@pytest.mark.parametrize(("status", "code"), [
    (401, "upstream_auth_failed"),
    (429, "upstream_rate_limited"),
    (500, "upstream_failed"),
])
def test_maps_upstream_status(status, code):
    client = client_for(lambda request: httpx.Response(status, headers={"retry-after": "3"}))
    with pytest.raises(AiUpstreamError) as caught:
        client.analyze(CONFIG, [{"role": "user", "content": "context"}])
    assert caught.value.code == code


def test_rejects_invalid_model_output_without_leaking_body():
    client = client_for(lambda request: httpx.Response(200, json={
        "choices": [{"message": {"content": "not-json-sk-secret"}}]
    }))
    with pytest.raises(AiUpstreamError) as caught:
        client.analyze(CONFIG, [{"role": "user", "content": "context"}])
    assert caught.value.code == "invalid_ai_response"
    assert "sk-secret" not in str(caught.value)


def test_accepts_json_after_minimax_thinking_block_and_code_fence():
    content = """<think>private reasoning</think>
```json
{
  "rating": "bullish",
  "position_range": {"min": 20, "max": 35},
  "summary": "summary",
  "opportunities": ["opportunity"],
  "risks": ["risk"],
  "watchlist": [{"name": "PMI", "value": "50", "reason": "reason"}],
  "disclaimer": "reference only"
}
```"""
    client = client_for(lambda request: httpx.Response(200, json={
        "choices": [{"message": {"content": content}}]
    }))

    result = client.analyze(CONFIG, [{"role": "user", "content": "context"}])

    assert result.rating == "bullish"
    assert result.position_range.max == 35
