from fastapi import HTTPException
from sqlalchemy import Delete, Select, select, update
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.models.entry import Entries
from app.models.user import Users
from app.schemas.entriesSchemas import (
    EntrySummary,
    UpdateEntryIn,
    UploadTextIn,
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
                Select(Entries.id, Entries.title, Entries.created_at).where(
                    Entries.user_id == current_user.id
                )
            )
        ).all()

        entries = [
            EntrySummary(id=row.id, title=row.title, date=row.created_at)
            for row in rows
        ]
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


async def updateProgress(
    entry_id: int, data: UpdateEntryIn, current_user: Users, session: AsyncSession
) -> int:
    try:
        stmt = (
            update(Entries)
            .where(Entries.id == entry_id, Entries.user_id == current_user.id)
            .values(progress=data.progress)
            .returning(Entries.id)
        )
        result = await session.execute(stmt)
        entry_id_updated = result.scalar_one_or_none()
        if entry_id_updated is None:
            await session.rollback()
            raise HTTPException(status_code=404, detail="Entry not found")
        await session.commit()
        return entry_id_updated
    except Exception:
        await session.rollback()
        raise
