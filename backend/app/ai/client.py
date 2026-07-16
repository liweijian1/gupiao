import json
import time

import httpx
from pydantic import ValidationError

from ..config import AI_CONNECT_TIMEOUT_SECONDS, AI_RESPONSE_TIMEOUT_SECONDS
from .models import AiAnalysis, AiProviderConfig


class AiUpstreamError(RuntimeError):
    def __init__(self, code: str, status_code: int, retry_after: int | None = None):
        super().__init__(code)
        self.code = code
        self.status_code = status_code
        self.retry_after = retry_after


class OpenAiCompatibleClient:
    def __init__(self, transport=None):
        self.transport = transport

    def _post(self, config, payload):
        timeout = httpx.Timeout(AI_RESPONSE_TIMEOUT_SECONDS, connect=AI_CONNECT_TIMEOUT_SECONDS)
        try:
            with httpx.Client(timeout=timeout, transport=self.transport) as client:
                return client.post(
                    f"{config.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {config.api_key}"},
                    json=payload,
                )
        except httpx.TimeoutException as exc:
            raise AiUpstreamError("upstream_timeout", 504) from exc
        except httpx.HTTPError as exc:
            raise AiUpstreamError("upstream_unavailable", 502) from exc

    def _raise_status(self, response):
        if response.status_code < 400:
            return
        code = {
            401: "upstream_auth_failed",
            403: "upstream_auth_failed",
            429: "upstream_rate_limited",
        }.get(response.status_code, "upstream_failed")
        retry = response.headers.get("retry-after")
        raise AiUpstreamError(
            code,
            429 if response.status_code == 429 else 502,
            int(retry) if retry and retry.isdigit() else None,
        )

    def test_connection(self, config: AiProviderConfig) -> int:
        started = time.monotonic()
        response = self._post(config, {
            "model": config.model,
            "messages": [{"role": "user", "content": 'Reply only with {"ok":true}'}],
            "max_tokens": 12,
            "temperature": 0,
        })
        self._raise_status(response)
        return round((time.monotonic() - started) * 1000)

    def analyze(self, config: AiProviderConfig, messages: list[dict[str, str]]) -> AiAnalysis:
        response = self._post(config, {
            "model": config.model,
            "messages": messages,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        })
        self._raise_status(response)
        try:
            content = response.json()["choices"][0]["message"]["content"]
            return AiAnalysis.model_validate(json.loads(content))
        except (KeyError, IndexError, TypeError, ValueError, ValidationError) as exc:
            raise AiUpstreamError("invalid_ai_response", 502) from exc
