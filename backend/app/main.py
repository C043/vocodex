from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

app = FastAPI()
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

import os

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_async_engine(DATABASE_URL, echo=False)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/db")
async def db():
    async with engine.connect() as conn:
        r = await conn.execute(text("select 1"))
        return {"db": "ok", "result": [*r.fetchone()]}
