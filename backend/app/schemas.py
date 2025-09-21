from pydantic import BaseModel, Field


class RegisterIn(BaseModel):
    password: str = Field(min_length=8)
    username: str


class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    username: str


class TokenOut(BaseModel):
    token: str
    token_type: str = "bearer"
