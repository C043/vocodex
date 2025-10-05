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
