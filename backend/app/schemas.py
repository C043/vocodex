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
