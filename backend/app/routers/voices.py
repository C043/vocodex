from fastapi import APIRouter

from app.controllers import voicesController


router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("", status_code=200)
async def getVoices():
    try:
        voices = await voicesController.getVoices()
        return voices
    except Exception:
        raise
