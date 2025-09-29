from typing import Sequence
from pydantic import BaseModel, Field
from sqlalchemy import Row

from app.models.entry import Entries


class UploadTextIn(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(max_length=1000)
    user_id: int
    token: str


class UploadTextOut(BaseModel):
    id: int


class ListEntriesIn(BaseModel):
    user_id: int


class ListEntriesOut(BaseModel):
    entries: Sequence[Row[tuple[int, str]]]
