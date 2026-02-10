import time
from app.core.celery_app import celery_app

@celery_app.task
def test_celery(word: str) -> str:
    time.sleep(1)
    return f"test task return {word}"

@celery_app.task
def process_video(file_path: str) -> str:
    # TODO: Implement video processing logic
    time.sleep(5) # Simulate processing
    return f"Processed video at {file_path}"
