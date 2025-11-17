from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy import text

from app.models.base import Base
from app.middlewares.auth import AuthMiddleware
from app.routers import entries, synthesis, user

from .db import get_session

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is needed")

engine = create_async_engine(DATABASE_URL, echo=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is needed")

    engine = create_async_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=1800,
        echo=True,
    )
    app.state.engine = engine
    app.state.sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield
    finally:
        await engine.dispose()


app = FastAPI(lifespan=lifespan)

from app.errorHandler.errorHandler import registerExceptionHandlers

registerExceptionHandlers(app)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
app.add_middleware(AuthMiddleware, protected_paths=("/upload",))

# Routers
from .routers import auth

app.include_router(auth.router)
app.include_router(entries.router)
app.include_router(synthesis.router)
app.include_router(user.router)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/db/health")
async def db_health(session: AsyncSession = Depends(get_session)) -> dict:
    row = await session.execute(text("select 1"))
    return {"db": "ok", "result": row.scalar_one()}
