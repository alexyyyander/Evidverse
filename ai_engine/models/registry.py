from typing import Dict, Optional, List
from .config import ModelInfo, MODEL_REGISTRY, settings


def list_models() -> Dict[str, ModelInfo]:
    """List all available models"""
    return MODEL_REGISTRY


def list_models_by_capability(capability: str) -> List[ModelInfo]:
    """List models that support a specific capability"""
    return [
        model for model in MODEL_REGISTRY.values()
        if capability in model.capabilities
    ]


def list_models_by_provider(provider: str) -> List[ModelInfo]:
    """List models from a specific provider"""
    return [
        model for model in MODEL_REGISTRY.values()
        if model.provider == provider
    ]


def get_model(model_name: str) -> Optional[ModelInfo]:
    """Get a specific model by name"""
    return MODEL_REGISTRY.get(model_name)


def get_default_llm() -> ModelInfo:
    """Get the default LLM model"""
    return MODEL_REGISTRY[settings.OLLAMA_MODEL]


def get_default_image_model() -> ModelInfo:
    """Get the default image model"""
    return MODEL_REGISTRY[settings.IMAGE_MODEL]


def get_default_video_model() -> ModelInfo:
    """Get the default video model"""
    return MODEL_REGISTRY["ltx-2-19b-distilled"]
