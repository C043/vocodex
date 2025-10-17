from datetime import datetime
from pydantic import BaseModel, Field


class UploadTextIn(BaseModel):
    title: str = Field(max_length=1200)
    content: str = Field(min_length=3, max_length=10000)


class UploadTextOut(BaseModel):
    id: int


class EntrySummary(BaseModel):
    id: int
    title: str
    date: datetime


class ListEntriesOut(BaseModel):
    entries: list[EntrySummary]
