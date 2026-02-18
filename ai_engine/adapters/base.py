"""
Base adapter interface for AI generation services.

This module defines the abstract base class that both local and cloud
adapters must implement, providing a unified interface for text generation,
image generation, and video generation.
"""

from abc import ABC, abstractmethod
from typing import Optional, Any, Dict


class GenerationAdapter(ABC):
    """Abstract base class for all generation adapters"""

    @abstractmethod
    async def generate_script(self, topic: str) -> str:
        """
        Generate a video script/storyboard from a topic.
        
        Args:
            topic: The topic for the video
            
        Returns:
            JSON string containing the storyboard
        """
        pass

    @abstractmethod
    async def generate_image(
        self,
        prompt: str,
        negative_prompt: Optional[str] = None,
        width: int = 512,
        height: int = 512,
    ) -> bytes:
        """
        Generate an image from a text prompt.
        
        Args:
            prompt: The text prompt
            negative_prompt: Things to avoid
            width: Image width
            height: Image height
            
        Returns:
            Generated image as bytes
        """
        pass

    @abstractmethod
    async def generate_image_to_image(
        self,
        prompt: str,
        input_image: bytes,
        strength: float = 0.7,
    ) -> bytes:
        """
        Generate an image from text and input image.
        
        Args:
            prompt: The text prompt
            input_image: Input image bytes
            strength: Transformation strength
            
        Returns:
            Generated image as bytes
        """
        pass

    @abstractmethod
    async def generate_video(
        self,
        prompt: str,
        input_image: Optional[bytes] = None,
        num_frames: int = 81,
        fps: int = 24,
    ) -> bytes:
        """
        Generate a video from text and/or image.
        
        Args:
            prompt: The text prompt
            input_image: Input image bytes (optional)
            num_frames: Number of frames
            fps: Frames per second
            
        Returns:
            Generated video as bytes
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, bool]:
        """
        Check the health of all services.
        
        Returns:
            Dictionary with health status for each service
        """
        pass
