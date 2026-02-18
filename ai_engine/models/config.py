from pathlib import Path
from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class LocalModelSettings(BaseSettings):
    # Master toggle
    USE_LOCAL_MODELS: bool = False
    FALLBACK_TO_CLOUD: bool = True

    # Model storage path
    MODEL_STORAGE_PATH: str = "~/ai_models"

    # Local LLM provider (user-managed deployment)
    LOCAL_LLM_PROVIDER: Literal["ollama", "vllm", "sglang", "openai_compatible"] = "ollama"

    # OpenAI-compatible local LLM servers (vLLM / sglang / etc.)
    LLM_OPENAI_BASE_URL: str = "http://localhost:8001"
    LLM_OPENAI_API_KEY: Optional[str] = None
    LLM_OPENAI_MODEL: str = "Qwen/Qwen3-8B"
    LLM_OPENAI_TIMEOUT: int = 120

    # Ollama (LLM) settings
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"
    OLLAMA_TIMEOUT: int = 120

    # ComfyUI (Image) settings
    COMFYUI_HOST: str = "http://localhost:8188"
    COMFYUI_TIMEOUT: int = 300
    IMAGE_MODEL: Literal["flux2-klein-4b", "z-image-turbo"] = "flux2-klein-4b"

    # LTX-Video settings
    LTX_MODEL_PATH: str = "~/ai_models/LTX-Video"
    LTX_MODEL_VARIANT: Literal[
        "ltx-2-19b-dev",
        "ltx-2-19b-dev-fp8",
        "ltx-2-19b-dev-fp4",
        "ltx-2-19b-distilled",
        "ltx-2-19b-distilled-lora-384",
    ] = "ltx-2-19b-distilled"
    LTX_DEVICE: str = "cuda"
    LTX_NUM_FRAMES: int = 81
    LTX_FPS: int = 24

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_prefix="",
        extra="ignore"
    )


class ModelInfo(BaseModel):
    name: str
    provider: str
    endpoint: Optional[str] = None
    model_path: Optional[str] = None
    vram_estimate_gb: float
    description: str
    capabilities: list[str]


# Model registry with all available models
MODEL_REGISTRY: Dict[str, ModelInfo] = {
    # LLM Models
    "qwen3:8b": ModelInfo(
        name="qwen3:8b",
        provider="ollama",
        endpoint="http://localhost:11434",
        vram_estimate_gb=8,
        description="Qwen 3 8B - Efficient LLM for script generation",
        capabilities=["text-generation", "chat"]
    ),
    "llama3.1:8b": ModelInfo(
        name="llama3.1:8b",
        provider="ollama",
        endpoint="http://localhost:11434",
        vram_estimate_gb=8,
        description="Llama 3.1 8B - Alternative LLM",
        capabilities=["text-generation", "chat"]
    ),
    
    # Image Models (ComfyUI)
    "flux2-klein-4b": ModelInfo(
        name="FLUX.2-klein-4B",
        provider="comfyui",
        endpoint="http://localhost:8188",
        vram_estimate_gb=8,
        description="FLUX.2 Klein 4B - Fast text-to-image and image-to-image",
        capabilities=["text-to-image", "image-to-image"]
    ),
    "z-image-turbo": ModelInfo(
        name="Z-Image-Turbo",
        provider="comfyui",
        endpoint="http://localhost:8188",
        vram_estimate_gb=8,
        description="Tongyi-MAI Z-Image-Turbo - Fast text-to-image",
        capabilities=["text-to-image"]
    ),
    
    # Video Models
    "ltx-2-19b-distilled": ModelInfo(
        name="LTX-Video 19B Distilled",
        provider="diffusers",
        model_path="~/ai_models/LTX-Video",
        vram_estimate_gb=12,
        description="LTX-Video distilled - Optimized for 24GB VRAM",
        capabilities=["image-to-video", "text-to-video"]
    ),
}


# Get settings instance
settings = LocalModelSettings()


def get_model_info(model_name: str) -> Optional[ModelInfo]:
    """Get model info from registry"""
    return MODEL_REGISTRY.get(model_name)


def get_active_provider(model_type: str) -> str:
    """Determine which provider to use for a given model type"""
    if settings.USE_LOCAL_MODELS:
        return "local"
    return "cloud"
