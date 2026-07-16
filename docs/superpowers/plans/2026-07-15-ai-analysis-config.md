# AI Analysis and Secure Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add administrator-managed OpenAI-compatible configuration and password-protected, cached AI analysis for the currently selected stock.

**Architecture:** The FastAPI backend owns configuration, credentials, provider calls, validation, and analysis caching. React calls only the protected backend endpoints, keeps passwords in component memory, and renders dedicated settings and analysis components. Backend units use dependency injection so tests never call a real provider.

**Tech Stack:** Python 3, FastAPI 0.110–0.115, Pydantic 2, httpx 0.27–0.28, pytest 8, React 19, Vite 6, Node test runner

## Global Constraints

- Support the OpenAI-compatible `<base_url>/chat/completions` contract only.
- Keep API keys, administrator passwords, and analysis passwords out of Git, frontend storage, URLs, logs, API responses, and analysis cache files.
- Require `AI_ADMIN_PASSWORD` for configuration mutation and `AI_ANALYSIS_PASSWORD` for analysis reads/generation.
- Persist production AI configuration at `AI_CONFIG_PATH=/var/lib/stock-macro-terminal/ai_config.json` with mode `0600`.
- Accept HTTPS Base URLs; accept HTTP only for loopback hosts.
- Generate analysis only from bounded stock and macro data supplied by the backend.
- Cache one latest valid result per `ticker + language`; failed refreshes must not overwrite it.
- Preserve the existing `/stock-macro/` prefix and the old `/` and `/api/` routes.
- Display a permanent localized disclaimer and never perform automated trading.

---

### Task 1: Secure AI configuration store and password guards

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Modify: `backend/app/config.py`
- Create: `backend/app/ai/__init__.py`
- Create: `backend/app/ai/models.py`
- Create: `backend/app/ai/config_store.py`
- Test: `backend/tests/test_ai_config.py`

**Interfaces:**
- Produces: `AiProviderConfig`, `AiConfigInput`, `AiConfigStatus`, `AiConfigStore.read()`, `AiConfigStore.resolve()`, `AiConfigStore.save()`, `AiConfigStore.status()`, `verify_secret()`.
- Consumes: `AI_CONFIG_PATH`, `AI_ADMIN_PASSWORD`, and `AI_ANALYSIS_PASSWORD` from `backend/app/config.py`.

- [ ] **Step 1: Add backend test/runtime dependencies**

Append to `backend/requirements.txt`:

```text
httpx>=0.27.0,<0.29.0
```

Create `backend/requirements-dev.txt`:

```text
-r requirements.txt
pytest>=8.0.0,<9.0.0
```

Install with:

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
```

Expected: installation exits `0` and `.venv/bin/pytest --version` prints pytest 8.x.

- [ ] **Step 2: Write failing configuration tests**

Create `backend/tests/test_ai_config.py` with tests that assert exact behavior:

```python
import json
import stat

import pytest

from app.ai.config_store import AiConfigStore, verify_secret
from app.ai.models import AiConfigInput


def test_save_masks_key_and_uses_private_mode(tmp_path):
    path = tmp_path / "ai.json"
    store = AiConfigStore(path)
    saved = store.save(AiConfigInput(
        base_url="https://api.example.com/v1/",
        model="model-a",
        api_key="sk-secret-abcd",
    ))
    assert saved.api_key == "sk-secret-abcd"
    assert store.status().model == "model-a"
    assert store.status().api_key_masked == "sk-••••••••abcd"
    assert "sk-secret-abcd" not in store.status().model_dump_json()
    assert stat.S_IMODE(path.stat().st_mode) == 0o600
    assert json.loads(path.read_text())["base_url"] == "https://api.example.com/v1"


def test_blank_key_preserves_existing_key(tmp_path):
    store = AiConfigStore(tmp_path / "ai.json")
    store.save(AiConfigInput(base_url="https://one.example/v1", model="one", api_key="sk-one"))
    store.save(AiConfigInput(base_url="https://two.example/v1", model="two", api_key=""))
    assert store.read().api_key == "sk-one"


@pytest.mark.parametrize("url", [
    "http://api.example.com/v1",
    "https://user:pass@api.example.com/v1",
    "file:///tmp/provider",
])
def test_rejects_unsafe_base_url(tmp_path, url):
    store = AiConfigStore(tmp_path / "ai.json")
    with pytest.raises(ValueError):
        store.save(AiConfigInput(base_url=url, model="model-a", api_key="sk-a"))


def test_allows_loopback_http(tmp_path):
    store = AiConfigStore(tmp_path / "ai.json")
    store.save(AiConfigInput(base_url="http://127.0.0.1:11434/v1", model="local", api_key="local"))
    assert store.read().base_url == "http://127.0.0.1:11434/v1"


