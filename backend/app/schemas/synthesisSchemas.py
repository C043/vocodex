from pydantic import BaseModel


class SynthesisIn(BaseModel):
    text: str
    voice: str
