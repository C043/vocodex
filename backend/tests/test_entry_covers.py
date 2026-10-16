import io, json, os, pytest
from PIL import Image

from app.controllers import coverController
from app.models.user import Users
from app.security import create_access_token, hash_password
from test_epub_entries import make_epub, upload as upload_epub
from test_pdf_entries import make_pdf, upload as upload_pdf


def picture(size: tuple[int, int], fmt="PNG", mode="RGB") -> bytes:
    out = io.BytesIO()
    Image.new(mode, size, "red" if mode == "RGB" else (255, 0, 0, 0)).save(out, fmt)
    return out.getvalue()


def opened(data: bytes) -> Image.Image:
    return Image.open(io.BytesIO(data))


class TestThumbnail:
    def test_shrinks_to_fit_keeping_the_proportions(self):
        thumb = opened(coverController.thumbnail(picture((1200, 1800))))
        assert thumb.format == "JPEG"
        assert thumb.size == (240, 360)

        thumb = opened(coverController.thumbnail(picture((1000, 500))))
        assert thumb.size == (240, 120)

    def test_does_not_enlarge_small_pictures(self):
        thumb = opened(coverController.thumbnail(picture((100, 150))))
        assert thumb.size == (100, 150)

    def test_flattens_transparent_pictures(self):
        thumb = opened(coverController.thumbnail(picture((200, 300), mode="RGBA")))
        assert thumb.format == "JPEG"
        # Transparent pixels become white, not black
        assert thumb.getpixel((100, 150)) >= (250, 250, 250)

    def test_returns_none_for_unreadable_pictures(self):
        assert coverController.thumbnail(b"\x89PNG\r\n\x1a\n fake png") is None


class TestPdfCover:
    def test_renders_the_first_page(self):
        cover = opened(coverController.pdfCover(make_pdf(["Hello there", "Two"])))
        assert cover.format == "JPEG"
        # A letter page (612 x 792) fit in 240 x 360
        assert cover.size == (240, 311)
        # The page is white
        assert cover.getpixel((5, 5)) >= (250, 250, 250)

    def test_returns_none_for_broken_files(self):
        assert coverController.pdfCover(b"%PDF-1.4 broken") is None


class TestEpubCoverImage:
    def test_is_the_picture_the_book_opens_with(self):
        content = {"blocks": [{"kind": "image", "image": 2, "alt": ""}]}
        assert coverController.epubCoverImage(json.dumps(content)) == 2

    def test_is_none_when_the_book_opens_with_text(self):
        content = {
            "blocks": [
                {"kind": "paragraph", "text": "Hi."},
                {"kind": "image", "image": 0, "alt": ""},
            ]
        }
        assert coverController.epubCoverImage(json.dumps(content)) is None
        assert coverController.epubCoverImage(json.dumps({"blocks": []})) is None


def skip_without_db():
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")


@pytest.mark.asyncio
async def test_pdf_cover_is_its_first_page(client, entry_cleanup, auth_header):
    skip_without_db()
    headers, _ = auth_header

    resp = await upload_pdf(client, headers, make_pdf(["Hello there"]))
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}/cover", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"
    # A cover never changes
    assert "immutable" in resp.headers["cache-control"]
    assert opened(resp.content).size == (240, 311)

    # Made once, then kept
    again = await client.get(f"/entries/{entryId}/cover", headers=headers)
    assert again.content == resp.content


@pytest.mark.asyncio
async def test_epub_cover_is_its_opening_picture(client, entry_cleanup, auth_header):
    skip_without_db()
    headers, _ = auth_header
    data = make_epub(
        [("c1.xhtml", "<p>Once upon a time.</p>")],
        images={"cover.png": ("image/png", picture((600, 900)))},
        cover="cover.png",
    )

    resp = await upload_epub(client, headers, data)
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}/cover", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"
    assert opened(resp.content).size == (240, 360)


@pytest.mark.asyncio
async def test_entries_without_a_cover(client, entry_cleanup, auth_header):
    skip_without_db()
    headers, _ = auth_header

    resp = await upload_epub(
        client, headers, make_epub([("c1.xhtml", "<p>Only words.</p>")])
    )
    bookId = resp.json()["id"]
    entry_cleanup(bookId)
    resp = await client.post(
        "/entries/text", headers=headers, json={"title": "Note", "content": "Hello"}
    )
    textId = resp.json()["id"]
    entry_cleanup(textId)

    for entryId in (bookId, bookId, textId, 999_999_999):
        resp = await client.get(f"/entries/{entryId}/cover", headers=headers)
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_covers_are_private(
    client, db_session, user_cleanup, entry_cleanup, auth_header
):
    skip_without_db()
    headers, _ = auth_header
    resp = await upload_pdf(client, headers, make_pdf(["Mine"]))
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    user_cleanup("cover-other-user")
    other = Users(username="cover-other-user", hashed_password=hash_password("x"))
    db_session.add(other)
    await db_session.commit()
    await db_session.refresh(other)
    token = create_access_token(other.id, other.username, other.preferences)

    resp = await client.get(
        f"/entries/{entryId}/cover", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404

    resp = await client.get(f"/entries/{entryId}/cover")
    assert resp.status_code == 401
