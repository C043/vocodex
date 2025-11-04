from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers import userController
from app.db import get_session
from app.deps import get_current_user
from app.models.user import Users
from app.schemas.userSchemas import UserPreferencesIn


router = APIRouter(prefix="/me", tags=["user"])


@router.post("/preferences", status_code=200)
async def updatePreferences(
    data: UserPreferencesIn,
    current_user: Users = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    try:
        await userController.updatePreferences(data, current_user, session)
    except Exception:
        raise
