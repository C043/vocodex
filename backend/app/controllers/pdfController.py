import io
from dataclasses import dataclass
from pathlib import PurePath

from fastapi import HTTPException
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject,
    DictionaryObject,
    IndirectObject,
    NameObject,
    NumberObject,
)

TITLE_MAX_LENGTH = 1200
PDF_SIGNATURE = b"%PDF-"
# Most kids a node of the rebuilt page tree has
PAGE_TREE_FANOUT = 16


@dataclass
class ParsedPdf:
    title: str
    pages: int


def parsePdf(data: bytes, filename: str | None) -> ParsedPdf:
    """
    Checks that the upload is a readable PDF with selectable text, and picks
    a title from its metadata or, failing that, from the file name.
    The text itself is extracted by the reader, page by page, while playing.
    """
    # The signature may come after a few bytes of junk, as PDF readers allow
    if PDF_SIGNATURE not in data[:1024]:
        raise HTTPException(status_code=415, detail="The file is not a PDF")

    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted and not reader.decrypt(""):
            raise HTTPException(
                status_code=422, detail="Password protected PDFs are not supported"
            )
        pages = len(reader.pages)
        # Scanned documents are only images: there is nothing to read aloud.
        # Stops at the first page with text, so long books are checked quickly
        hasText = any((page.extract_text() or "").strip() for page in reader.pages)
        metadataTitle = (reader.metadata.title if reader.metadata else None) or ""
    except HTTPException:
        raise
    except Exception:
        # Broken files make pypdf fail in many different ways
        raise HTTPException(status_code=422, detail="The PDF could not be read")

    if pages == 0 or not hasText:
        raise HTTPException(
            status_code=422,
            detail="This PDF has no readable text (it may be a scanned document)",
        )

    title = metadataTitle.strip() or PurePath(filename or "").stem.strip() or "PDF"
    return ParsedPdf(title=title[:TITLE_MAX_LENGTH], pages=pages)


def optimizePdf(data: bytes) -> bytes:
    """
    Rewrites the PDF so the reader can open any page of a long document
    quickly, downloading only that page.

    To find page N, pdf.js visits the page tree in order. Many PDFs list all
    their pages in one flat array, so reaching page 300 means downloading the
    300 pages before it. Here the pages are regrouped into a balanced tree of
    at most PAGE_TREE_FANOUT kids per node, reached in a few steps.
    Slow on big files, but it is done once, on upload.
    """
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(data)))
    root = writer.root_object["/Pages"]
    rootRef = root.indirect_reference
    root = root.get_object()

    # Listing the pages also copies the attributes they inherit from the old
    # tree nodes (page size, resources…) onto each page
    level: list[tuple[IndirectObject, int]] = [
        (page.indirect_reference, 1) for page in writer.pages
    ]

    while len(level) > PAGE_TREE_FANOUT:
        groups = [
            level[i : i + PAGE_TREE_FANOUT]
            for i in range(0, len(level), PAGE_TREE_FANOUT)
        ]
        level = [_pageTreeNode(writer, group) for group in groups]

    for kid, _ in level:
        kid.get_object()[NameObject("/Parent")] = rootRef
    root[NameObject("/Kids")] = ArrayObject(kid for kid, _ in level)
    root[NameObject("/Count")] = NumberObject(sum(count for _, count in level))

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _pageTreeNode(
    writer: PdfWriter, kids: list[tuple[IndirectObject, int]]
) -> tuple[IndirectObject, int]:
    count = sum(kidCount for _, kidCount in kids)
    node = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Pages"),
            NameObject("/Kids"): ArrayObject(kid for kid, _ in kids),
            NameObject("/Count"): NumberObject(count),
        }
    )
    ref = writer._add_object(node)
    for kid, _ in kids:
        kid.get_object()[NameObject("/Parent")] = ref
    return ref, count
