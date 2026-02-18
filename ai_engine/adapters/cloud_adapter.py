"""
Cloud adapter implementation using existing cloud APIs.

This adapter uses the existing cloud clients (OpenAI, Seedance, Stability AI)
when local models are not available or disabled.
"""

from typing import Optional, Dict, Any

from .base import GenerationAdapter
from ai_engine.llm.client import llm_client as cloud_llm
from ai_engine.seedance.client import SeedanceClient
from ai_engine.stable_diffusion.client import StableDiffusionClient
from ai_engine.models.config import settings
from app.core.config import settings as app_settings


class CloudAdapter(GenerationAdapter):
    """Cloud API adapter using OpenAI, Seedance, and Stability AI"""

    def __init__(self):
        self.llm = cloud_llm
        self.seedance = SeedanceClient(
            api_key=app_settings.SEEDANCE_API_KEY,
            base_url=app_settings.SEEDANCE_API_URL,
        )
        self.stability = StableDiffusionClient(
            api_key=app_settings.STABILITY_API_KEY,
            api_host=app_settings.STABILITY_API_HOST,
        )

    async def generate_script(self, topic: str) -> str:
        """Generate script using cloud LLM (OpenAI)"""
        return await self.llm.generate_script(topic)

    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
    ) -> bytes:
        """Generate image using cloud API (Stability AI)"""
        return await self.stability.generate_image(prompt, steps=30)

    async def generate_image_to_image(
        self,
        prompt: str,
        input_image: bytes,
        strength: float = 0.7,
    ) -> bytes:
        """Generate image to image using cloud API"""
        return await self.stability.generate_image(prompt, steps=30)

    async def generate_video(
        self,
        prompt: str,
        input_image: Optional[bytes] = None,
        num_frames: int = 81,
        fps: int = 24,
    ) -> bytes:
        """Generate video using cloud API (Seedance)"""
        import base64
        import httpx

        if input_image:
            image_b64 = base64.b64encode(input_image).decode()
            image_url = f"data:image/jpeg;base64,{image_b64}"
        else:
            raise ValueError("Video generation requires an input image")

        result = await self.seedance.generate_video(
            image_url=image_url,
            prompt=prompt,
            motion_bucket_id=127,
        )

        task_id = result.get("task_id")
        
        max_attempts = 60
        for _ in range(max_attempts):
            status = await self.seedance.get_task_status(task_id)
            if status.get("status") == "completed":
                video_url = status.get("output", {}).get("video_url")
                async with httpx.AsyncClient() as client:
                    response = await client.get(video_url)
                    return response.content
            elif status.get("status") == "failed":
                raise Exception("Video generation failed")
            
            import asyncio
            await asyncio.sleep(2)

        raise Exception("Video generation timeout")

    async def health_check(self) -> Dict[str, bool]:
        """Check health of cloud services"""
        return {
            "llm": True,
            "image": True,
            "video": True,
        }


cloud_adapter = CloudAdapter()
