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
