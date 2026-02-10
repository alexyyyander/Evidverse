from typing import Optional, Dict, Any
import httpx
import asyncio

class SeedanceClient:
    def __init__(self, api_key: str, base_url: str = "https://api.seedance.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def generate_video(self, image_url: str, prompt: str, motion_bucket_id: int = 127) -> Dict[str, Any]:
        """
        Trigger video generation task
        """
        async with httpx.AsyncClient() as client:
            payload = {
                "image_url": image_url,
                "prompt": prompt,
                "motion_bucket_id": motion_bucket_id
            }
            response = await client.post(
                f"{self.base_url}/generation/image-to-video",
                headers=self.headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Check generation status
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/tasks/{task_id}",
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
