import io, os, zipfile, pytest
from fastapi import HTTPException

from app.controllers import epubController

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


def make_epub(
    chapters: list[tuple[str, str]],
    title: str | None = "A Little Book",
    spine: list[str] | None = None,
    non_linear: tuple[str, ...] = (),
    encrypted: tuple[str, ...] = (),
) -> bytes:
    """
    Builds a small but valid EPUB: chapters are (file name, body html) pairs,
    read in the given order unless spine lists their names in another one.
    """
    manifest = "\n".join(
        f'<item id="{name}" href="text/{name}" media-type="application/xhtml+xml"/>'
        for name, _ in chapters
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
    return out.getvalue()


def upload(client, headers, data: bytes, filename="book.epub"):
    return client.post(
        "/entries/epub",
        headers=headers,
        files={"file": (filename, data, "application/epub+zip")},
    )


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

        assert parsed.content == "First chapter.\n\nSecond chapter."

    def test_keeps_headings_and_paragraphs_as_separate_paragraphs(self):
        data = make_epub(
            [
                (
                    "c1.xhtml",
                    """
                    <section>
                      <h1>Chapter One</h1>
                      <p>It was a  bright
                         cold day in <em>April</em>.</p>
                      <div><p>The clocks were striking.</p></div>
                      <ul><li>One item</li><li>Another item</li></ul>
                    </section>
                    """,
                )
            ]
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == (
            "# Chapter One\n\n"
            "It was a bright cold day in April.\n\n"
            "The clocks were striking.\n\n"
            "One item\n\n"
            "Another item"
        )

    def test_marks_heading_levels(self):
        data = make_epub(
            [
                (
                    "c1.xhtml",
                    "<h2>Part One</h2><h3>A Section</h3><h6>Small</h6><p>Text.</p>",
                )
            ]
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == "# Part One\n\n## A Section\n\n## Small\n\nText."

    def test_keeps_line_breaks_inside_paragraphs(self):
        data = make_epub(
            [
                (
                    "c1.xhtml",
                    """
                    <p class="poem">
                    How doth the little crocodile<br/>
                        Improve his shining tail,<br/>
                    And pour the waters
                    of the Nile
                    </p>
                    <h2>CHAPTER II.<br/>The Pool of Tears</h2>
                    """,
                )
            ]
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == (
            "How doth the little crocodile\n"
            "Improve his shining tail,\n"
            "And pour the waters of the Nile\n\n"
            "# CHAPTER II.\nThe Pool of Tears"
        )

    def test_blank_line_inside_a_paragraph_starts_a_new_one(self):
        # Stanzas of a poem are often split by two line breaks
        data = make_epub(
            [("c1.xhtml", "<p>First line,<br/>second line.<br/><br/>Next stanza.</p>")]
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == "First line,\nsecond line.\n\nNext stanza."

    def test_leaves_out_styles_scripts_and_note_references(self):
        data = make_epub(
            [
                (
                    "c1.xhtml",
                    '<script>track()</script><p>A claim.<a epub:type="noteref" '
                    'href="#n1"><sup>1</sup></a> More text.</p>'
                    '<aside epub:type="footnote" id="n1"><p>1. A source.</p></aside>',
                )
            ]
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == "A claim. More text."

    def test_skips_non_linear_items(self):
        data = make_epub(
            [("c1.xhtml", "<p>Story.</p>"), ("notes.xhtml", "<p>Endnotes.</p>")],
            non_linear=("notes.xhtml",),
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == "Story."

    def test_ignores_obfuscated_fonts(self):
        # Font obfuscation also lists files in encryption.xml: it is not DRM
        data = make_epub(
            [("c1.xhtml", "<p>Readable.</p>")], encrypted=("OEBPS/fonts/a.otf",)
        )

        parsed = epubController.parseEpub(data, "x.epub")

        assert parsed.content == "Readable."

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
            (make_epub([("c1.xhtml", "<img src='cover.jpg'/>")]), 422),
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


@pytest.mark.asyncio
async def test_epub_upload_saves_text_entry(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    data = make_epub(
        [("c1.xhtml", "<h1>One</h1><p>Reading a book aloud.</p>")], title="Aloud"
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
    assert entry["content"] == "# One\n\nReading a book aloud."
    assert entry["progress"] == 0

    resp = await client.get("/entries/list/me", headers=headers)
    assert [(e["id"], e["kind"]) for e in resp.json()["entries"]] == [(entryId, "epub")]


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
