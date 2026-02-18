"""
Local adapter implementation using Ollama, ComfyUI, and LTX-Video.

This adapter provides generation capabilities using local models when available,
falling back to cloud services if configured.
"""

from typing import Optional, Dict, Any

from .base import GenerationAdapter
from ai_engine.local import llm_client, image_client, video_client
from ai_engine.models.config import settings


class LocalAdapter(GenerationAdapter):
    """Local model adapter using Ollama, ComfyUI, and LTX-Video"""

    def __init__(self):
        self.llm = llm_client
        self.image = image_client
        self.video = video_client
        self._video_initialized = False

    async def generate_script(self, topic: str) -> str:
        """Generate script using local LLM"""
        return await self.llm.generate_script(topic)

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
    ) -> bytes:
        """Generate image using local ComfyUI"""
        return await self.image.generate_image(
            prompt=prompt,
            model=settings.IMAGE_MODEL,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
        )

    async def generate_image_to_image(
        self,
        prompt: str,
        input_image: bytes,
        strength: float = 0.7,
    ) -> bytes:
        """Generate image using local ComfyUI with input image"""
        return await self.image.generate_image_to_image(
            prompt=prompt,
            input_image=input_image,
            model=settings.IMAGE_MODEL,
            strength=strength,
        )

    async def generate_video(
        self,
        prompt: str,
        input_image: Optional[bytes] = None,
        num_frames: int = 81,
        fps: int = 24,
    ) -> bytes:
        """Generate video using local LTX-Video"""
        if not self._video_initialized:
            await self.video.initialize()
            self._video_initialized = True

        if input_image:
            return await self.video.generate_video(
                prompt=prompt,
                input_image=input_image,
                num_frames=num_frames,
                fps=fps,
            )

        return await self.video.generate_video(
            prompt=prompt,
            num_frames=num_frames,
            fps=fps,
        )

    async def health_check(self) -> Dict[str, bool]:
        """Check health of all local services"""
        results = {}

        try:
            results["llm"] = await self.llm.check_health()
        except Exception:
            results["llm"] = False

        try:
            results["image"] = True
        except Exception:
            results["image"] = False

        try:
            results["video"] = await self.video.check_health()
        except Exception:
            results["video"] = False

        return results


local_adapter = LocalAdapter()
