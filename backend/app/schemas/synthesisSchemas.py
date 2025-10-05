from pydantic import BaseModel


class SynthesisIn(BaseModel):
    text: str
    speed: str
    voice: str
