from fastapi import APIRouter, Depends, HTTPException
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


async def getEntryById(
    entry_id: int,
    current_user: Users,
    session: AsyncSession,
) -> Entries:
    try:
        entry = (
            await session.execute(
                Select(Entries)
                .where(Entries.id == entry_id)
                .where(Entries.user_id == current_user.id)
            )
        ).scalar_one()

        return entry
    except Exception:
        raise


async def uploadText(
    data: UploadTextIn, current_user: Users, session: AsyncSession
) -> Entries:
    if data.title == "":
        data.title = " ".join(data.content.split()[:3])

    try:
        # Take the title and text content and save it on database in the correct table with the correct user
        entry = Entries(title=data.title, user_id=current_user.id, content=data.content)

        session.add(entry)
        await session.commit()
        return entry
    except Exception:
        await session.rollback()
        raise


async def listEntries(current_user: Users, session: AsyncSession) -> list[EntrySummary]:
    try:
        rows = (
            await session.execute(
                select(Entries.id, Entries.title).where(
                    Entries.user_id == current_user.id
                )
            )
        ).all()

        entries = [EntrySummary(id=row.id, title=row.title) for row in rows]
        return entries
    except Exception:
        raise


async def deleteEntryById(entry_id: int, current_user: Users, session: AsyncSession):
    try:
        result = await session.execute(
            Delete(Entries).where(
                Entries.id == entry_id, Entries.user_id == current_user.id
            )
        )
        await session.commit()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Entry not found")
    except Exception:
        await session.rollback()
        raise
