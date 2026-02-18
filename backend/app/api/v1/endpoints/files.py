from typing import Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.api import deps
from app.core.config import settings
from app.models.user import User
from app.services.storage_service import storage_service
from app.workers.tasks import test_celery

router = APIRouter()

class PresignedUrlResponse(BaseModel):
    url: str
    object_name: str
    storage_url: str

class Msg(BaseModel):
    msg: str

@router.post("/upload", response_model=Msg)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Upload a file to S3/MinIO.
    """
    file_content = await file.read()
    object_name = f"{current_user.id}/{file.filename}"
    
    success = storage_service.upload_file(file_content, object_name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to upload file")
        
    return {"msg": f"File uploaded successfully to {object_name}"}

@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def generate_presigned_url(
    filename: str,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generate a presigned URL for client-side upload.
    """
    object_name = f"{current_user.id}/{filename}"
    url = storage_service.generate_presigned_url(object_name)
    
    if not url:
        raise HTTPException(status_code=500, detail="Failed to generate URL")
    storage_url = f"{str(settings.S3_ENDPOINT_URL).rstrip('/')}/{settings.S3_BUCKET_NAME}/{object_name}"
    return {"url": url, "object_name": object_name, "storage_url": storage_url}

@router.post("/test-celery", response_model=Msg)
async def test_celery_task(
    msg: Msg,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Test Celery task.
    """
    test_celery.delay(msg.msg)
    return {"msg": "Task received"}
