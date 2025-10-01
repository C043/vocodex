from fastapi import APIRouter, Depends
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.models.entry import Entries
from app.schemas.entriesSchemas import (
    EntrySummary,
    ListEntriesIn,
    ListEntriesOut,
    UploadTextIn,
    UploadTextOut,
)

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("/{entry_id}", status_code=200)
async def getEntryById(entry_id: int, session: AsyncSession = Depends(get_session)):
    try:
        entry = (
            await session.execute(Select(Entries).where(Entries.id == entry_id))
        ).scalar_one_or_none()

        return entry
    except Exception:
        raise


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


@router.get("/list", status_code=200)
async def listEntries(
    data: ListEntriesIn, session: AsyncSession = Depends(get_session)
) -> ListEntriesOut:
    user_id = data.user_id
    try:
        rows = (
            await session.execute(
                select(Entries.id, Entries.title).where(Entries.user_id == user_id)
            )
        ).all()

        entries = [EntrySummary(id=row.id, title=row.title) for row in rows]

        return ListEntriesOut(entries=entries)
    except Exception:
        raise