def test_verify_secret_fails_closed():
    assert verify_secret("correct", "correct") is True
    assert verify_secret("wrong", "correct") is False
    assert verify_secret("anything", "") is False
```

- [ ] **Step 3: Run the focused tests to verify RED**

Run:

```bash
cd backend
.venv/bin/pytest tests/test_ai_config.py -q
```

Expected: collection fails because `app.ai.config_store` and `app.ai.models` do not exist.

- [ ] **Step 4: Implement models, configuration, and atomic persistence**

Add to `backend/app/config.py`:

```python
import os

AI_CONFIG_PATH = Path(os.getenv("AI_CONFIG_PATH", CACHE_DIR / "ai_config.json"))
AI_ANALYSIS_CACHE_DIR = Path(os.getenv("AI_ANALYSIS_CACHE_DIR", CACHE_DIR / "ai_analysis"))
AI_ADMIN_PASSWORD = os.getenv("AI_ADMIN_PASSWORD", "")
AI_ANALYSIS_PASSWORD = os.getenv("AI_ANALYSIS_PASSWORD", "")
AI_CONNECT_TIMEOUT_SECONDS = 5.0
AI_RESPONSE_TIMEOUT_SECONDS = 45.0
```

Create `backend/app/ai/models.py` with these public models and validators:

```python
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class AiConfigInput(BaseModel):
    base_url: str
    model: str = Field(min_length=1, max_length=120)
    api_key: str | None = Field(default=None, max_length=500)


class AiProviderConfig(BaseModel):
    base_url: str
    model: str
    api_key: str


class AiConfigStatus(BaseModel):
    configured: bool
    base_url: str | None = None
    model: str | None = None
    api_key_masked: str | None = None


class PositionRange(BaseModel):
    min: int = Field(ge=0, le=100)
    max: int = Field(ge=0, le=100)

    @model_validator(mode="after")
    def validate_order(self):
        if self.min > self.max:
            raise ValueError("position min exceeds max")
        return self


class WatchItem(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    value: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=1, max_length=300)


class AiAnalysis(BaseModel):
    rating: Literal["bullish", "neutral", "bearish"]
    position_range: PositionRange
    summary: str = Field(min_length=1, max_length=2000)
    opportunities: list[str] = Field(min_length=1, max_length=3)
    risks: list[str] = Field(min_length=1, max_length=3)
    watchlist: list[WatchItem] = Field(min_length=1, max_length=5)
    disclaimer: str = Field(min_length=1, max_length=500)

    @field_validator("opportunities", "risks")
    @classmethod
    def validate_items(cls, items):
        if any(not item.strip() or len(item) > 400 for item in items):
            raise ValueError("invalid analysis list item")
        return [item.strip() for item in items]
```

Create `backend/app/ai/config_store.py` implementing:

```python
import json
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
```

- [ ] **Step 5: Run configuration tests to verify GREEN**

Run:

```bash
cd backend
.venv/bin/pytest tests/test_ai_config.py -q
```

Expected: all configuration tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/requirements.txt backend/requirements-dev.txt backend/app/config.py backend/app/ai backend/tests/test_ai_config.py
git commit -m "feat: add secure AI configuration store"
```

---

### Task 2: OpenAI-compatible client and structured response validation

**Files:**
- Create: `backend/app/ai/client.py`
- Test: `backend/tests/test_ai_client.py`

**Interfaces:**
- Consumes: `AiProviderConfig`, `AiAnalysis`, timeout constants.
- Produces: `OpenAiCompatibleClient.test_connection(config)`, `OpenAiCompatibleClient.analyze(config, messages)`, `AiUpstreamError(code, status_code, retry_after)`.

- [ ] **Step 1: Write mocked-client failing tests**

Create `backend/tests/test_ai_client.py` using `httpx.MockTransport`:

```python
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


@pytest.mark.parametrize((status, code), [
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
```

- [ ] **Step 2: Run client tests to verify RED**

Run `.venv/bin/pytest tests/test_ai_client.py -q` from `backend`.

Expected: import failure for `app.ai.client`.

- [ ] **Step 3: Implement the compatible client**

Create `backend/app/ai/client.py` with:

```python
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
        raise AiUpstreamError(code, 429 if response.status_code == 429 else 502, int(retry) if retry and retry.isdigit() else None)

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
```

- [ ] **Step 4: Run client tests to verify GREEN**

Run `.venv/bin/pytest tests/test_ai_client.py -q`.

Expected: all client tests pass with no network request.

- [ ] **Step 5: Commit Task 2**

