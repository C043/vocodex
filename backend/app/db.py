from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)
from fastapi import Request


def get_engine(request: Request) -> AsyncEngine:
    return request.app.state.engine


def get_sessionmaker(request: Request) -> async_sessionmaker[AsyncSession]:
    return request.app.state.sessionmaker


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    Session = get_sessionmaker(request)
    async with Session() as session:
        yield session
