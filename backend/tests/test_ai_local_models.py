import pytest


@pytest.mark.anyio
async def test_health_ai_endpoint_returns_payload(client, monkeypatch):
    from app.services import generation_service as generation_service_module

    class DummyAdapter:
        async def health_check(self):
            return {
                "use_local": True,
                "fallback_to_cloud": True,
                "active_adapter": "local",
                "local": {"llm": True, "image": True, "video": True},
                "cloud": {"llm": True, "image": True, "video": True},
            }

    monkeypatch.setattr(generation_service_module, "unified_adapter", DummyAdapter())

    resp = await client.get("/api/v1/health/ai")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"use_local", "fallback_to_cloud", "active_adapter", "local", "cloud"}


@pytest.mark.anyio
async def test_unified_adapter_falls_back_to_cloud(monkeypatch):
    from ai_engine.adapters import adapter
    from ai_engine.models.config import settings

    monkeypatch.setattr(settings, "USE_LOCAL_MODELS", True)
    monkeypatch.setattr(settings, "FALLBACK_TO_CLOUD", True)

    calls = {"local": 0, "cloud": 0}

    async def local_generate_image(*args, **kwargs):
        calls["local"] += 1
        raise RuntimeError("local down")

    async def cloud_generate_image(*args, **kwargs):
        calls["cloud"] += 1
        return b"ok"

    monkeypatch.setattr(adapter.local, "generate_image", local_generate_image)
    monkeypatch.setattr(adapter.cloud, "generate_image", cloud_generate_image)

    result = await adapter.generate_image(prompt="x")
    assert result == b"ok"
    assert calls["local"] == 1
    assert calls["cloud"] == 1

