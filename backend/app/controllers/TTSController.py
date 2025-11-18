import edge_tts
import uuid
from pathlib import Path


async def speak(text: str, voice: str) -> dict:
    audioPath = Path(f"/tmp/{uuid.uuid4()}.mp3")

    communicate = None
    if voice:
        communicate = edge_tts.Communicate(text, voice, rate="+0%")
    else:
        communicate = edge_tts.Communicate(text, rate="+0%")

    audioChunks = []
    boundaries = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio" and "data" in chunk:
            audioChunks.append(chunk["data"])
        elif (
            chunk["type"] == "WordBoundary"
            and "text" in chunk
            and "offset" in chunk
            and "duration" in chunk
        ):
            boundaries.append(
                {
                    "text": chunk["text"],
                    "start": chunk["offset"] / 10_000_000,
                    "end": (chunk["offset"] + chunk["duration"]) / 10_000_000,
                }
            )

    with open(audioPath, "wb") as audioFile:
        for chunk in audioChunks:
            audioFile.write(chunk)

    return {"audioPath": str(audioPath), "boundaries": boundaries}
