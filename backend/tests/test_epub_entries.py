import io, json, os, zipfile, pytest
from fastapi import HTTPException

from app.controllers import epubController
from app.models.user import Users
from app.security import create_access_token, hash_password

CONTAINER_XML = """<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""


def chapter(body: str) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Ignored</title><style>p {{ color: red; }}</style></head>
  <body>{body}</body>
</html>
"""


PNG = b"\x89PNG\r\n\x1a\n fake png"
JPEG = b"\xff\xd8\xff fake jpeg"


def make_epub(
    chapters: list[tuple[str, str]],
    title: str | None = "A Little Book",
    spine: list[str] | None = None,
    non_linear: tuple[str, ...] = (),
    encrypted: tuple[str, ...] = (),
    images: dict[str, tuple[str, bytes]] | None = None,
    cover: str | None = None,
) -> bytes:
    """
    Builds a small but valid EPUB: chapters are (file name, body html) pairs,
    read in the given order unless spine lists their names in another one.
    Images are {path in OEBPS: (media type, bytes)}; cover is the path of the
    one declared as the cover.
    """
    images = images or {}
    manifest = "\n".join(
        [
            f'<item id="{name}" href="text/{name}" media-type="application/xhtml+xml"/>'
            for name, _ in chapters
        ]
        + [
            f'<item id="img{i}" href="{path}" media-type="{mediaType}"'
            f'{" properties=\"cover-image\"" if path == cover else ""}/>'
            for i, (path, (mediaType, _)) in enumerate(images.items())
        ]
    )
    itemrefs = "\n".join(
        f'<itemref idref="{name}"{" linear=\"no\"" if name in non_linear else ""}/>'
        for name in spine or [name for name, _ in chapters]
    )
    metadata_title = f"<dc:title>{title}</dc:title>" if title else ""
    opf = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">urn:uuid:1234</dc:identifier>
    {metadata_title}
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="css" href="style.css" media-type="text/css"/>
    {manifest}
  </manifest>
  <spine>{itemrefs}</spine>
