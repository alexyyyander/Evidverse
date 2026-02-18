import pytest
import importlib


class _DummyResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"bad status: {self.status_code}")

    def json(self) -> dict:
        return self._payload


class _DummyAsyncClient:
    def __init__(self, *args, timeout=None, **kwargs):
        self.timeout = timeout
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, url, json=None, headers=None):
        self.calls.append(("post", url, json, headers))
        if url.endswith("/api/chat"):
            return _DummyResponse(200, {"message": {"content": "ollama_ok"}})
        if url.endswith("/v1/chat/completions"):
            return _DummyResponse(200, {"choices": [{"message": {"content": "openai_ok"}}]})
        return _DummyResponse(404, {})

    async def get(self, url, headers=None):
        self.calls.append(("get", url, None, headers))
        if url.endswith("/api/tags"):
            return _DummyResponse(200, {"models": [{"name": "qwen3:8b"}]})
        if url.endswith("/v1/models"):
            return _DummyResponse(200, {"data": [{"id": "Qwen/Qwen3-8B"}]})
        return _DummyResponse(404, {})


@pytest.mark.anyio
async def test_local_llm_client_ollama(monkeypatch):
    from ai_engine.local.llm_client import LocalLLMClient
    llm_module = importlib.import_module("ai_engine.local.llm_client")

    monkeypatch.setattr(llm_module.httpx, "AsyncClient", _DummyAsyncClient)

    client = LocalLLMClient(provider="ollama", host="http://ollama.local:11434", model="qwen3:8b", timeout=10)
    out = await client.generate("hi")
    assert out == "ollama_ok"

    ok = await client.check_health()
    assert ok is True

    models = await client.list_models()
    assert "qwen3:8b" in models


@pytest.mark.anyio
async def test_local_llm_client_openai_compatible(monkeypatch):
    from ai_engine.local.llm_client import LocalLLMClient
    llm_module = importlib.import_module("ai_engine.local.llm_client")

    monkeypatch.setattr(llm_module.httpx, "AsyncClient", _DummyAsyncClient)

    client = LocalLLMClient(
        provider="vllm",
        openai_base_url="http://vllm.local:8001",
        openai_api_key="",
        model="Qwen/Qwen3-8B",
        timeout=10,
    )
    out = await client.generate("hi")
    assert out == "openai_ok"

    ok = await client.check_health()
    assert ok is True

    models = await client.list_models()
    assert "Qwen/Qwen3-8B" in models
