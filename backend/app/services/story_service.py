from typing import List, Dict, Any
from app.services.generation_service import generation_service


class StoryGenerationService:
    @staticmethod
    async def generate_storyboard(topic: str, options: Dict[str, Any] | None = None):
        payload = await generation_service.generate_script(topic, options=options)
        if options is None:
            if isinstance(payload, dict):
                storyboard = payload.get("storyboard")
                if isinstance(storyboard, list):
                    return storyboard
            if isinstance(payload, list):
                return payload
            return []
        return payload


story_service = StoryGenerationService()