</package>
"""
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as zf:
        # The mimetype comes first and uncompressed, as the format requires
        zf.writestr("mimetype", "application/epub+zip", zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER_XML)
        if encrypted:
            refs = "".join(
                f'<enc:EncryptedData><enc:CipherData><enc:CipherReference URI="{uri}"/>'
                "</enc:CipherData></enc:EncryptedData>"
                for uri in encrypted
            )
            zf.writestr(
                "META-INF/encryption.xml",
                '<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" '
                f'xmlns:enc="http://www.w3.org/2001/04/xmlenc#">{refs}</encryption>',
            )
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/style.css", "p { margin: 0 }")
        for name, body in chapters:
            zf.writestr(f"OEBPS/text/{name}", chapter(body))
        for path, (_, data) in images.items():
            zf.writestr(f"OEBPS/{path}", data)
    return out.getvalue()


def upload(client, headers, data: bytes, filename="book.epub"):
    return client.post(
        "/entries/epub",
        headers=headers,
        files={"file": (filename, data, "application/epub+zip")},
    )


def para(text: str, *styles: tuple[int, int, str]) -> dict:
    return block("paragraph", text, *styles)


def block(kind: str, text: str, *styles: tuple[int, int, str]) -> dict:
    out = {"kind": kind, "text": text}
    if styles:
        out["styles"] = [
            {"start": start, "end": end, "style": style} for start, end, style in styles
        ]
    return out


BREAK = {"kind": "break"}


def image(id: int, alt: str = "") -> dict:
    return {"kind": "image", "image": id, "alt": alt}


def parse(body: str, **kwargs) -> list[dict]:
    """The blocks of a book made of one chapter with the given body"""
    return epubController.parseEpub(
        make_epub([("c1.xhtml", body)], **kwargs), "x.epub"
    ).blocks


class TestParseEpub:
    def test_uses_metadata_title(self):
        parsed = epubController.parseEpub(
            make_epub([("c1.xhtml", "<p>Hello there.</p>")]), "x.epub"
        )
        assert parsed.title == "A Little Book"

    def test_falls_back_to_file_name(self):
        parsed = epubController.parseEpub(
            make_epub([("c1.xhtml", "<p>Hello there.</p>")], title=None),
            "My Novel.epub",
        )
        assert parsed.title == "My Novel"

    def test_reads_chapters_in_spine_order(self):
        data = make_epub(
            [
                ("b.xhtml", "<p>Second chapter.</p>"),
                ("a.xhtml", "<p>First chapter.</p>"),
            ],
            spine=["a.xhtml", "b.xhtml"],
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.blocks == [para("First chapter."), para("Second chapter.")]

    def test_keeps_headings_and_paragraphs_as_separate_blocks(self):
        blocks = parse("""
            <section>
              <h1>Chapter One</h1>
              <p>It was a  bright
                 cold day in April.</p>
              <div><p>The clocks were striking.</p></div>
              <ul><li>One item</li><li>Another item</li></ul>
            </section>
            """)

        assert blocks == [
            block("heading", "Chapter One"),
            para("It was a bright cold day in April."),
            para("The clocks were striking."),
            para("One item"),
            para("Another item"),
        ]

    def test_heading_levels(self):
        blocks = parse("<h2>Part One</h2><h3>A Section</h3><h6>Small</h6><p>Text.</p>")

        assert blocks == [
            block("heading", "Part One"),
            block("subheading", "A Section"),
            block("subheading", "Small"),
            para("Text."),
        ]

    def test_text_starting_like_a_heading_mark_stays_a_paragraph(self):
        assert parse("<p># 1 rule: be kind.</p>") == [para("# 1 rule: be kind.")]

    def test_keeps_line_breaks_inside_blocks(self):
        blocks = parse("""
            <p class="poem">
            How doth the little crocodile<br/>
                Improve his shining tail,<br/>
            And pour the waters
            of the Nile
            </p>
            <h2>CHAPTER II.<br/>The Pool of Tears</h2>
            """)

        assert blocks == [
            para(
                "How doth the little crocodile\n"
                "Improve his shining tail,\n"
                "And pour the waters of the Nile"
            ),
            block("heading", "CHAPTER II.\nThe Pool of Tears"),
        ]

    def test_blank_line_inside_a_block_starts_a_new_one(self):
        # Stanzas of a poem are often split by two line breaks
        blocks = parse("<p>First line,<br/>second line.<br/><br/>Next stanza.</p>")

        assert blocks == [para("First line,\nsecond line."), para("Next stanza.")]

    def test_reads_a_table_row_as_one_line(self):
        # Tables of contents put the chapter number and name in two cells
        blocks = parse("""
            <table>
              <tr><td> <a href="#c1">CHAPTER I.</a></td><td>Down the Rabbit-Hole</td></tr>
              <tr><td><p>CHAPTER II.</p></td><td><p>The Pool of Tears</p></td></tr>
            </table>
            """)

        assert blocks == [
            para("CHAPTER I. Down the Rabbit-Hole"),
            para("CHAPTER II. The Pool of Tears"),
        ]

    def test_turns_decorative_lines_into_scene_breaks(self):
        blocks = parse("""
            <p>Before.</p>
            <p>* * * * * * *</p>
            <p>* * *</p>
            <hr/>
            <p>After.</p>
            <p class="center">❦</p>
            <p>“…”</p>
            """)

        # Breaks in a row are one; dialogue made of punctuation is still read
        assert blocks == [para("Before."), BREAK, para("After."), BREAK, para("“…”")]

    def test_drops_scene_breaks_at_the_ends_of_the_book(self):
        assert parse("<hr/><p>Only.</p><p>~ ~ ~</p>") == [para("Only.")]

    def test_keeps_italic_and_bold(self):
        blocks = parse(
            "<p>Plain <i>italic words</i> and <b>bold</b>, "
            "<em><strong>both</strong></em>.</p>"
        )

        assert blocks == [
            para(
                "Plain italic words and bold, both.",
                (6, 18, "italic"),
                (23, 27, "bold"),
                (29, 33, "bold"),
                (29, 33, "italic"),
            )
        ]

    def test_reads_styles_set_in_the_style_attribute(self):
        blocks = parse(
            '<p><span style="font-style: italic">Slanted</span> and '
            '<span style="font-weight:700">heavy</span>.</p>'
        )

        assert blocks == [
            para("Slanted and heavy.", (0, 7, "italic"), (12, 17, "bold"))
        ]

    def test_styles_stop_at_line_breaks(self):
        blocks = parse("<p><i>Line one<br/>line two</i></p>")

        assert blocks == [
            para("Line one\nline two", (0, 8, "italic"), (9, 17, "italic"))
        ]

    def test_keeps_images_in_place(self):
        parsed = epubController.parseEpub(
            make_epub(
                [
                    (
                        "c1.xhtml",
                        '<p>Before.</p><p><img src="../images/fig%201.png" alt="A rabbit"/></p>'
                        '<p>After.</p><img src="../images/fig%201.png"/>'
                        '<svg xmlns="http://www.w3.org/2000/svg" '
                        'xmlns:xlink="http://www.w3.org/1999/xlink">'
                        '<image xlink:href="../images/map.jpg"/></svg>',
                    )
                ],
                images={
                    "images/fig 1.png": ("image/png", PNG),
                    "images/map.jpg": ("image/jpeg", JPEG),
                },
            ),
            "x.epub",
        )

        # The same picture twice is stored once
        assert parsed.blocks == [
            para("Before."),
            image(0, "A rabbit"),
            para("After."),
            image(0),
            image(1),
        ]
        assert parsed.images == [
            epubController.EpubImage("image/png", PNG),
            epubController.EpubImage("image/jpeg", JPEG),
        ]

    def test_skips_missing_remote_and_unsupported_images(self):
        parsed = epubController.parseEpub(
            make_epub(
                [
                    (
                        "c1.xhtml",
                        '<p>Text.</p><img src="../images/gone.png"/>'
                        '<img src="https://example.com/a.png"/>'
                        '<img src="../images/drawing.svg"/>',
                    )
                ],
                images={"images/drawing.svg": ("image/svg+xml", b"<svg/>")},
            ),
            "x.epub",
        )

        assert parsed.blocks == [para("Text.")]
        assert parsed.images == []

    def test_starts_with_the_cover(self):
        parsed = epubController.parseEpub(
            make_epub(
                [("c1.xhtml", "<p>Once upon a time.</p>")],
                images={"cover.jpg": ("image/jpeg", JPEG)},
                cover="cover.jpg",
            ),
            "x.epub",
        )

        assert parsed.blocks == [image(0), para("Once upon a time.")]
        assert parsed.images == [epubController.EpubImage("image/jpeg", JPEG)]

    def test_does_not_repeat_a_cover_shown_by_the_book(self):
        parsed = epubController.parseEpub(
            make_epub(
                [
                    ("cover.xhtml", '<img src="../cover.jpg" alt="Cover"/>'),
                    ("c1.xhtml", "<p>Once upon a time.</p>"),
                ],
                images={"cover.jpg": ("image/jpeg", JPEG)},
                cover="cover.jpg",
            ),
            "x.epub",
        )

        assert parsed.blocks == [image(0, "Cover"), para("Once upon a time.")]

    def test_leaves_out_styles_scripts_and_note_references(self):
        blocks = parse(
            '<script>track()</script><p>A claim.<a epub:type="noteref" '
            'href="#n1"><sup>1</sup></a> More text.</p>'
            '<aside epub:type="footnote" id="n1"><p>1. A source.</p></aside>'
        )

        assert blocks == [para("A claim. More text.")]

    def test_skips_non_linear_items(self):
        data = make_epub(
            [("c1.xhtml", "<p>Story.</p>"), ("notes.xhtml", "<p>Endnotes.</p>")],
            non_linear=("notes.xhtml",),
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.blocks == [para("Story.")]

    def test_ignores_obfuscated_fonts(self):
        # Font obfuscation also lists files in encryption.xml: it is not DRM
        blocks = parse("<p>Readable.</p>", encrypted=("OEBPS/fonts/a.otf",))

        assert blocks == [para("Readable.")]

    @pytest.mark.parametrize(
        "data, status",
        [
            (b"just some text", 415),
            (b"PK\x03\x04 a broken zip", 415),
            (
                make_epub(
                    [("c1.xhtml", "<p>Locked.</p>")], encrypted=("OEBPS/text/c1.xhtml",)
                ),
                422,
            ),
            (
                make_epub(
                    [("c1.xhtml", "<img src='../a.png'/><hr/>")],
                    images={"a.png": ("image/png", PNG)},
                ),
                422,
            ),
        ],
        ids=["not an epub", "broken zip", "drm protected", "no text"],
    )
    def test_rejects_unreadable_files(self, data, status):
        with pytest.raises(HTTPException) as exc:
            epubController.parseEpub(data, "a.epub")
        assert exc.value.status_code == status

    def test_rejects_zip_without_epub_container(self):
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w") as zf:
            zf.writestr("readme.txt", "hello")

        with pytest.raises(HTTPException) as exc:
            epubController.parseEpub(out.getvalue(), "a.epub")
        assert exc.value.status_code == 415

    def test_rejects_books_too_large_once_unpacked(self, monkeypatch):
        monkeypatch.setattr(epubController, "MAX_UNPACKED_BYTES", 100)
        data = make_epub([("c1.xhtml", "<p>" + "word " * 100 + "</p>")])

        with pytest.raises(HTTPException) as exc:
            epubController.parseEpub(data, "a.epub")
        assert exc.value.status_code == 413

    def test_images_count_toward_the_size_limit(self, monkeypatch):
        monkeypatch.setattr(epubController, "MAX_UNPACKED_BYTES", 2000)
        data = make_epub(
            [("c1.xhtml", '<p>Text.</p><img src="../big.png"/>')],
            images={"big.png": ("image/png", PNG * 200)},
        )

        with pytest.raises(HTTPException) as exc:
            epubController.parseEpub(data, "a.epub")
        assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_epub_upload_saves_book_entry(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    data = make_epub(
        [
            (
                "c1.xhtml",
                '<h1>One</h1><p>Reading a <i>book</i> aloud.</p><img src="../a.png"/>',
            )
        ],
        title="Aloud",
        images={"a.png": ("image/png", PNG)},
    )

    resp = await upload(client, headers, data)
    assert resp.status_code == 201
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 200
    entry = resp.json()
    assert entry["title"] == "Aloud"
    assert entry["kind"] == "epub"
    assert json.loads(entry["content"]) == {
        "blocks": [
            block("heading", "One"),
            para("Reading a book aloud.", (10, 14, "italic")),
            image(0),
        ]
    }
    assert entry["progress"] == 0

    resp = await client.get("/entries/list/me", headers=headers)
    assert [(e["id"], e["kind"]) for e in resp.json()["entries"]] == [(entryId, "epub")]

    resp = await client.get(f"/entries/{entryId}/images/0", headers=headers)
    assert resp.status_code == 200
    assert resp.content == PNG
    assert resp.headers["content-type"] == "image/png"
    # A book's pictures never change
    assert "immutable" in resp.headers["cache-control"]

    resp = await client.get(f"/entries/{entryId}/images/1", headers=headers)
    assert resp.status_code == 404

    # Deleting the entry deletes its pictures too
    resp = await client.delete(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 204
    resp = await client.get(f"/entries/{entryId}/images/0", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_epub_images_are_private(
    client, db_session, user_cleanup, entry_cleanup, auth_header
):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    data = make_epub(
        [("c1.xhtml", '<p>Mine.</p><img src="../a.png"/>')],
        images={"a.png": ("image/png", PNG)},
    )
    resp = await upload(client, headers, data)
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    user_cleanup("epub-other-user")
    other = Users(username="epub-other-user", hashed_password=hash_password("x"))
    db_session.add(other)
    await db_session.commit()
    await db_session.refresh(other)
    token = create_access_token(other.id, other.username, other.preferences)

    resp = await client.get(
        f"/entries/{entryId}/images/0", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404

    resp = await client.get(f"/entries/{entryId}/images/0")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_epub_upload_rejects_other_files(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    resp = await upload(client, headers, b"%PDF-1.4 not a book")
    assert resp.status_code == 415
    assert resp.json()["detail"] == "The file is not an EPUB"

    resp = await client.get("/entries/list/me", headers=headers)
    assert resp.json()["entries"] == []


@pytest.mark.asyncio
async def test_epub_upload_requires_auth(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    resp = await upload(client, {}, make_epub([("c1.xhtml", "<p>Hi there.</p>")]))
    assert resp.status_code == 401