```bash
git add backend/app/ai/client.py backend/tests/test_ai_client.py
git commit -m "feat: add OpenAI-compatible analysis client"
```

---

### Task 3: Analysis context, cache, service, and protected FastAPI routes

**Files:**
- Create: `backend/app/ai/cache.py`
- Create: `backend/app/ai/service.py`
- Create: `backend/app/ai/routes.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_ai_service.py`
- Test: `backend/tests/test_ai_routes.py`

**Interfaces:**
- Consumes: stock/macro snapshot functions, `AiConfigStore`, `OpenAiCompatibleClient`, both server passwords.
- Produces: `AiAnalysisService.get_cached()`, `AiAnalysisService.analyze()`, and `/api/ai/*` routes.

- [ ] **Step 1: Write service/cache failing tests**

Create `backend/tests/test_ai_service.py` with a fake client and injected context loader. Cover:

```python
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
```

Provide fixtures with a deterministic stock/macro context and valid `AiAnalysis`; do not import live AkShare or Baostock providers.

- [ ] **Step 2: Run service tests to verify RED**

Run `.venv/bin/pytest tests/test_ai_service.py -q`.

Expected: import failures for cache/service modules.

- [ ] **Step 3: Implement cache and analysis service**

Implement `AiAnalysisCache` in `backend/app/ai/cache.py` with atomic JSON replacement, safe filenames matching `^[A-Za-z0-9._-]+$`, and methods:

```python
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
```

Implement `AiAnalysisService` in `backend/app/ai/service.py` with constructor injection:

```python
import json
import threading
from datetime import datetime, timezone
from hashlib import sha256

from .client import AiUpstreamError


DISCLAIMERS = {
    "zh": "仅供研究参考，不构成投资建议。",
    "en": "For research reference only; not investment advice.",
}


class AiAnalysisService:
    def __init__(self, config_store, cache, client, context_loader):
        self.config_store = config_store
        self.cache = cache
        self.client = client
        self.context_loader = context_loader
        self._locks = {}
        self._locks_guard = threading.Lock()

    def _fingerprint(self, config) -> str:
        return sha256(f"{config.base_url}\n{config.model}".encode()).hexdigest()

    def _lock_for(self, key: str):
        with self._locks_guard:
            return self._locks.setdefault(key, threading.Lock())

    def get_cached(self, ticker: str, lang: str) -> dict | None:
        config = self.config_store.read()
        if not config:
            raise RuntimeError("ai_not_configured")
        payload = self.cache.read(ticker, lang, self._fingerprint(config))
        if payload:
            return {**payload, "cached": True}
        return None

    def analyze(self, ticker: str, lang: str, force: bool = False) -> dict:
        config = self.config_store.read()
        if not config:
            raise RuntimeError("ai_not_configured")
        fingerprint = self._fingerprint(config)
        if not force:
            cached = self.cache.read(ticker, lang, fingerprint)
            if cached:
                return {**cached, "cached": True}
        key = f"{ticker.upper()}:{lang}"
        with self._lock_for(key):
            if not force:
                cached = self.cache.read(ticker, lang, fingerprint)
                if cached:
                    return {**cached, "cached": True}
            context = self.context_loader(ticker)
            messages = [
                {"role": "system", "content": SYSTEM_PROMPTS[lang]},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
            ]
            analysis = self.client.analyze(config, messages).model_copy(
                update={"disclaimer": DISCLAIMERS[lang]}
            )
            payload = {
                "ticker": ticker.upper(),
                "lang": lang,
                "model": config.model,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "data_as_of": context["data_as_of"],
                "cached": False,
                "config_fingerprint": fingerprint,
                "analysis": analysis.model_dump(),
            }
            self.cache.write(ticker, lang, payload)
            return payload
```

Define these prompts in the same module:

```python
SYSTEM_PROMPTS = {
    "zh": (
        "你是股票与宏观研究助手。只能使用用户提供的结构化数据，不得编造新闻、财务报表或目标价。"
        "缺失信息必须明确标为缺失。只返回一个 JSON 对象，不要 Markdown 代码围栏。"
        "对象必须包含 rating、position_range、summary、opportunities、risks、watchlist、disclaimer。"
        "rating 只能是 bullish、neutral、bearish；position_range 包含 0 到 100 的整数 min 和 max；"
        "opportunities 和 risks 各 1 到 3 条；watchlist 1 到 5 条，每条包含 name、value、reason。"
    ),
    "en": (
        "You are an equity and macro research assistant. Use only the supplied structured data. "
        "Do not invent news, financial statements, or price targets. Mark missing information explicitly. "
        "Return one JSON object without Markdown fences. The object must contain rating, position_range, "
        "summary, opportunities, risks, watchlist, and disclaimer. Rating must be bullish, neutral, or bearish; "
        "position_range contains integer min and max from 0 to 100; opportunities and risks contain 1 to 3 "
        "items each; watchlist contains 1 to 5 objects with name, value, and reason."
    ),
}
```

