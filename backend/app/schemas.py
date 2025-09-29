from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    username: str
    password: str = Field(min_length=4)


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str


class TokenOut(BaseModel):
    token: str
    token_type: str = "bearer"


class UploadTextIn(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(max_length=1000)
    user_id: int


class UploadTextOut(BaseModel):
    id: int
