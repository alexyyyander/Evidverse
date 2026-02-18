import asyncio
import uuid
from app.core.celery_app import celery_app
from app.core.config import settings
from app.services.generation_service import generation_service
from app.services.storage_service import storage_service
from app.utils.url import read_bytes_from_url

@celery_app.task
def generate_video_from_image(image_url: str, prompt: str, user_id: int | None = None) -> dict:
    """
    Celery task to generate a video from an image and upload to S3.
    """
    async def _process():
        try:
            image_bytes = read_bytes_from_url(image_url)
            video_bytes = await generation_service.generate_video(prompt=prompt, input_image=image_bytes)

            prefix = f"generated/{user_id}" if isinstance(user_id, int) else "generated"
            filename = f"{prefix}/{uuid.uuid4()}.mp4"
            success = storage_service.upload_file(video_bytes, filename)
            if not success:
                return {"status": "failed", "error": "Failed to upload to storage"}

            url = f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET_NAME}/{filename}"
            return {"status": "succeeded", "video_url": url, "object_name": filename}
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
