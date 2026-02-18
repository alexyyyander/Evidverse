from typing import Optional, Dict, Any

from .base import GenerationAdapter
from .local_adapter import local_adapter
from .cloud_adapter import cloud_adapter
from ai_engine.models.config import settings


class UnifiedAdapter(GenerationAdapter):
    """
    Unified adapter that delegates to local or cloud based on configuration.
    
    This is the main entry point for all generation operations.
    It automatically selects between local and cloud providers based on:
    1. USE_LOCAL_MODELS setting
    2. FALLBACK_TO_CLOUD setting
    3. Health status of local services
    """

    def __init__(self):
        self.local = local_adapter
        self.cloud = cloud_adapter

    async def generate_script(self, topic: str) -> str:
        """Generate script using configured adapter"""
        if not settings.USE_LOCAL_MODELS:
            return await self.cloud.generate_script(topic)

        try:
            return await self.local.generate_script(topic)
        except Exception:
            if settings.FALLBACK_TO_CLOUD:
                return await self.cloud.generate_script(topic)
            raise

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
    ) -> bytes:
        """Generate image using configured adapter"""
        if not settings.USE_LOCAL_MODELS:
            return await self.cloud.generate_image(prompt, negative_prompt, width, height)

        try:
            return await self.local.generate_image(prompt, negative_prompt, width, height)
        except Exception:
            if settings.FALLBACK_TO_CLOUD:
                return await self.cloud.generate_image(prompt, negative_prompt, width, height)
            raise

    async def generate_image_to_image(
        self,
        prompt: str,
        input_image: bytes,
        strength: float = 0.7,
    ) -> bytes:
        """Generate image to image using configured adapter"""
        if not settings.USE_LOCAL_MODELS:
            return await self.cloud.generate_image_to_image(prompt, input_image, strength)

        try:
            return await self.local.generate_image_to_image(prompt, input_image, strength)
        except Exception:
            if settings.FALLBACK_TO_CLOUD:
                return await self.cloud.generate_image_to_image(prompt, input_image, strength)
            raise

    async def generate_video(
        self,
        prompt: str,
        input_image: Optional[bytes] = None,
        num_frames: int = 81,
        fps: int = 24,
    ) -> bytes:
        """Generate video using configured adapter"""
        if not settings.USE_LOCAL_MODELS:
            return await self.cloud.generate_video(prompt, input_image, num_frames, fps)

        try:
            return await self.local.generate_video(prompt, input_image, num_frames, fps)
        except Exception:
            if settings.FALLBACK_TO_CLOUD:
                return await self.cloud.generate_video(prompt, input_image, num_frames, fps)
            raise

    async def health_check(self) -> Dict[str, Any]:
        """Check health of all services"""
        result = {
            "use_local": settings.USE_LOCAL_MODELS,
            "fallback_to_cloud": settings.FALLBACK_TO_CLOUD,
            "active_adapter": None,
            "local": {},
            "cloud": {},
        }

        local_healthy = False
        try:
            result["local"] = await self.local.health_check()
            local_healthy = all(result["local"].values()) if isinstance(result["local"], dict) else False
        except Exception as e:
            result["local"] = {"error": str(e)}

        try:
            result["cloud"] = await self.cloud.health_check()
        except Exception as e:
            result["cloud"] = {"error": str(e)}

        if settings.USE_LOCAL_MODELS and local_healthy:
            result["active_adapter"] = "local"
        else:
            result["active_adapter"] = "cloud"

        return result


adapter = UnifiedAdapter()
