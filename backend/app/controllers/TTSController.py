import edge_tts
import uuid
from pathlib import Path


async def speak(text: str, voice: str) -> str:
    out_path = Path(f"/tmp/{uuid.uuid4()}.mp3")

    communicate = None
    if voice:
        communicate = edge_tts.Communicate(text, voice, rate="+0%")
    else:
        communicate = edge_tts.Communicate(text=text, rate="+0%")

    await communicate.save(str(out_path))

    return str(out_path)
