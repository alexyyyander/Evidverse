import pytest

from app.services.generation_service import GenerationService
import app.services.generation_service as generation_service_module


class _DummyLLMClientOK:
    def __init__(self, provider=None):
        self.provider = provider

    async def generate_script(self, topic: str) -> str:
        return '[{"scene_number":1,"visual_description":"v","narration":"n"}]'


class _DummyLLMClientFail:
    def __init__(self, provider=None):
        self.provider = provider

    async def generate_script(self, topic: str) -> str:
        raise RuntimeError("local provider down")


class _DummyAdapter:
    @staticmethod
    async def generate_script(topic: str) -> str:
        return '[{"scene_number":1,"visual_description":"adapter","narration":"auto"}]'


@pytest.mark.anyio
async def test_generate_script_provider_hint_success(monkeypatch):
    monkeypatch.setattr(generation_service_module, "LocalLLMClient", _DummyLLMClientOK)
    monkeypatch.setattr(generation_service_module.settings, "FALLBACK_TO_CLOUD", True)

    async def _cloud_not_used(topic: str) -> str:
        return '[{"scene_number":1,"visual_description":"cloud","narration":"cloud"}]'

    monkeypatch.setattr(generation_service_module.cloud_adapter, "generate_script", _cloud_not_used)

    out = await GenerationService.generate_script("topic", options={"llm_provider": "vllm"})
    assert isinstance(out["storyboard"], list)
    assert out["meta"]["requested_provider"] == "vllm"
    assert out["meta"]["resolved_provider"] == "vllm"
    assert out["meta"]["fallback_used"] is False


@pytest.mark.anyio
async def test_generate_script_provider_hint_fallback_to_cloud(monkeypatch):
    monkeypatch.setattr(generation_service_module, "LocalLLMClient", _DummyLLMClientFail)
    monkeypatch.setattr(generation_service_module.settings, "FALLBACK_TO_CLOUD", True)

    async def _cloud(topic: str) -> str:
        return '[{"scene_number":1,"visual_description":"cloud","narration":"fallback"}]'

    monkeypatch.setattr(generation_service_module.cloud_adapter, "generate_script", _cloud)

    out = await GenerationService.generate_script("topic", options={"llm_provider": "sglang"})
    assert isinstance(out["storyboard"], list)
    assert out["meta"]["resolved_provider"] == "cloud"
    assert out["meta"]["fallback_used"] is True
    assert isinstance(out["meta"]["warnings"], list)
    assert len(out["meta"]["warnings"]) > 0


@pytest.mark.anyio
async def test_generate_script_provider_hint_openai_compatible_success(monkeypatch):
    monkeypatch.setattr(generation_service_module, "LocalLLMClient", _DummyLLMClientOK)

    out = await GenerationService.generate_script("topic", options={"llm_provider": "openai_compatible"})
    assert isinstance(out["storyboard"], list)
    assert out["meta"]["requested_provider"] == "openai_compatible"
    assert out["meta"]["resolved_provider"] == "openai_compatible"
    assert out["meta"]["fallback_used"] is False
    assert out["meta"]["warnings"] == []


@pytest.mark.anyio
async def test_generate_script_auto_resolves_to_configured_local_provider(monkeypatch):
    monkeypatch.setattr(generation_service_module, "unified_adapter", _DummyAdapter())
    monkeypatch.setattr(generation_service_module.settings, "USE_LOCAL_MODELS", True)
    monkeypatch.setattr(generation_service_module.settings, "LOCAL_LLM_PROVIDER", "sglang")

    out = await GenerationService.generate_script("topic", options={"llm_provider": "auto"})
    assert isinstance(out["storyboard"], list)
    assert out["meta"]["requested_provider"] == "auto"
    assert out["meta"]["resolved_provider"] == "sglang"
    assert out["meta"]["fallback_used"] is False
    assert out["meta"]["warnings"] == []


@pytest.mark.anyio
async def test_generate_script_unknown_provider_falls_back_to_auto(monkeypatch):
    monkeypatch.setattr(generation_service_module, "unified_adapter", _DummyAdapter())
    monkeypatch.setattr(generation_service_module.settings, "USE_LOCAL_MODELS", True)
    monkeypatch.setattr(generation_service_module.settings, "LOCAL_LLM_PROVIDER", "vllm")

    out = await GenerationService.generate_script("topic", options={"llm_provider": "custom_provider"})
    assert isinstance(out["storyboard"], list)
    assert out["meta"]["requested_provider"] == "auto"
    assert out["meta"]["resolved_provider"] == "vllm"
    assert out["meta"]["fallback_used"] is False
    assert isinstance(out["meta"]["warnings"], list)
    assert len(out["meta"]["warnings"]) > 0
    assert "custom_provider" in out["meta"]["warnings"][0]


def test_compose_story_prompt_includes_structured_hints():
    prompt = GenerationService._compose_story_prompt(
        "topic",
        {
            "stage": "step2_outline",
            "story_mode": "edit",
            "story_style": "series",
            "tone": "serious",
            "script_mode": "strict_screenplay",
            "segment_length": "medium",
            "character_seed": [{"name": "hero"}],
            "existing_outline": {"summary": "old"},
        },
    )
    assert "[STORY_HINTS]" in prompt
    assert "stage: step2_outline" in prompt
    assert "story_mode: edit" in prompt
    assert "story_style: series" in prompt
    assert "tone: serious" in prompt
    assert "script_mode: strict_screenplay" in prompt
    assert "segment_length: medium" in prompt
    assert "character_seed:" in prompt
    assert "existing_outline:" in prompt