Implement the default context loader in the same file:

```python
from ..service import get_macro_snapshot
from ..stocks import get_stock_snapshot


def load_analysis_context(ticker: str) -> dict:
    normalized = ticker.strip().upper()
    stock_snapshot = get_stock_snapshot()
    stock = next(
        (item for item in stock_snapshot.get("stocks", []) if str(item.get("ticker", "")).upper() == normalized),
        None,
    )
    if stock is None:
        raise ValueError("stock_not_found")
    macro = get_macro_snapshot()
    scores = macro.get("scores", {})
    series = [
        {
            "key": item.get("key"),
            "group": item.get("group"),
            "value": item.get("latest_value"),
            "unit": item.get("unit"),
            "score": item.get("score"),
        }
        for item in macro.get("series", [])[:13]
    ]
    return {
        "stock": {
            key: stock.get(key)
            for key in (
                "ticker", "name", "exchange", "sector", "currency", "price", "chg",
                "score", "pe", "growth", "rsi", "beta", "trend", "liquidity", "source",
            )
        },
        "macro": {
            "cycle": scores.get("cycle"),
            "economic_climate": scores.get("economic_climate"),
            "liquidity": scores.get("liquidity"),
            "inflation": scores.get("inflation"),
            "external_pressure": scores.get("external_pressure"),
            "series": series,
            "source": macro.get("source"),
        },
        "data_as_of": max(
            str(stock_snapshot.get("updated_at") or ""),
            str(macro.get("updated_at") or ""),
        ),
    }
```

The fingerprint remains non-secret, and the application-owned disclaimer replaces model text before caching.

The default context loader must:

- call `get_stock_snapshot()` and find the exact ticker;
- call `get_macro_snapshot()`;
- map no more than 13 macro series;
- raise `ValueError("stock_not_found")` when absent;
- avoid forcing provider refreshes.

- [ ] **Step 4: Run service tests to verify GREEN**

Run `.venv/bin/pytest tests/test_ai_service.py -q`.

Expected: cache, language, refresh-preservation, and secret-absence tests pass.

- [ ] **Step 5: Write protected-route failing tests**

Create `backend/tests/test_ai_routes.py` using `fastapi.testclient.TestClient` and dependency overrides. Assert:

- status returns only masked configuration;
- test/save reject a missing or wrong `X-AI-Admin-Password` with `401`;
- analysis read/generation reject a missing or wrong `X-AI-Analysis-Password` with `401`;
- no configured provider returns `409 ai_not_configured`;
- upstream errors map to the specified 429/502/504 statuses;
- successful save never returns the key;
- successful analysis returns `ticker`, `lang`, metadata, and validated `analysis`.

Use literal passwords `admin-test` and `analysis-test` only inside tests.

- [ ] **Step 6: Implement router and dependency providers**

Create `backend/app/ai/routes.py` with Pydantic request models and FastAPI dependencies:

