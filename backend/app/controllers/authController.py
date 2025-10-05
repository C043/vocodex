from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models.user import Users
from ..schemas.authSchemas import RegisterIn, LoginIn
from ..security import hash_password, verify_password, create_access_token


async def register(
    data: RegisterIn, session: AsyncSession = Depends(get_session)
) -> Users:
    exists = (
        await session.execute(select(Users).where(Users.username == data.username))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Username already present")
    try:
        user = Users(
            username=data.username, hashed_password=hash_password(data.password)
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Username already in use")


async def login(data: LoginIn, session: AsyncSession = Depends(get_session)):
    user = (
        await session.execute(select(Users).where(Users.username == data.username))
    ).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.username and user.id:
        token = create_access_token(user.id, user.username)
        return token
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")
