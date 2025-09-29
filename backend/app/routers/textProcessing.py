from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.db import get_session
from ..schemas import UploadTextIn

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/uploads/text", status_code=200)
async def uploadText(data: UploadTextIn, session: AsyncSession = Depends(get_session)):
    return None
