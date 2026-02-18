"""
Unified AI Generation Service

This service provides a unified interface for all AI generation operations,
automatically selecting between local and cloud providers based on configuration.
"""

import json
from typing import List, Dict, Any, Optional, Literal

from ai_engine.adapters import adapter as unified_adapter
from ai_engine.adapters.cloud_adapter import cloud_adapter
from ai_engine.local.llm_client import LocalLLMClient
from ai_engine.models.config import settings


class GenerationService:
    """Unified service for AI generation"""
    REQUEST_PROVIDER_VALUES = {"auto", "ollama", "vllm", "sglang", "openai_compatible"}
    RESOLVED_PROVIDER_VALUES = {"ollama", "vllm", "sglang", "openai_compatible", "cloud"}

    @staticmethod
    def _normalize_requested_provider(value: Any) -> tuple[Literal["auto", "ollama", "vllm", "sglang", "openai_compatible"], Optional[str]]:
        raw = str(value or "auto").strip()
        if raw in GenerationService.REQUEST_PROVIDER_VALUES:
            return raw, None  # type: ignore[return-value]
        return "auto", f"unknown llm_provider '{raw}', fallback to auto"

    @staticmethod
    def _normalize_local_provider(value: Any) -> Literal["ollama", "vllm", "sglang", "openai_compatible"]:
        raw = str(value or "").strip()
        if raw in {"ollama", "vllm", "sglang", "openai_compatible"}:
            return raw  # type: ignore[return-value]
        return "ollama"

    @staticmethod
    async def generate_script(topic: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a video script/storyboard from a topic.
        
        Args:
            topic: The topic for the video
            
        Returns:
            List of scene dictionaries with visual_description and narration
        """
        opts = options or {}
        requested_provider, provider_warning = GenerationService._normalize_requested_provider(opts.get("llm_provider"))
        fallback_used = False
        warnings: List[str] = []
        if provider_warning:
            warnings.append(provider_warning)
        resolved_provider = requested_provider

        prompt_topic = GenerationService._compose_story_prompt(topic, opts)

        if requested_provider and requested_provider != "auto":
            try:
                if requested_provider == "ollama":
                    llm_client = LocalLLMClient(provider="ollama")
                else:
                    llm_client = LocalLLMClient(provider=requested_provider)  # type: ignore[arg-type]
                raw_json = await llm_client.generate_script(prompt_topic)
                resolved_provider = requested_provider
            except Exception as e:
                warnings.append(f"provider '{requested_provider}' failed: {e}")
                if settings.FALLBACK_TO_CLOUD:
                    raw_json = await cloud_adapter.generate_script(prompt_topic)
                    resolved_provider = "cloud"
                    fallback_used = True
                else:
                    raise
        else:
            raw_json = await unified_adapter.generate_script(prompt_topic)
            if settings.USE_LOCAL_MODELS:
                resolved_provider = GenerationService._normalize_local_provider(
                    getattr(settings, "LOCAL_LLM_PROVIDER", ""),
                )
            else:
                resolved_provider = "cloud"
        
        try:
            cleaned_json = raw_json.replace("```json", "").replace("```", "").strip()
            storyboard = json.loads(cleaned_json)
            
            if isinstance(storyboard, dict) and "scenes" in storyboard:
                storyboard = storyboard["scenes"]

            return {
                "storyboard": storyboard,
                "meta": {
                    "requested_provider": requested_provider,
                    "resolved_provider": resolved_provider,
                    "fallback_used": fallback_used,
                    "warnings": warnings,
                },
            }
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM output: {e}")

    @staticmethod
    def _compose_story_prompt(topic: str, options: Dict[str, Any]) -> str:
        context_lines: List[str] = []
        stage = options.get("stage")
        story_mode = options.get("story_mode")
        story_style = options.get("story_style")
        tone = options.get("tone")
        script_mode = options.get("script_mode")
        segment_length = options.get("segment_length")
        character_seed = options.get("character_seed")
        existing_outline = options.get("existing_outline")

        if stage:
            context_lines.append(f"stage: {stage}")
        if story_mode:
            context_lines.append(f"story_mode: {story_mode}")
        if story_style:
            context_lines.append(f"story_style: {story_style}")
        if tone:
            context_lines.append(f"tone: {tone}")
        if script_mode:
            context_lines.append(f"script_mode: {script_mode}")
        if segment_length:
            context_lines.append(f"segment_length: {segment_length}")
        if character_seed:
            context_lines.append(f"character_seed: {json.dumps(character_seed, ensure_ascii=False)}")
        if existing_outline:
            context_lines.append(f"existing_outline: {json.dumps(existing_outline, ensure_ascii=False)}")

        if not context_lines:
            return topic
        return f"{topic}\n\n[STORY_HINTS]\n" + "\n".join(context_lines)

    @staticmethod
    async def generate_image(
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
        return await unified_adapter.generate_image(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
        )

    @staticmethod
    async def generate_image_to_image(
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
        return await unified_adapter.generate_image_to_image(
            prompt=prompt,
            input_image=input_image,
            strength=strength,
        )

    @staticmethod
    async def generate_video(
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
        return await unified_adapter.generate_video(
            prompt=prompt,
            input_image=input_image,
            num_frames=num_frames,
            fps=fps,
        )

    @staticmethod
    async def health_check() -> Dict[str, Any]:
        """Check health of all AI services"""
        return await unified_adapter.health_check()


generation_service = GenerationService()
