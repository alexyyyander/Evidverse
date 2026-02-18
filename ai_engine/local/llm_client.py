"""
Local LLM Client for user-managed deployments.

Supported providers:
- Ollama
- OpenAI-compatible HTTP servers (vLLM / sglang / etc.)
"""

import json
from typing import Optional, Dict, Any, List, Literal
import httpx
from ai_engine.models.config import settings


class LocalLLMClient:
    """Local LLM client for script generation"""

    def __init__(
        self,
        host: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 120,
        provider: Optional[Literal["ollama", "vllm", "sglang", "openai_compatible"]] = None,
        openai_base_url: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ):
        self.provider = provider or settings.LOCAL_LLM_PROVIDER

        self.host = host or settings.OLLAMA_HOST
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT

        self.openai_base_url = openai_base_url or settings.LLM_OPENAI_BASE_URL
        self.openai_api_key = openai_api_key if openai_api_key is not None else settings.LLM_OPENAI_API_KEY
        self.openai_model = settings.LLM_OPENAI_MODEL
        if self.provider != "ollama" and model is not None:
            self.openai_model = model
        self.openai_timeout = settings.LLM_OPENAI_TIMEOUT

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Generate text from a prompt using configured local provider.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            temperature: Sampling temperature (0.0 - 2.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})

        if self.provider == "ollama":
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                payload: Dict[str, Any] = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                }

                if max_tokens:
                    payload["options"] = {"num_predict": max_tokens}

                response = await client.post(
                    f"{self.host}/api/chat",
                    json=payload,
                )
                response.raise_for_status()

                data = response.json()
                return data["message"]["content"]

        base_url = self.openai_base_url.rstrip("/")
        headers: Dict[str, str] = {}
        if isinstance(self.openai_api_key, str) and self.openai_api_key.strip():
            headers["Authorization"] = f"Bearer {self.openai_api_key.strip()}"

        async with httpx.AsyncClient(timeout=self.openai_timeout) as client:
            payload = {
                "model": self.openai_model,
                "messages": messages,
                "temperature": temperature,
            }
            if max_tokens is not None:
                payload["max_tokens"] = max_tokens

            response = await client.post(
                f"{base_url}/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    async def generate_script(self, topic: str) -> str:
        """
        Generate a short video script/storyboard from a topic.
        
        Args:
            topic: The topic for the video
            
        Returns:
            JSON string containing the storyboard
        """
        system_prompt = """You are a professional video script writer.
Create a short 3-scene storyboard for a video.
Format the output as a JSON list of objects, where each object has:
- scene_number: int
- visual_description: str (detailed prompt for image generation)
- narration: str (voiceover text)

Return ONLY valid JSON."""

        prompt = f"""Create a short 3-scene storyboard for a video about: {topic}.
Include detailed visual descriptions that could be used for AI image generation."""

        return await self.generate(prompt, system_prompt=system_prompt, temperature=0.7)

    async def check_health(self) -> bool:
        """Check if configured provider is available"""
        try:
            if self.provider == "ollama":
                async with httpx.AsyncClient(timeout=5) as client:
                    response = await client.get(f"{self.host}/api/tags")
                    return response.status_code == 200

            base_url = self.openai_base_url.rstrip("/")
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{base_url}/v1/models")
                return response.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[str]:
        """List available models"""
        try:
            if self.provider == "ollama":
                async with httpx.AsyncClient(timeout=5) as client:
                    response = await client.get(f"{self.host}/api/tags")
                    response.raise_for_status()
                    data = response.json()
                    return [model["name"] for model in data.get("models", [])]

            base_url = self.openai_base_url.rstrip("/")
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{base_url}/v1/models")
                response.raise_for_status()
                data = response.json()
                models = data.get("data", [])
                if isinstance(models, list):
                    out: List[str] = []
                    for item in models:
                        if isinstance(item, dict) and isinstance(item.get("id"), str):
                            out.append(item["id"])
                    return out
                return []
        except Exception:
            return []


# Singleton instance
llm_client = LocalLLMClient()
