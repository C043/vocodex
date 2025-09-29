from pydantic import BaseModel, Field


class UploadTextIn(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(max_length=1000)
    user_id: int


class UploadTextOut(BaseModel):
    id: int
