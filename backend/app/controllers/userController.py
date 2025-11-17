from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from app.models.user import Users
from app.schemas.userSchemas import UserPreferencesIn


async def updatePreferences(
    data: UserPreferencesIn, current_user: Users, session: AsyncSession
):
    try:
        userPreferences = {"speed": data.speed, "voice": data.voice}

        stmt = (
            update(Users)
            .where(Users.id == current_user.id)
            .values(preferences=userPreferences)
            .returning(Users.id)
        )
        result = await session.execute(stmt)
        userIdUpdated = result.scalar_one_or_none()
        if userIdUpdated is None:
            await session.rollback()
            raise HTTPException(status_code=404, detail="User not found")

        await session.commit()
        return userIdUpdated
    except Exception:
        raise


async def getPreferences(current_user: Users, session: AsyncSession):
    try:
        preferences = (
            await session.execute(
                Select(Users.preferences).where(Users.id == current_user.id)
            )
        ).scalar_one()

        return preferences
    except Exception:
        raise
