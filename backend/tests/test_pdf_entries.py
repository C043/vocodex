import io, os, pytest
from fastapi import HTTPException
from pypdf import PdfReader

from app.controllers import pdfController
from app.models.user import Users
from app.security import create_access_token, hash_password


def make_pdf(
    pages: list[str | None],
    title: str | None = None,
    inherited_media_box: bool = False,
) -> bytes:
    """
    Builds a small but valid PDF: one page per item, with the text drawn in
    Helvetica, or an empty page (like a scanned image) when the item is None.
    """
    objects: list[bytes] = []
    page_ids = [3 + 2 * i for i in range(len(pages))]
    font_id = 3 + 2 * len(pages)
    info_id = font_id + 1

    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    # The page size can be set once on the page tree, for all the pages
    tree_box, page_box = (
        ("/MediaBox [0 0 612 792] ", "") if inherited_media_box else ("", "/MediaBox [0 0 612 792] ")
    )
    objects.append(
        f"<< /Type /Pages {tree_box}/Kids [{kids}] /Count {len(pages)} >>".encode()
    )
    for pid, text in zip(page_ids, pages):
        objects.append(
            (
                f"<< /Type /Page /Parent 2 0 R {page_box}"
                f"/Resources << /Font << /F1 {font_id} 0 R >> >> "
                f"/Contents {pid + 1} 0 R >>"
            ).encode()
        )
        stream = f"BT /F1 12 Tf 72 712 Td ({text}) Tj ET".encode() if text else b""
        objects.append(
            b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream)
        )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(f"<< /Title ({title}) >>".encode() if title else b"<< >>")

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (number, body)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for offset in offsets:
        out += b"%010d 00000 n \n" % offset
    out += (
        b"trailer\n<< /Size %d /Root 1 0 R /Info %d 0 R >>\nstartxref\n%d\n%%%%EOF\n"
        % (len(objects) + 1, info_id, xref)
    )
    return bytes(out)


def upload(client, headers, data: bytes, filename="book.pdf"):
    return client.post(
        "/entries/pdf",
        headers=headers,
        files={"file": (filename, data, "application/pdf")},
    )


class TestParsePdf:
    def test_uses_metadata_title(self):
        parsed = pdfController.parsePdf(
            make_pdf(["Hello there", "Second page"], title="A Good Book"), "x.pdf"
        )
        assert parsed.title == "A Good Book"
        assert parsed.pages == 2

    def test_falls_back_to_file_name(self):
        parsed = pdfController.parsePdf(make_pdf(["Hello"]), "My Notes.pdf")
        assert parsed.title == "My Notes"

    def test_accepts_pdf_whose_first_page_is_an_image(self):
        parsed = pdfController.parsePdf(make_pdf([None, "Text later"]), "a.pdf")
        assert parsed.pages == 2

    @pytest.mark.parametrize(
        "data, status",
        [
            (b"just some text", 415),
            (b"%PDF-1.4\nthis is not really a pdf", 422),
            (make_pdf([None, None]), 422),
        ],
        ids=["not a pdf", "broken pdf", "scanned pdf"],
    )
    def test_rejects_unreadable_files(self, data, status):
        with pytest.raises(HTTPException) as exc:
            pdfController.parsePdf(data, "a.pdf")
        assert exc.value.status_code == status


def page_tree_nodes(data: bytes):
    """Every node of the page tree, with its depth"""
    root = PdfReader(io.BytesIO(data)).trailer["/Root"]["/Pages"].get_object()
    nodes, stack = [], [(root, 0)]
    while stack:
        node, depth = stack.pop()
        nodes.append((node, depth))
        if node.get("/Type") == "/Pages":
            stack.extend((kid.get_object(), depth + 1) for kid in node["/Kids"])
    return nodes


class TestOptimizePdf:
    def test_balances_a_flat_page_tree(self):
        texts = [f"Page number {i}" for i in range(1, 301)]

        data = pdfController.optimizePdf(make_pdf(texts))

        nodes = page_tree_nodes(data)
        trees = [node for node, _ in nodes if node["/Type"] == "/Pages"]
        assert all(len(node["/Kids"]) <= pdfController.PAGE_TREE_FANOUT for node in trees)
        # A few steps reach any page: log16(300) rounded up
        assert max(depth for _, depth in nodes) <= 3
        for node in trees:
            assert node["/Count"] == sum(
                kid.get_object()["/Count"] if kid.get_object()["/Type"] == "/Pages" else 1
                for kid in node["/Kids"]
            )
            for kid in node["/Kids"]:
                assert kid.get_object()["/Parent"].get_object() == node

    def test_keeps_the_pages_in_order(self):
        texts = [f"Page number {i}" for i in range(1, 41)]

        reader = PdfReader(io.BytesIO(pdfController.optimizePdf(make_pdf(texts))))

        assert [page.extract_text() for page in reader.pages] == texts

    def test_keeps_inherited_page_sizes_and_metadata(self):
        data = make_pdf(["One", "Two"] * 20, title="Kept", inherited_media_box=True)

        reader = PdfReader(io.BytesIO(pdfController.optimizePdf(data)))

        assert reader.metadata.title == "Kept"
        assert all(
            [float(v) for v in page.mediabox] == [0, 0, 612, 792]
            for page in reader.pages
        )


