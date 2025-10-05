from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.schemas.synthesisSchemas import SynthesisIn
from app.controllers import TTSController

router = APIRouter(prefix="/synthesis", tags=["synthesis"])


@router.post("/GET", status_code=200)
async def speak(
    data: SynthesisIn,
):
    path = await TTSController.speak(data.text, data.voice, data.speed)
    return FileResponse(path, media_type="audio/mpeg", filename="output.mp3")
