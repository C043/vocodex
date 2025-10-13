import subprocess
import uuid
from pathlib import Path


async def speak(text: str, voice: str) -> str:
    out_path = Path(f"/tmp/{uuid.uuid4()}.mp3")
    subprocess.run(
        [
            "edge-tts",
            "--text",
            text,
            "--voice",
            voice,
            "--rate",
            "+0%",
            "--write-media",
            str(out_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return str(out_path)