@pytest.mark.asyncio
async def test_pdf_upload_saves_entry_and_file(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    data = make_pdf(["Reading a PDF aloud", "One page after the other"], "Aloud")

    resp = await upload(client, headers, data)
    assert resp.status_code == 201
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 200
    entry = resp.json()
    assert entry["title"] == "Aloud"
    assert entry["kind"] == "pdf"
    assert entry["content"] == ""
    assert entry["progress"] == 0
    assert "data" not in entry

    resp = await client.get(f"/entries/{entryId}/file", headers=headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    # The file is stored optimized for reading, with the same pages
    stored = PdfReader(io.BytesIO(resp.content))
    assert [page.extract_text() for page in stored.pages] == [
        "Reading a PDF aloud",
        "One page after the other",
    ]

    resp = await client.get("/entries/list/me", headers=headers)
    assert [(e["id"], e["kind"]) for e in resp.json()["entries"]] == [
        (entryId, "pdf")
    ]

    # Deleting the entry deletes its file too
    resp = await client.delete(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 204
    resp = await client.get(f"/entries/{entryId}/file", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_text_entries_have_text_kind(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    resp = await client.post(
        "/entries/text", headers=headers, json={"title": "t", "content": "Some text"}
    )
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.json()["kind"] == "text"
    resp = await client.get(f"/entries/{entryId}/file", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_pdf_upload_rejects_scanned_pdf(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    resp = await upload(client, headers, make_pdf([None]))
    assert resp.status_code == 422
    assert "no readable text" in resp.json()["detail"]

    resp = await client.get("/entries/list/me", headers=headers)
    assert resp.json()["entries"] == []


@pytest.mark.asyncio
async def test_pdf_file_is_private(
    client, db_session, user_cleanup, entry_cleanup, auth_header
):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    resp = await upload(client, headers, make_pdf(["Mine only"]))
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    user_cleanup("pdf-other-user")
    other = Users(username="pdf-other-user", hashed_password=hash_password("x"))
    db_session.add(other)
    await db_session.commit()
    await db_session.refresh(other)
    token = create_access_token(other.id, other.username, other.preferences)

    resp = await client.get(
        f"/entries/{entryId}/file", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 404


@pytest.fixture
async def pdf_entry(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    data = make_pdf(["Some pages", "to read"] * 20)
    resp = await upload(client, headers, data)
    entryId = resp.json()["id"]
    entry_cleanup(entryId)
    # The stored file, as optimized on upload
    stored = (await client.get(f"/entries/{entryId}/file", headers=headers)).content
    return entryId, stored, headers


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "header, start, end",
    [("bytes=0-9", 0, 9), ("bytes=100-", 100, None), ("bytes=-16", -16, None)],
    ids=["closed range", "open range", "suffix range"],
)
async def test_pdf_file_serves_byte_ranges(client, pdf_entry, header, start, end):
    entryId, data, headers = pdf_entry
    expected = data[start:] if end is None else data[start : end + 1]
    first = start if start >= 0 else len(data) + start

    resp = await client.get(
        f"/entries/{entryId}/file", headers={**headers, "Range": header}
    )

    assert resp.status_code == 206
    assert resp.content == expected
    assert resp.headers["content-range"] == (
        f"bytes {first}-{first + len(expected) - 1}/{len(data)}"
    )
    assert resp.headers["accept-ranges"] == "bytes"


@pytest.mark.asyncio
async def test_pdf_file_range_past_the_end_is_clipped(client, pdf_entry):
    entryId, data, headers = pdf_entry

    resp = await client.get(
        f"/entries/{entryId}/file",
        headers={**headers, "Range": f"bytes=10-{len(data) + 500}"},
    )

    assert resp.status_code == 206
    assert resp.content == data[10:]


@pytest.mark.asyncio
async def test_pdf_file_rejects_unsatisfiable_range(client, pdf_entry):
    entryId, data, headers = pdf_entry

    resp = await client.get(
        f"/entries/{entryId}/file",
        headers={**headers, "Range": f"bytes={len(data)}-"},
    )

    assert resp.status_code == 416
    assert resp.headers["content-range"] == f"bytes */{len(data)}"


@pytest.mark.asyncio
async def test_pdf_file_ignores_malformed_ranges(client, pdf_entry):
    entryId, data, headers = pdf_entry

    resp = await client.get(
        f"/entries/{entryId}/file", headers={**headers, "Range": "lines=1-2"}
    )

    assert resp.status_code == 200
    assert resp.content == data
    assert resp.headers["accept-ranges"] == "bytes"


@pytest.mark.asyncio
async def test_browsers_can_read_the_content_range(client, pdf_entry):
    entryId, data, headers = pdf_entry

    resp = await client.get(
        f"/entries/{entryId}/file",
        headers={**headers, "Range": "bytes=0-9", "Origin": "http://localhost:3000"},
    )

    exposed = resp.headers["access-control-expose-headers"].lower()
    assert "content-range" in exposed


@pytest.mark.asyncio
async def test_pdf_upload_stores_the_optimized_file(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header
    resp = await upload(client, headers, make_pdf([f"Page {i}" for i in range(40)]))
    entryId = resp.json()["id"]
    entry_cleanup(entryId)

    stored = (await client.get(f"/entries/{entryId}/file", headers=headers)).content
    root = PdfReader(io.BytesIO(stored)).trailer["/Root"]["/Pages"]
    assert len(root["/Kids"]) <= pdfController.PAGE_TREE_FANOUT
    assert root["/Count"] == 40
