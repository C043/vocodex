import subprocess
import uuid
from pathlib import Path


async def speak(text: str, voice: str, speed: str) -> str:
    out_path = Path(f"/tmp/{uuid.uuid4()}.mp3")
    subprocess.run(
        [
            "edge-tts",
            "--text",
            text,
            "--voice",
            voice,
            "--rate",
            speed,
            "--write-media",
            str(out_path),
        ]
    )
    return str(out_path)
