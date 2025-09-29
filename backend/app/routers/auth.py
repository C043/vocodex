from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models.user import Users
from ..schemas import RegisterIn, LoginIn, UserOut, TokenOut
from ..security import hash_password, verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, session: AsyncSession = Depends(get_session)):
    exists = (
        await session.execute(select(Users).where(Users.username == data.username))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Username already present")
    user = Users(username=data.username, hashed_password=hash_password(data.password))
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Username already in use")
    await session.refresh(user)
    return UserOut(id=user.id, username=user.username)


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, session: AsyncSession = Depends(get_session)):
    user = (
        await session.execute(select(Users).where(Users.username == data.username))
    ).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.username and user.id:
        token = create_access_token(user.id, user.username)
        return TokenOut(token=token)
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/me", response_model=UserOut)
async def me(user: Users = Depends(get_current_user)):
    return UserOut(id=user.id, username=user.username)
