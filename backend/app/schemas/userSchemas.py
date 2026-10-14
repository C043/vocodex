from typing import Annotated, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# Zoom levels match the player's size controls
ZoomLevel = Annotated[int, Field(ge=1, le=4)]

# Reader fonts match the player's font select
ReaderFont = Literal[
    "literata",
    "merriweather",
    "lora",
    "georgia",
    "inter",
    "roboto",
    "open-sans",
    "atkinson",
]


class ZoomPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: Optional[ZoomLevel] = None
    pdf: Optional[ZoomLevel] = None


class UserPreferencesIn(BaseModel):
    """Only the preferences sent are changed"""

    speed: Optional[str] = None
    voice: Optional[str] = None
    zoom: Optional[ZoomPreferences] = None
    font: Optional[ReaderFont] = None
