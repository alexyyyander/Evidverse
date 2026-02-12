import json
from typing import List, Dict, Any
from ai_engine.llm.client import llm_client
from app.schemas.storyboard import validate_storyboard

class StoryGenerationService:
    @staticmethod
    async def generate_storyboard(topic: str) -> List[Dict[str, Any]]:
        raw_json = await llm_client.generate_script(topic)
        try:
            # Basic cleanup if markdown fences are present
            cleaned_json = raw_json.replace("```json", "").replace("```", "").strip()
            storyboard = json.loads(cleaned_json)
            return validate_storyboard(storyboard)
        except json.JSONDecodeError as e:
            # In production, we might want to retry or use a more robust parser
            raise ValueError(f"Failed to parse LLM output: {e.msg}") from e

story_service = StoryGenerationService()
