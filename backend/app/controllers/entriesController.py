import re

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import Delete, Select, func, select, update
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.controllers import pdfController, websiteController
from app.models.entry import Entries, EntryFiles
from app.models.user import Users
from app.schemas.entriesSchemas import (
    EntrySummary,
    UpdateEntryIn,
    UploadTextIn,
    UploadWebsiteIn,
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
                Select(
                    Entries.id, Entries.title, Entries.kind, Entries.created_at
                ).where(Entries.user_id == current_user.id)
            )
        ).all()

        entries = [
            EntrySummary(
                id=row.id, title=row.title, kind=row.kind, date=row.created_at
            )
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


async def getProgress(entry_id: int, current_user: Users, session: AsyncSession):
    try:
        entryProgress = (
            await session.execute(
                select(Entries.progress).where(
                    Entries.id == entry_id, Entries.user_id == current_user.id
                )
            )
        ).scalar_one()

        return entryProgress
    except Exception:
        await session.rollback()
        raise


async def uploadWebsite(
    data: UploadWebsiteIn, current_user: Users, session: AsyncSession
) -> Entries:
    html = await websiteController.fetchWebsite(str(data.url))
    parsed = websiteController.parseWebsite(html)

    try:
        entry = Entries(
            title=parsed.title, user_id=current_user.id, content=parsed.content
        )
        session.add(entry)
        await session.commit()
        return entry
    except Exception:
        await session.rollback()
        raise


async def uploadPdf(
    data: bytes, filename: str | None, current_user: Users, session: AsyncSession
) -> Entries:
    # Checking and rewriting a big PDF takes a while: do it off the event
    # loop so the other requests keep being served
    parsed = await run_in_threadpool(pdfController.parsePdf, data, filename)
    data = await run_in_threadpool(pdfController.optimizePdf, data)

    try:
        # The text is read from the file itself, so content stays empty
        entry = Entries(
            title=parsed.title, user_id=current_user.id, content="", kind="pdf"
        )
        session.add(entry)
        await session.flush()
        session.add(EntryFiles(entry_id=entry.id, data=data))
        await session.commit()
        return entry
    except Exception:
        await session.rollback()
        raise


BYTE_RANGE = re.compile(r"^bytes=(\d*)-(\d*)$")


def parseByteRange(header: str | None, total: int) -> tuple[int, int] | None:
    """
    Reads a single "bytes=start-end" Range header into an inclusive
    (start, end) pair clipped to the file size. Returns None when the whole
    file should be sent, and raises 416 when the range is past the end.
    """
    match = BYTE_RANGE.match((header or "").strip())
    if not match or match.groups() == ("", ""):
        return None

    first, last = match.groups()
    if first == "":
        # Suffix range: the last N bytes
        start, end = max(total - int(last), 0), total - 1
    else:
        start = int(first)
        end = min(int(last), total - 1) if last else total - 1

    if start >= total or start > end:
        raise HTTPException(
            status_code=416,
            detail="Range not satisfiable",
            headers={"Content-Range": f"bytes */{total}"},
        )
    return start, end


async def getEntryFile(
    entry_id: int,
    current_user: Users,
    session: AsyncSession,
    rangeHeader: str | None = None,
) -> tuple[bytes, int, tuple[int, int] | None]:
    """
    Returns the requested bytes of the entry file, its total size and the
    range served (None for the whole file). Only the requested slice is read
    from the database, so opening a long PDF stays fast.
    """
    owned = (
        select(EntryFiles.entry_id)
        .join(Entries, Entries.id == EntryFiles.entry_id)
        .where(Entries.id == entry_id, Entries.user_id == current_user.id)
    )
    total = (
        await session.execute(
            select(func.octet_length(EntryFiles.data)).where(
                EntryFiles.entry_id.in_(owned)
            )
        )
    ).scalar_one_or_none()

    if total is None:
        raise HTTPException(status_code=404, detail="File not found")

    byteRange = parseByteRange(rangeHeader, total)
    start, end = byteRange or (0, total - 1)
    data = (
        await session.execute(
            # SQL substring counts from 1
            select(func.substring(EntryFiles.data, start + 1, end - start + 1)).where(
                EntryFiles.entry_id == entry_id
            )
        )
    ).scalar_one()

    return data, total, byteRange
