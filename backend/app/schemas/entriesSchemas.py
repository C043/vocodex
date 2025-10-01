from typing import Sequence
from pydantic import BaseModel, Field
from sqlalchemy import Row

from app.models.entry import Entries


class UploadTextIn(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(max_length=1000)
    user_id: int


class UploadTextOut(BaseModel):
    id: int


class ListEntriesIn(BaseModel):
    user_id: int


class EntrySummary(BaseModel):
    id: int
    title: str


class ListEntriesOut(BaseModel):
    entries: list[EntrySummary]
