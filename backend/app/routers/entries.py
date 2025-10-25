from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.deps import get_current_user
from app.models.user import Users
from app.schemas.entriesSchemas import (
    ListEntriesOut,
    UploadTextIn,
    UploadTextOut,
    UpdateEntryIn,
    UpdateEntryOut,
)

from app.controllers import entriesController

router = APIRouter(prefix="/entries", tags=["entries"])


@router.get("/{entry_id}", status_code=200)
async def getEntryById(
    entry_id: int,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        entry = await entriesController.getEntryById(entry_id, current_user, session)
        return entry
    except Exception:
        raise


@router.post("/text", status_code=201)
async def uploadText(
    data: UploadTextIn,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        entry = await entriesController.uploadText(data, current_user, session)
        # Return new id
        return UploadTextOut(id=entry.id)
    except Exception:
        raise


@router.post("/text/{entry_id}/progress", status_code=201)
async def updateProgress(
    entry_id: int,
    data: UpdateEntryIn,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UpdateEntryOut:
    try:
        entryId = await entriesController.updateProgress(
            entry_id, data, current_user, session
        )
        return UpdateEntryOut(id=entryId)
    except Exception:
        raise


@router.get("/list/me", status_code=200)
async def listEntries(
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ListEntriesOut:
    try:
        entries = await entriesController.listEntries(current_user, session)
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
        await entriesController.deleteEntryById(entry_id, current_user, session)
    except Exception:
        raise