```python
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from ..config import (
    AI_ADMIN_PASSWORD,
    AI_ANALYSIS_CACHE_DIR,
    AI_ANALYSIS_PASSWORD,
    AI_CONFIG_PATH,
)
from .cache import AiAnalysisCache
from .client import AiUpstreamError, OpenAiCompatibleClient
from .config_store import AiConfigStore, verify_secret
from .models import AiConfigInput
from .service import AiAnalysisService, load_analysis_context


router = APIRouter(prefix="/api/ai", tags=["ai"])


class AnalyzeRequest(BaseModel):
    ticker: str
    lang: Literal["zh", "en"] = "zh"
    force: bool = False


def get_ai_store():
    return AiConfigStore(AI_CONFIG_PATH)


def get_ai_client():
    return OpenAiCompatibleClient()


def get_ai_service(store=Depends(get_ai_store), client=Depends(get_ai_client)):
    return AiAnalysisService(
        store,
        AiAnalysisCache(AI_ANALYSIS_CACHE_DIR),
        client,
        load_analysis_context,
    )

def require_admin_password(x_ai_admin_password: str | None = Header(default=None)):
    if not verify_secret(x_ai_admin_password, AI_ADMIN_PASSWORD):
        raise HTTPException(401, detail={"code": "invalid_admin_password"})

def require_analysis_password(x_ai_analysis_password: str | None = Header(default=None)):
    if not verify_secret(x_ai_analysis_password, AI_ANALYSIS_PASSWORD):
        raise HTTPException(401, detail={"code": "invalid_analysis_password"})

@router.get("/config/status")
def config_status(store=Depends(get_ai_store)):
    return store.status()

@router.post("/config/test", dependencies=[Depends(require_admin_password)])
def test_config(candidate: AiConfigInput, store=Depends(get_ai_store), client=Depends(get_ai_client)):
    try:
        config = store.resolve(candidate)
        latency_ms = client.test_connection(config)
        return {"ok": True, "model": config.model, "latency_ms": latency_ms}
    except ValueError as error:
        raise HTTPException(422, detail={"code": "invalid_ai_config"}) from error
    except AiUpstreamError as error:
        raise HTTPException(error.status_code, detail={"code": error.code, "retry_after": error.retry_after}) from error

@router.put("/config", dependencies=[Depends(require_admin_password)])
def save_config(candidate: AiConfigInput, store=Depends(get_ai_store)):
    try:
        store.save(candidate)
        return store.status()
    except ValueError as error:
        raise HTTPException(422, detail={"code": "invalid_ai_config"}) from error

@router.post("/analyze", dependencies=[Depends(require_analysis_password)])
def analyze(request: AnalyzeRequest, service=Depends(get_ai_service)):
    try:
        return service.analyze(request.ticker, request.lang, request.force)
    except RuntimeError as error:
        if str(error) == "ai_not_configured":
            raise HTTPException(409, detail={"code": "ai_not_configured"}) from error
        raise
    except ValueError as error:
        raise HTTPException(422, detail={"code": str(error)}) from error
    except AiUpstreamError as error:
        raise HTTPException(error.status_code, detail={"code": error.code, "retry_after": error.retry_after}) from error

@router.get("/analysis/{ticker}", dependencies=[Depends(require_analysis_password)])
def cached_analysis(ticker: str, lang: Literal["zh", "en"] = "zh", service=Depends(get_ai_service)):
    try:
        result = service.get_cached(ticker, lang)
    except RuntimeError as error:
        if str(error) == "ai_not_configured":
            raise HTTPException(409, detail={"code": "ai_not_configured"}) from error
        raise
    if result is None:
        raise HTTPException(404, detail={"code": "analysis_not_found"})
    return result
```

Map `AiUpstreamError.code` to its stored status code and return only `{ "code": error.code, "retry_after": error.retry_after }`. Map validation and stock lookup failures to `422`. Instantiate default dependencies from `AI_CONFIG_PATH` and `AI_ANALYSIS_CACHE_DIR` through small overridable provider functions.

Modify `backend/app/main.py`:

```python
from .ai.routes import router as ai_router

app.include_router(ai_router)
```

- [ ] **Step 7: Run all backend tests**

Run:

```bash
cd backend
.venv/bin/pytest -q
```

Expected: all AI configuration, client, service, and route tests pass without live provider calls.

- [ ] **Step 8: Commit Task 3**

```bash
git add backend/app/ai backend/app/main.py backend/tests/test_ai_service.py backend/tests/test_ai_routes.py
git commit -m "feat: expose protected AI analysis API"
```

---

### Task 4: Frontend AI API client and state reducer

**Files:**
- Create: `frontend/src/api/ai.js`
- Create: `frontend/src/utils/aiAnalysis.js`
- Create: `frontend/src/utils/aiAnalysis.test.js`
- Create: `frontend/src/hooks/useAiAnalysis.js`

**Interfaces:**
- Consumes: `API_BASE_URL` and backend `/api/ai/*` schemas.
- Produces: `getAiConfigStatus`, `testAiConfig`, `saveAiConfig`, `getCachedAiAnalysis`, `requestAiAnalysis`, `aiAnalysisReducer`, and `useAiAnalysis`.

- [ ] **Step 1: Write failing reducer/error tests**

Create `frontend/src/utils/aiAnalysis.test.js`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";

import { aiAnalysisReducer, initialAiAnalysisState, normalizeAiError } from "./aiAnalysis.js";

test("loading preserves a cached result during refresh", () => {
  const cached = { ticker: "600519", cached: true, analysis: { rating: "neutral" } };
  const state = aiAnalysisReducer({ ...initialAiAnalysisState, result: cached }, { type: "loading" });
  assert.equal(state.status, "loading");
  assert.equal(state.result, cached);
});

test("unauthorized clears the in-memory analysis password flag", () => {
  const state = aiAnalysisReducer(initialAiAnalysisState, { type: "error", error: { code: "invalid_analysis_password" } });
  assert.equal(state.needsPassword, true);
});

