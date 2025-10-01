from fastapi import APIRouter, Depends
from sqlalchemy import Delete, Select, select
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.deps import get_current_user
from app.models.entry import Entries
from app.models.user import Users
from app.schemas.entriesSchemas import (
    EntrySummary,
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
async def uploadText(
    data: UploadTextIn,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if data.title == "":
        data.title = " ".join(data.content.split()[:3])

    # Take the title and text content and save it on database in the correct table with the correct user
    entry = Entries(title=data.title, user_id=current_user.id, content=data.content)

    session.add(entry)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise

    # Return new id
    return UploadTextOut(id=entry.id)


@router.get("/list/me", status_code=200)
async def listEntries(
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ListEntriesOut:
    try:
        rows = (
            await session.execute(
                select(Entries.id, Entries.title).where(
                    Entries.user_id == current_user.id
                )
            )
        ).all()

        entries = [EntrySummary(id=row.id, title=row.title) for row in rows]

        return ListEntriesOut(entries=entries)
    except Exception:
        raise


@router.delete("/{entry_id}", status_code=204)
async def deleteEntryById(
    entry_id: int,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            Delete(Entries).where(
                Entries.id == entry_id, Entries.user_id == current_user.id
            )
        )
    except Exception:
        raise
