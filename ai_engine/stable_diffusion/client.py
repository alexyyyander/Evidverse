from typing import Optional, Dict, Any
import httpx
import base64

class StableDiffusionClient:
    def __init__(self, api_key: str, api_host: str = "https://api.stability.ai"):
        self.api_key = api_key
        self.api_host = api_host
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    async def generate_image(self, prompt: str, steps: int = 30) -> bytes:
        """
        Generate image from text prompt using Stability AI API
        """
        engine_id = "stable-diffusion-v1-6"
        url = f"{self.api_host}/v1/generation/{engine_id}/text-to-image"
        
        async with httpx.AsyncClient() as client:
            payload = {
                "text_prompts": [{"text": prompt}],
                "cfg_scale": 7,
                "steps": steps,
                "samples": 1
            }
            
            response = await client.post(url, headers=self.headers, json=payload)
            
            if response.status_code != 200:
                raise Exception(f"Non-200 response: {response.text}")
            
            data = response.json()
            # Decode the first image
            image_base64 = data["artifacts"][0]["base64"]
            return base64.b64decode(image_base64)
