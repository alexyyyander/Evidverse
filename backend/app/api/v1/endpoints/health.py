from fastapi import APIRouter
from fastapi import HTTPException

from app.services.generation_service import generation_service

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/health/ai")
async def health_ai():
    try:
        return await generation_service.health_check()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
