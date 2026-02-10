import openai
from typing import List, Dict
from app.core.config import settings

class LLMClient:
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def generate_script(self, topic: str) -> str:
        """
        Generate a short video script/storyboard from a topic.
        """
        prompt = f"""
        Create a short 3-scene storyboard for a video about: {topic}.
        Format the output as a JSON list of objects, where each object has:
        - scene_number: int
        - visual_description: str (detailed prompt for image generation)
        - narration: str (voiceover text)
        
        Return ONLY valid JSON.
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional video script writer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        return response.choices[0].message.content

llm_client = LLMClient()
