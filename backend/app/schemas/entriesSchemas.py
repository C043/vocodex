from typing import Sequence
from pydantic import BaseModel, Field
from sqlalchemy import Row

from app.models.entry import Entries


class UploadTextIn(BaseModel):
    title: str = Field(max_length=1200)
    content: str = Field(min_length=3, max_length=10000)


class UploadTextOut(BaseModel):
    id: int


class EntrySummary(BaseModel):
    id: int
    title: str


class ListEntriesOut(BaseModel):
    entries: list[EntrySummary]
