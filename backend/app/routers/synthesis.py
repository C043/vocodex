import os
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from app.schemas.synthesisSchemas import SynthesisIn
from app.controllers import TTSController

router = APIRouter(prefix="/synthesis", tags=["synthesis"])


@router.post("/GET", status_code=200)
async def speak(
    data: SynthesisIn,
    background_task: BackgroundTasks,
):
    path = await TTSController.speak(data.text, data.voice)
    background_task.add_task(os.remove, path)
    return FileResponse(path, media_type="audio/mpeg", filename="output.mp3")
