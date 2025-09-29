from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.models.entry import Entries
from ..schemas import UploadTextIn, UploadTextOut

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/text", status_code=201)
async def uploadText(data: UploadTextIn, session: AsyncSession = Depends(get_session)):
    # Take the title and text content and save it on database in the correct table with the correct user
    entry = Entries(title=data.title, content=data.content, user_id=data.user_id)

    session.add(entry)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    # Return new id
    return UploadTextOut(id=entry.id)