test("normalizes nested FastAPI error codes", () => {
  assert.deepEqual(normalizeAiError(401, { detail: { code: "invalid_analysis_password" } }), {
    status: 401,
    code: "invalid_analysis_password",
    retryAfter: null,
  });
});
```

- [ ] **Step 2: Run frontend tests to verify RED**

Run `npm test` from `frontend`.

Expected: module-not-found failure for `aiAnalysis.js`.

- [ ] **Step 3: Implement API functions and reducer**

Create `frontend/src/api/ai.js` with this shared JSON request helper. Never log headers or request bodies:

```javascript
import { API_BASE_URL } from "../config.js";


async function aiRequest(path, { method = "GET", body, adminPassword, analysisPassword, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (adminPassword) headers["X-AI-Admin-Password"] = adminPassword;
  if (analysisPassword) headers["X-AI-Analysis-Password"] = analysisPassword;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const normalized = normalizeAiError(response.status, payload);
    const error = new Error(normalized.code);
    Object.assign(error, normalized);
    throw error;
  }
  return payload;
}
```

Export:

```javascript
export const getAiConfigStatus = () => aiRequest("/api/ai/config/status");
export const testAiConfig = (config, adminPassword) => aiRequest("/api/ai/config/test", { method: "POST", body: config, adminPassword });
export const saveAiConfig = (config, adminPassword) => aiRequest("/api/ai/config", { method: "PUT", body: config, adminPassword });
export const getCachedAiAnalysis = (ticker, lang, analysisPassword, signal) => aiRequest(`/api/ai/analysis/${encodeURIComponent(ticker)}?lang=${lang}`, { analysisPassword, signal });
export const requestAiAnalysis = (ticker, lang, force, analysisPassword, signal) => aiRequest("/api/ai/analyze", { method: "POST", body: { ticker, lang, force }, analysisPassword, signal });
```

Import `normalizeAiError` from `frontend/src/utils/aiAnalysis.js`, then export the five endpoint functions shown above.

Create `frontend/src/utils/aiAnalysis.js`:

```javascript
export const initialAiAnalysisState = {
  status: "idle",
  result: null,
  error: null,
  needsPassword: false,
};

export function normalizeAiError(status, payload = {}) {
  const detail = payload.detail ?? payload;
  return {
    status,
    code: detail.code ?? "generic",
    retryAfter: detail.retry_after ?? null,
  };
}

export function aiAnalysisReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialAiAnalysisState;
    case "password-required":
      return { ...state, status: "idle", needsPassword: true };
    case "loading":
      return { ...state, status: "loading", error: null, needsPassword: false };
    case "success":
      return { status: "ready", result: action.result, error: null, needsPassword: false };
    case "error":
      return {
        ...state,
        status: "error",
        error: action.error,
        needsPassword: action.error.code === "invalid_analysis_password",
      };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Implement the analysis hook**

Create `frontend/src/hooks/useAiAnalysis.js`:

```javascript
export function useAiAnalysis({ ticker, lang, analysisPassword }) {
  const [state, dispatch] = useReducer(aiAnalysisReducer, initialAiAnalysisState);
  const controllerRef = useRef(null);

  const run = useCallback(async ({ force = false } = {}) => {
    if (!analysisPassword) {
      dispatch({ type: "password-required" });
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: "loading" });
    try {
      const result = force
        ? await requestAiAnalysis(ticker, lang, true, analysisPassword, controller.signal)
        : await getCachedAiAnalysis(ticker, lang, analysisPassword, controller.signal).catch((error) => {
            if (error.status === 404) return requestAiAnalysis(ticker, lang, false, analysisPassword, controller.signal);
            throw error;
          });
      dispatch({ type: "success", result });
    } catch (error) {
      if (error.name !== "AbortError") dispatch({ type: "error", error });
    }
  }, [analysisPassword, lang, ticker]);

  useEffect(() => () => controllerRef.current?.abort(), []);
  return { ...state, run };
}
```

Reset visible analysis when ticker or language changes, and ignore stale responses with abort signals.

- [ ] **Step 5: Run frontend tests to verify GREEN**

Run `npm test` from `frontend`.

