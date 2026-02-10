import json
from typing import List, Dict, Any
from ai_engine.llm.client import llm_client

class StoryGenerationService:
    @staticmethod
    async def generate_storyboard(topic: str) -> List[Dict[str, Any]]:
        raw_json = await llm_client.generate_script(topic)
        try:
            # Basic cleanup if markdown fences are present
            cleaned_json = raw_json.replace("```json", "").replace("```", "").strip()
            storyboard = json.loads(cleaned_json)
            if not isinstance(storyboard, list):
                raise ValueError("Output is not a list")
            return storyboard
        except json.JSONDecodeError:
            # In production, we might want to retry or use a more robust parser
            raise ValueError("Failed to parse LLM output")

story_service = StoryGenerationService()
