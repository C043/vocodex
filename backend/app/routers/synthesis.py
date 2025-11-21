import base64
import os
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from app.schemas.synthesisSchemas import SynthesisIn
from app.controllers import TTSController

router = APIRouter(prefix="/synthesis", tags=["synthesis"])


@router.post("/GET", status_code=200)
async def speak(
    data: SynthesisIn,
    background_task: BackgroundTasks,
):
    speakResult = await TTSController.speak(data.text, data.voice)
    audioPath = speakResult["audioPath"]
    boundaries = speakResult["boundaries"]

    background_task.add_task(os.remove, audioPath)

    with open(audioPath, "rb") as audioFile:
        audioBytes = audioFile.read()
        audioBase64 = base64.b64encode(audioBytes).decode("utf-8")

    return JSONResponse(content={"audio": audioBase64, "boundaries": boundaries})
