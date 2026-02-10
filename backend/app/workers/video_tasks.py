import asyncio
from app.core.celery_app import celery_app
from app.core.config import settings
from ai_engine.seedance.client import SeedanceClient

# Helper to run async code in sync celery task
def run_async(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

@celery_app.task
def generate_video_from_image(image_url: str, prompt: str) -> dict:
    """
    Celery task to call Seedance API for video generation.
    """
    client = SeedanceClient(api_key=settings.SEEDANCE_API_KEY, base_url=settings.SEEDANCE_API_URL)
    
    # Trigger generation
    async def _process():
        # 1. Start generation
        try:
            task_resp = await client.generate_video(image_url=image_url, prompt=prompt)
            task_id = task_resp.get("id")
            if not task_id:
                return {"status": "failed", "error": "No task ID returned"}
            
            # 2. Poll for completion
            max_retries = 60 # 60 * 2s = 2 mins timeout
            for _ in range(max_retries):
                await asyncio.sleep(2)
                status_resp = await client.get_task_status(task_id)
                status = status_resp.get("status")
                
                if status == "succeeded":
                    return {"status": "succeeded", "video_url": status_resp.get("output", {}).get("url")}
                elif status == "failed":
                    return {"status": "failed", "error": status_resp.get("error")}
            
            return {"status": "timeout", "error": "Generation timed out"}
            
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # Run the async process
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_process())
        return result
    finally:
        loop.close()
