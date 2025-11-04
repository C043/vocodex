from pydantic import BaseModel


class UserPreferencesIn(BaseModel):
    speed: str
    voice: str
