from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models.user import Users
from ..schemas.authSchemas import RegisterIn, LoginIn, UserOut, TokenOut
from ..deps import get_current_user

from app.controllers import authController

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterIn, session: AsyncSession = Depends(get_session)):
    try:
        user: Users = await authController.register(data, session)
        return UserOut(id=user.id, username=user.username)
    except HTTPException as err:
        # Custom handling here
        raise HTTPException(
            status_code=err.status_code, detail=f"Registration failed: {err.detail}"
        )


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, session: AsyncSession = Depends(get_session)):
    try:
        token = await authController.login(data, session)
        return TokenOut(token=token)
    except HTTPException as err:
        raise HTTPException(
            status_code=err.status_code, detail=f"Login failed: {err.detail}"
        )


@router.get("/me", response_model=UserOut)
async def me(user: Users = Depends(get_current_user)):
    return UserOut(id=user.id, username=user.username)
