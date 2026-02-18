"""
Local Image Generation Client using ComfyUI

This client provides image generation capabilities using ComfyUI.
Supported models: FLUX.2-klein-4B, Z-Image-Turbo
"""

import json
import uuid
from typing import Optional, Dict, Any
import asyncio
import httpx
from ai_engine.models.config import settings


class LocalImageClient:
    """ComfyUI-based local image generation client"""

    def __init__(
        self,
        host: Optional[str] = None,
        timeout: int = 300
    ):
        self.host = host or settings.COMFYUI_HOST
        self.timeout = timeout

    async def generate_image(
        self,
        prompt: str,
        model: str = "flux2-klein-4b",
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
        steps: int = 30,
        seed: Optional[int] = None,
    ) -> bytes:
        """
        Generate an image from a text prompt.
        
        Args:
            prompt: The text prompt for image generation
            model: Model to use (flux2-klein-4b or z-image-turbo)
            negative_prompt: Things to avoid in the image
            width: Image width (must be divisible by 8)
            height: Image height (must be divisible by 8)
            steps: Number of sampling steps
            seed: Random seed for reproducibility
            
        Returns:
            Generated image as bytes
        """
        workflow = self._build_workflow(
            prompt=prompt,
            model=model,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
            seed=seed,
        )

        prompt_id = await self._queue_workflow(workflow)
        
        image_data = await self._wait_for_result(prompt_id)
        
        return image_data

    async def generate_image_to_image(
        self,
        prompt: str,
        input_image: bytes,
        model: str = "flux2-klein-4b",
        strength: float = 0.7,
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
        steps: int = 30,
        seed: Optional[int] = None,
    ) -> bytes:
        """
        Generate an image from a text prompt and input image (image-to-image).
        
        Args:
            prompt: The text prompt
            input_image: Input image bytes
            model: Model to use
            strength: Transformation strength (0-1)
            negative_prompt: Things to avoid
            width: Image width
            height: Image height
            steps: Sampling steps
            seed: Random seed
            
        Returns:
            Generated image as bytes
        """
        input_name = await self._upload_image(input_image)
        workflow = self._build_i2i_workflow(
            prompt=prompt,
            input_name=input_name,
            model=model,
            strength=strength,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
            seed=seed,
        )

        prompt_id = await self._queue_workflow(workflow)
        image_data = await self._wait_for_result(prompt_id)
        
        return image_data

    async def execute_workflow(self, workflow: Dict[str, Any]) -> bytes:
        prompt_id = await self._queue_workflow(workflow)
        return await self._wait_for_result(prompt_id)

    def _build_workflow(
        self,
        prompt: str,
        model: str,
        negative_prompt: Optional[str],
        width: int,
        height: int,
        steps: int,
        seed: Optional[int],
    ) -> Dict[str, Any]:
        """Build ComfyUI workflow for text-to-image"""
        seed = seed or -1
        neg_text = negative_prompt or ""
        
        workflow = {
            "3": {
                "inputs": {
                    "text": prompt,
                    "clip": ["6", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Positive Prompt"}
            },
            "4": {
                "inputs": {
                    "text": neg_text,
                    "clip": ["6", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {"title": "Negative Prompt"}
            },
        }
        
        workflow["5"] = {
            "inputs": {
                "model": ["6", 0],
                "seed": seed,
                "steps": steps,
                "cfg": 7,
                "sampler_name": "euler",
                "scheduler": "normal",
                "positive": ["3", 0],
                "negative": ["4", 0],
                "latent_image": ["7", 0],
                "denoise": 1
            },
            "class_type": "KSampler",
            "_meta": {"title": "Sampler"}
        }
        
        workflow["6"] = {
            "inputs": {
                "ckpt_name": model
            },
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Load Checkpoint"}
        }
        
        workflow["7"] = {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage",
            "_meta": {"title": "Empty Latent"}
        }
        
        workflow["8"] = {
            "inputs": {
                "samples": ["5", 0],
                "vae": ["6", 2]
            },
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE Decode"}
        }
        
        workflow["9"] = {
            "inputs": {
                "filename_prefix": f"evidverse_{uuid.uuid4().hex[:8]}",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": {"title": "Save Image"}
        }
        
        return workflow

    def _build_i2i_workflow(
        self,
        prompt: str,
        input_name: str,
        model: str,
        strength: float,
        negative_prompt: Optional[str],
        width: int,
        height: int,
        steps: int,
        seed: Optional[int],
    ) -> Dict[str, Any]:
        """Build ComfyUI workflow for image-to-image"""
        workflow = self._build_workflow(
            prompt=prompt,
            model=model,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
            seed=seed,
        )

        workflow["10"] = {
            "inputs": {
                "image": input_name,
            },
            "class_type": "LoadImage",
            "_meta": {"title": "Load Image"}
        }

        workflow["11"] = {
            "inputs": {
                "image": ["10", 0],
                "upscale_method": "nearest-exact",
                "width": width,
                "height": height,
                "crop": "disabled",
            },
            "class_type": "ImageScale",
            "_meta": {"title": "Scale Image"}
        }

        workflow["12"] = {
            "inputs": {
                "pixels": ["11", 0],
                "vae": ["6", 2],
            },
            "class_type": "VAEEncode",
            "_meta": {"title": "VAE Encode"}
        }

        workflow["5"]["inputs"]["latent_image"] = ["12", 0]
        workflow["5"]["inputs"]["denoise"] = max(0.0, min(1.0, float(strength)))

        return workflow

    async def _upload_image(self, image_bytes: bytes) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            files = {"image": ("input.png", image_bytes, "image/png")}
            response = await client.post(f"{self.host}/upload/image", files=files)
            response.raise_for_status()
            data = response.json()
            name = str(data.get("name") or "").strip()
            subfolder = str(data.get("subfolder") or "").strip()
            if not name:
                raise Exception("Upload failed: missing filename")
            return f"{subfolder}/{name}" if subfolder else name

    async def _queue_workflow(self, workflow: Dict[str, Any]) -> str:
        """Queue a workflow and return the prompt_id"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.host}/prompt",
                json={"prompt": workflow}
            )
            response.raise_for_status()
            data = response.json()
            return data["prompt_id"]

    async def _wait_for_result(self, prompt_id: str, poll_interval: float = 1.0) -> bytes:
        """Wait for workflow completion and return the generated image"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                await asyncio.sleep(poll_interval)
                
                response = await client.get(f"{self.host}/history/{prompt_id}")
                response.raise_for_status()
                data = response.json()
                
                if prompt_id in data:
                    result = data[prompt_id]
                    if result.get("status", {}).get("completed", False):
                        outputs = result.get("outputs", {})
                        
                        for node_id, node_output in outputs.items():
                            images = node_output.get("images") or []
                            if images:
                                image_info = images[0] or {}
                                filename = image_info.get("filename")
                                subfolder = image_info.get("subfolder") or ""
                                img_type = image_info.get("type") or ""
                                if not filename:
                                    continue

                                img_response = await client.get(
                                    f"{self.host}/view",
                                    params={"filename": filename, "subfolder": subfolder, "type": img_type},
                                )
                                img_response.raise_for_status()
                                return img_response.content
                        
                        raise Exception("No image found in output")
                    
                    if result.get("status", {}).get("status_str") == "error" or result.get("status", {}).get("errored", False):
                        raise Exception(f"Generation failed: {result['status']}")

image_client = LocalImageClient()
