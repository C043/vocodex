import io
import posixpath
import zipfile
from dataclasses import dataclass
from pathlib import PurePath
from urllib.parse import unquote

import lxml.html
from fastapi import HTTPException
from lxml import etree

TITLE_MAX_LENGTH = 1200
# Books are mostly text: anything bigger once unzipped is not worth reading
# (and keeps zip bombs out)
MAX_UNPACKED_BYTES = 50 * 1024 * 1024

CONTAINER_PATH = "META-INF/container.xml"
ENCRYPTION_PATH = "META-INF/encryption.xml"
CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container"
OPF_NS = "http://www.idpf.org/2007/opf"
DC_NS = "http://purl.org/dc/elements/1.1/"
OPS_NS = "http://www.idpf.org/2007/ops"
XMLENC_NS = "http://www.w3.org/2001/04/xmlenc#"

# Elements that start a new paragraph of the text
BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "body", "dd", "div", "dl",
    "dt", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hr", "li", "nav", "ol", "p", "pre", "section", "table", "td",
    "th", "tr", "ul",
}  # fmt: skip
SKIPPED_TAGS = {"head", "script", "style", "template"}
# Headings are marked like in Markdown, so the reader can show them as such
HEADING_MARKS = {
    "h1": "# ",
    "h2": "# ",
    "h3": "## ",
    "h4": "## ",
    "h5": "## ",
    "h6": "## ",
}
# Stands for a <br> while the text is gathered: control characters cannot
# appear in XML, so it never comes from the book itself
LINE_BREAK = "\x0b"
# Note markers and the notes themselves would interrupt the reading
SKIPPED_EPUB_TYPES = {"noteref", "footnote", "endnote", "rearnote"}

XML_PARSER = etree.XMLParser(resolve_entities=False, no_network=True)


@dataclass
class ParsedEpub:
    title: str
    content: str


class _Unpacker:
    """Reads files out of the EPUB, within a total MAX_UNPACKED_BYTES"""

    def __init__(self, zf: zipfile.ZipFile):
        self.zf = zf
        self.unpacked = 0

    def read(self, path: str) -> bytes:
        self.unpacked += self.zf.getinfo(path).file_size
        if self.unpacked > MAX_UNPACKED_BYTES:
            raise HTTPException(status_code=413, detail="The EPUB is too large")
        return self.zf.read(path)


def parseEpub(data: bytes, filename: str | None) -> ParsedEpub:
    """
    Turns an EPUB into a plain text entry: the chapters in reading order,
    one paragraph per heading, paragraph or list item. A title is taken from
    its metadata or, failing that, from the file name.
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
        zf.getinfo(CONTAINER_PATH)
    except (zipfile.BadZipFile, KeyError):
        raise HTTPException(status_code=415, detail="The file is not an EPUB")

    try:
        unpacker = _Unpacker(zf)
        opfPath = (
            etree.fromstring(unpacker.read(CONTAINER_PATH), XML_PARSER)
            .find(f".//{{{CONTAINER_NS}}}rootfile")
            .get("full-path")
        )
        opf = etree.fromstring(unpacker.read(opfPath), XML_PARSER)
        chapters = _spinePaths(opf, posixpath.dirname(opfPath))

        if _encryptedPaths(unpacker) & set(chapters):
            raise HTTPException(
                status_code=422, detail="DRM protected EPUBs are not supported"
            )

        paragraphs = [
            paragraph
            for path in chapters
            for paragraph in _paragraphs(unpacker.read(path))
        ]
        metadataTitle = opf.findtext(f".//{{{DC_NS}}}title") or ""
    except HTTPException:
        raise
    except Exception:
        # Broken books fail in many different ways
        raise HTTPException(status_code=422, detail="The EPUB could not be read")

    if not paragraphs:
        raise HTTPException(status_code=422, detail="This EPUB has no readable text")

    title = metadataTitle.strip() or PurePath(filename or "").stem.strip() or "EPUB"
    return ParsedEpub(title=title[:TITLE_MAX_LENGTH], content="\n\n".join(paragraphs))


def _spinePaths(opf: etree._Element, opfDir: str) -> list[str]:
    """Paths in the zip of the documents read in order, skipping the extras"""
    hrefs = {
        item.get("id"): item.get("href")
        for item in opf.iterfind(f".//{{{OPF_NS}}}manifest/{{{OPF_NS}}}item")
    }
    return [
        posixpath.normpath(posixpath.join(opfDir, unquote(hrefs[ref.get("idref")])))
        for ref in opf.iterfind(f".//{{{OPF_NS}}}spine/{{{OPF_NS}}}itemref")
        if ref.get("linear") != "no"
    ]


def _encryptedPaths(unpacker: _Unpacker) -> set[str]:
    if ENCRYPTION_PATH not in unpacker.zf.namelist():
        return set()
    encryption = etree.fromstring(unpacker.read(ENCRYPTION_PATH), XML_PARSER)
    return {
        posixpath.normpath(unquote(ref.get("URI", "")))
        for ref in encryption.iterfind(f".//{{{XMLENC_NS}}}CipherReference")
    }


def _localName(el: etree._Element) -> str:
    return el.tag.rsplit("}", 1)[-1].lower() if isinstance(el.tag, str) else ""


def _isSkipped(el: etree._Element) -> bool:
    if not isinstance(el.tag, str) or _localName(el) in SKIPPED_TAGS:
        # Comments and processing instructions too
        return True
    epubType = el.get(f"{{{OPS_NS}}}type") or el.get("epub:type") or ""
    return not SKIPPED_EPUB_TYPES.isdisjoint(epubType.split())


def _paragraphs(document: bytes) -> list[str]:
    """
    The paragraphs of a chapter, with the line breaks of the book kept as
    "\n" inside them (verses, addresses…) and headings marked with "#"
    """
    try:
        root = etree.fromstring(document, XML_PARSER)
    except etree.XMLSyntaxError:
        # Not well formed XHTML (e.g. HTML entities): read it as HTML
        root = lxml.html.document_fromstring(document)

    paragraphs: list[str] = []
    current: list[str] = []
    # Block elements being read, the innermost last
    blocks: list[str] = []

    def flush():
        mark = HEADING_MARKS.get(blocks[-1], "") if blocks else ""
        lines = [" ".join(line.split()) for line in "".join(current).split(LINE_BREAK)]
        current.clear()
        # An empty line, like two <br> between stanzas, splits the paragraph
        paragraph: list[str] = []
        for line in lines + [""]:
            if line:
                paragraph.append(line)
            elif paragraph:
                paragraphs.append(mark + "\n".join(paragraph))
                paragraph = []

    def walk(el: etree._Element):
        if not _isSkipped(el):
            tag = _localName(el)
            isBlock = tag in BLOCK_TAGS
            if isBlock:
                flush()
                blocks.append(tag)
            if tag == "br":
                current.append(LINE_BREAK)
            current.append(el.text or "")
            for child in el:
                walk(child)
            if isBlock:
                flush()
                blocks.pop()
        current.append(el.tail or "")

    walk(root)
    flush()
    return paragraphs
