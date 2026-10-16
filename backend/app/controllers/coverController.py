import io
import json

import pypdfium2
from PIL import Image

# Covers are shown small in the list of entries: twice that size keeps
# them sharp on high density screens
COVER_SIZE = (240, 360)
COVER_MEDIA_TYPE = "image/jpeg"


def thumbnail(data: bytes) -> bytes | None:
    """The picture shrunk to fit COVER_SIZE as a JPEG, or None if unreadable"""
    try:
        image = Image.open(io.BytesIO(data))
        image.thumbnail(COVER_SIZE)
        return _jpeg(image)
    except Exception:
        # Broken pictures make Pillow fail in many different ways
        return None


def pdfCover(data: bytes) -> bytes | None:
    """The first page of the PDF rendered to fit COVER_SIZE, or None"""
    try:
        pdf = pypdfium2.PdfDocument(data)
        try:
            page = pdf[0]
            width, height = page.get_size()
            scale = min(COVER_SIZE[0] / width, COVER_SIZE[1] / height)
            return _jpeg(page.render(scale=scale).to_pil())
        finally:
            pdf.close()
    except Exception:
        return None


def epubCoverImage(content: str) -> int | None:
    """
    The picture the book opens with, if any: the parser puts the declared
    cover first, and books without one usually start with their cover page
    """
    blocks = json.loads(content).get("blocks", [])
    if blocks and blocks[0]["kind"] == "image":
        return blocks[0]["image"]
    return None


def _jpeg(image: Image.Image) -> bytes:
    if image.mode != "RGB":
        # JPEG has no transparency: lay the picture on white
        rgba = image.convert("RGBA")
        image = Image.new("RGB", rgba.size, "white")
        image.paste(rgba, mask=rgba)
    out = io.BytesIO()
    image.save(out, "JPEG", quality=82, optimize=True)
    return out.getvalue()
