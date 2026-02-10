import asyncio
import uuid
from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.storage_service import storage_service
from ai_engine.stable_diffusion.client import StableDiffusionClient

@celery_app.task
def generate_character_image(prompt: str, user_id: int) -> dict:
    """
    Celery task to generate character image and upload to S3.
    """
    client = StableDiffusionClient(
        api_key=settings.STABILITY_API_KEY,
        api_host=settings.STABILITY_API_HOST
    )
    
    async def _process():
        try:
            # 1. Generate Image
            image_bytes = await client.generate_image(prompt=prompt)
            
            # 2. Upload to S3
            filename = f"generated/{user_id}/{uuid.uuid4()}.png"
            success = storage_service.upload_file(image_bytes, filename)
            
            if not success:
                return {"status": "failed", "error": "Failed to upload to storage"}
            
            # 3. Generate Public URL (or just return object key)
            # In a real app, we might return a presigned URL or public URL if bucket is public
            # MinIO bucket is public in our setup
            url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{filename}"
            
            return {"status": "succeeded", "image_url": url, "object_name": filename}
            
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    # Run async
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        result = loop.run_until_complete(_process())
        return result
    finally:
        loop.close()
