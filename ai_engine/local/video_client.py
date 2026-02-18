"""
Local Video Generation Client using LTX-Video

This client provides video generation capabilities using LTX-Video with Diffusers.
Model: ltx-2-19b-distilled (optimized for 24GB VRAM)
"""

import os
import io
from typing import Optional, Any

from ai_engine.models.config import settings


class LocalVideoClient:
    """LTX-Video based local video generation client"""

    def __init__(
        self,
        model_path: Optional[str] = None,
        model_variant: str = "ltx-2-19b-distilled",
        device: str = "cuda",
    ):
        self.model_path = model_path or settings.LTX_MODEL_PATH
        self.model_variant = model_variant or settings.LTX_MODEL_VARIANT
        self.device = device or settings.LTX_DEVICE
        self.pipeline = None
        self._torch: Any | None = None
        self._export_to_video: Any | None = None
        self._Image: Any | None = None

    def _expand_path(self, path: str) -> str:
        """Expand ~ to home directory"""
        return os.path.expanduser(path)

    async def initialize(self) -> None:
        """Initialize the LTX-Video pipeline"""
        if self.pipeline is not None:
            return

        try:
            import torch
            from diffusers import LTXVideoPipeline
            from diffusers.utils import export_to_video
            from PIL import Image
        except Exception as e:
            raise RuntimeError(f"Video local dependencies not available: {e}")

        model_path = self._expand_path(self.model_path)
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found at {model_path}. "
                f"Please run: bash ai_engine/models/downloads/download_video.sh"
            )
        
        try:
            self.pipeline = LTXVideoPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
            )
            
            if self.device == "cuda":
                self.pipeline = self.pipeline.to("cuda")

            self._torch = torch
            self._export_to_video = export_to_video
            self._Image = Image
        except Exception as e:
            raise

    async def generate_video(
        self,
        prompt: str,
        input_image: Optional[Any] = None,
        num_frames: int = 81,
        fps: int = 24,
        width: int = 512,
        height: int = 320,
        num_inference_steps: int = 30,
        guidance_scale: float = 3.0,
        seed: Optional[int] = None,
    ) -> bytes:
        """
        Generate a video from text and/or image.
        
        Args:
            prompt: Text prompt describing the video
            input_image: Input image (for image-to-video)
            num_frames: Number of frames to generate
            fps: Frames per second
            width: Video width (must be divisible by 32)
            height: Video height (must be divisible by 32)
            num_inference_steps: Number of denoising steps
            guidance_scale: CFG scale
            seed: Random seed for reproducibility
            
        Returns:
            Generated video as bytes
        """
        if self.pipeline is None:
            await self.initialize()

        torch = self._torch
        export_to_video = self._export_to_video
        Image = self._Image
        if torch is None or export_to_video is None or Image is None:
            raise RuntimeError("Video local dependencies not initialized")

        generator = None
        if seed is not None:
            generator = torch.Generator(device=self.device).manual_seed(seed)

        if input_image is not None:
            if isinstance(input_image, bytes):
                input_image = Image.open(io.BytesIO(input_image))
            
            input_image = input_image.convert("RGB")
            input_image = input_image.resize((width, height))

            result = self.pipeline(
                prompt=prompt,
                image=input_image,
                num_frames=num_frames,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=generator,
            )
        else:
            result = self.pipeline(
                prompt=prompt,
                num_frames=num_frames,
                height=height,
                width=width,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                generator=generator,
            )

        video = result.frames[0]
        
        output = io.BytesIO()
        export_to_video(video, output, fps=fps)
        
        return output.getvalue()

    async def generate_image_to_video(
        self,
        input_image: Any,
        prompt: str,
        num_frames: int = 81,
        fps: int = 24,
        num_inference_steps: int = 30,
        guidance_scale: float = 3.0,
        seed: Optional[int] = None,
    ) -> bytes:
        """
        Generate a video from an input image.
        
        Args:
            input_image: Input PIL Image
            prompt: Text prompt describing the motion
            num_frames: Number of frames
            fps: Frames per second
            num_inference_steps: Denoising steps
            guidance_scale: CFG scale
            seed: Random seed
            
        Returns:
            Generated video as bytes
        """
        return await self.generate_video(
            prompt=prompt,
            input_image=input_image,
            num_frames=num_frames,
            fps=fps,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            seed=seed,
        )

    async def check_health(self) -> bool:
        """Check if the model is loaded and ready"""
        return self.pipeline is not None

    async def unload(self) -> None:
        """Unload the model from GPU memory"""
        if self.pipeline is not None:
            del self.pipeline
            self.pipeline = None

        if self._torch is not None:
            try:
                if self._torch.cuda.is_available():
                    self._torch.cuda.empty_cache()
            except Exception:
                pass


video_client = LocalVideoClient()