Expected: existing macro tests and new AI reducer tests pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add frontend/src/api/ai.js frontend/src/utils/aiAnalysis.js frontend/src/utils/aiAnalysis.test.js frontend/src/hooks/useAiAnalysis.js
git commit -m "feat: add frontend AI analysis state"
```

---

### Task 5: Settings dialog, analysis panel, App integration, and responsive styles

**Files:**
- Create: `frontend/src/components/AiSettingsDialog.jsx`
- Create: `frontend/src/components/AiAnalysisPanel.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/i18n/copy.js`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes: Task 4 API client/hook and current `selectedStock`, `lang`, and translation object.
- Produces: administrator settings workflow, analysis-password prompt, selected-stock AI action/result panel.

- [ ] **Step 1: Add complete localized copy**

Add an `ai` object under both languages in `copy.js` with keys:

```javascript
ai: {
  settings: "AI Settings",
  analysis: "AI Analysis",
  baseUrl: "Base URL",
  model: "Model",
  apiKey: "API Key",
  adminPassword: "Administrator password",
  analysisPassword: "Analysis password",
  testConnection: "Test connection",
  save: "Save configuration",
  analyze: "Analyze selected stock",
  refresh: "Regenerate analysis",
  bullish: "Bullish",
  neutral: "Neutral",
  bearish: "Bearish",
  position: "Suggested position",
  summary: "Research summary",
  opportunities: "Core opportunities",
  risks: "Primary risks",
  watchlist: "Watch indicators",
  cached: "Cached",
  generated: "Generated",
  disclaimer: "For research reference only; not investment advice.",
  errors: {
    ai_not_configured: "Configure an AI provider before running analysis.",
    invalid_admin_password: "The administrator password is incorrect.",
    invalid_analysis_password: "The analysis password is incorrect.",
    upstream_auth_failed: "The provider rejected the API key.",
    upstream_rate_limited: "The provider rate limit was reached. Try again later.",
    upstream_timeout: "The AI provider timed out.",
    invalid_ai_response: "The AI response could not be validated.",
    stock_not_found: "The selected stock is unavailable to the backend.",
    generic: "AI analysis is temporarily unavailable."
  }
}
```

The Chinese `errors` object must use these exact strings:

```javascript
errors: {
  ai_not_configured: "请先配置 AI 服务后再运行分析。",
  invalid_admin_password: "管理员密码错误。",
  invalid_analysis_password: "分析口令错误。",
  upstream_auth_failed: "AI 服务拒绝了当前 API Key。",
  upstream_rate_limited: "AI 服务请求过于频繁，请稍后重试。",
  upstream_timeout: "AI 服务响应超时。",
  invalid_ai_response: "AI 返回结果无法通过格式校验。",
  stock_not_found: "后台没有找到当前股票。",
  generic: "AI 分析暂时不可用。"
}
```

- [ ] **Step 2: Implement the settings dialog**

`AiSettingsDialog` props:

```javascript
{
  open,
  onClose,
  t,
  onSaved,
}
```

On open, call `getAiConfigStatus()`. Keep `adminPassword` and `apiKey` in component state; clear them in both `onClose` and unmount cleanup. Use `role="dialog"`, `aria-modal="true"`, explicit labels, Escape handling, a disabled state during requests, and sanitized localized error text. “Test connection” does not save. “Save configuration” calls `saveAiConfig`, then refreshes masked status and invokes `onSaved`.

- [ ] **Step 3: Implement the analysis panel**

`AiAnalysisPanel` props:

```javascript
{
  t,
  ticker,
  status,
  result,
  error,
  needsPassword,
  onAnalyze,
  onRefresh,
  onSubmitPassword,
  onOpenSettings,
}
```

Render no invented values. Rating classes must be `ai-rating bullish|neutral|bearish`. Format the position as `min%–max%`. Render opportunities, risks, and watchlist with stable keys. Always render the application-owned disclaimer from `t.ai.disclaimer`, not only the model-provided disclaimer.

- [ ] **Step 4: Integrate App state and controls**

In `App.jsx`:

- make the settings icon a unique button with `aria-label={t.ai.settings}`;
- add `showAiSettings`, `showAnalysisPassword`, and `analysisPassword` state;
- clear `analysisPassword` only on full component unmount or a `401 invalid_analysis_password` response;
- instantiate `useAiAnalysis({ ticker: selectedStock.ticker, lang, analysisPassword })`;
- place “AI Analysis” beside the selected-stock heading;
- expand `AiAnalysisPanel` below the selected-stock metric cards;
- open the password prompt before the first request;
- open settings directly on `ai_not_configured`;
- mount `AiSettingsDialog` once at the App root.

Do not couple AI state to `stockQuery` or `macroQuery`.

- [ ] **Step 5: Add terminal-style and responsive CSS**

Add focused classes:

```css
.ai-settings-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; }
.ai-settings-dialog { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; }
.ai-analysis-panel { display: grid; gap: 14px; }
.ai-analysis-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ai-rating.bullish { color: #39e6c2; }
.ai-rating.neutral { color: #f2c76e; }
.ai-rating.bearish { color: #ff7d87; }
```

At `max-width: 760px`, set `.ai-analysis-grid { grid-template-columns: 1fr; }`, make dialog actions stack, and verify no horizontal overflow at 390 px.

- [ ] **Step 6: Run automated frontend checks**

Run:

```bash
cd frontend
npm test
VITE_API_BASE_URL=/stock-macro npm run build -- --base=/stock-macro/
```

Expected: all Node tests pass and Vite builds production assets successfully.

- [ ] **Step 7: Run browser interaction verification**

Start the backend with test-only environment values and a local mock OpenAI-compatible HTTP endpoint. Start Vite and open the preview in the in-app browser. Verify:

- settings opens from the gear button;
- wrong administrator password displays a sanitized error;
- connection test and save display success without exposing the API key;
- first analysis prompts for the independent analysis password;
- wrong analysis password clears the in-memory value and prompts again;
- successful analysis renders every structured section;
- selecting another ticker does not show the previous ticker’s response;
- cached result opens without a second mock-provider call;
- regenerate makes exactly one additional provider call;
- Chinese and English copy;
- desktop and 390 px layouts remain within their panels.

- [ ] **Step 8: Commit Task 5**

```bash
git add frontend/src/components/AiSettingsDialog.jsx frontend/src/components/AiAnalysisPanel.jsx frontend/src/App.jsx frontend/src/i18n/copy.js frontend/src/styles.css
git commit -m "feat: add AI settings and stock analysis UI"
```

---

### Task 6: Documentation, deployment, and production regression

**Files:**
- Modify: `backend/README.md`
- Modify: `README.md`
- Server-only: `/etc/systemd/system/stock-macro-terminal.service.d/ai.conf`
- Server-only: `/var/lib/stock-macro-terminal/ai_config.json`

**Interfaces:**
- Consumes: all backend endpoints and frontend production build.
- Produces: documented local setup and a production deployment under `/stock-macro/` without old-route changes.

- [ ] **Step 1: Document environment and endpoints**

Document these variables without real values:

```text
AI_ADMIN_PASSWORD=<administrator configuration password>
AI_ANALYSIS_PASSWORD=<separate analysis access password>
AI_CONFIG_PATH=/var/lib/stock-macro-terminal/ai_config.json
AI_ANALYSIS_CACHE_DIR=/var/lib/stock-macro-terminal/analysis-cache
```

Document all five AI endpoints, the separate password roles, filesystem permissions, OpenAI-compatible URL format, and the fact that the API key is not stored in Git.

- [ ] **Step 2: Run full local verification**

Run:

```bash
cd backend
.venv/bin/pytest -q
cd ../frontend
npm test
VITE_API_BASE_URL=/stock-macro npm run build -- --base=/stock-macro/
cd ..
git diff --check
```

Expected: zero failed tests, successful production build, and no whitespace errors.

- [ ] **Step 3: Commit documentation**

```bash
git add README.md backend/README.md
git commit -m "docs: document AI analysis configuration"
```

- [ ] **Step 4: Prepare production secrets without placing them in commands or Git**

Create `/etc/systemd/system/stock-macro-terminal.service.d/ai.conf` interactively on the server with mode `0600`, containing the three environment variables. Create `/var/lib/stock-macro-terminal` owned by `stockmacro:stockmacro` with mode `0700`. Do not echo secret values into task output.

If the user has not supplied administrator and analysis passwords at deployment time, stop before this step and request them. The AI API must remain fail-closed until both are present.

- [ ] **Step 5: Deploy backend and frontend atomically**

- Upload a release archive that excludes `.git`, virtual environments, caches, AI configuration, and secrets.
- Install `backend/requirements.txt` into `/opt/stock-macro-terminal/venv`.
- Extract the application into a versioned release directory.
- Preserve `/var/lib/stock-macro-terminal` across releases.
- Switch the `current` symlink only after backend import, backend tests, and frontend asset checks succeed.
- Run `systemctl daemon-reload`, restart only `stock-macro-terminal.service`, and run `nginx -t` without changing the old application configuration.

- [ ] **Step 6: Verify production**

Verify:

```text
GET  /stock-macro/                              -> 200
GET  /stock-macro/health                        -> 200
GET  /stock-macro/api/ai/config/status          -> 200 with no secret
POST /stock-macro/api/ai/config/test             -> 401 without admin password
PUT  /stock-macro/api/ai/config                  -> 401 without admin password
POST /stock-macro/api/ai/analyze                 -> 401 without analysis password
GET  /stock-macro/api/ai/analysis/600519?lang=zh -> 401 without analysis password
GET  /                                            -> 200
GET  /api/health                                  -> 200
```

After the administrator configures a real provider through the UI, test one saved configuration, one analysis, one cache hit, and one forced refresh. Confirm the API key is absent from responses, service logs, browser storage, and deployed static files.
