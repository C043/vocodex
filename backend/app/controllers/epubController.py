import io
import mimetypes
import posixpath
import re
import zipfile
from dataclasses import dataclass
from pathlib import PurePath
from urllib.parse import unquote, urlsplit

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
XLINK_NS = "http://www.w3.org/1999/xlink"

# Elements that start a new block of the text
BLOCK_TAGS = {
    "address", "article", "aside", "blockquote", "body", "dd", "div", "dl",
    "dt", "figcaption", "figure", "footer", "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "li", "nav", "ol", "p", "pre", "section", "table", "tr", "ul",
}  # fmt: skip
HEADING_KINDS = {
    "h1": "heading", "h2": "heading",
    "h3": "subheading", "h4": "subheading", "h5": "subheading", "h6": "subheading",
}  # fmt: skip
TEXT_KINDS = {"heading", "subheading", "paragraph"}
SKIPPED_TAGS = {"head", "script", "style", "template"}
# Note markers and the notes themselves would interrupt the reading
SKIPPED_EPUB_TYPES = {"noteref", "footnote", "endnote", "rearnote"}

ITALIC, BOLD = 1, 2
STYLE_NAMES = {BOLD: "bold", ITALIC: "italic"}
ITALIC_TAGS = {"cite", "dfn", "em", "i", "var"}
BOLD_TAGS = {"b", "strong"}
ITALIC_CSS = re.compile(r"font-style\s*:\s*(italic|oblique)", re.IGNORECASE)
BOLD_CSS = re.compile(r"font-weight\s*:\s*(bold|bolder|[6-9]00)", re.IGNORECASE)

# Lines made only of these are scene breaks (* * *, ⁂, ❦…), not text to read
DECORATIONS = set("*·•∙⋅~-–—_=+#⁂❦❧☙✻✱✳✽✦✧❋◆◇○●§❖※|/\\ \n")
# Raster images only: SVG files can carry scripts
IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# Stands for a <br> while the text is gathered: control characters cannot
# appear in XML, so it never comes from the book itself
LINE_BREAK = "\x0b"

XML_PARSER = etree.XMLParser(resolve_entities=False, no_network=True)


@dataclass
class EpubImage:
    mediaType: str
    data: bytes


@dataclass
class ParsedEpub:
    """
    The book as a list of blocks, in reading order:
    - {"kind": "heading" | "subheading" | "paragraph", "text": str,
       "styles": [{"start", "end", "style": "italic" | "bold"}]}, where the
      text keeps the line breaks of the book and styles is left out if empty
    - {"kind": "break"}, a scene break
    - {"kind": "image", "image": index in images, "alt": str}
    """

    title: str
    blocks: list[dict]
    images: list[EpubImage]


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


class _Book:
    """The blocks and the images gathered while reading the chapters"""

    def __init__(self, unpacker: _Unpacker, mediaTypes: dict[str, str]):
        self.unpacker = unpacker
        self.mediaTypes = mediaTypes
        self.blocks: list[dict] = []
        self.images: list[EpubImage] = []
        self.imageIds: dict[str, int] = {}

    def addBreak(self):
        if self.blocks and self.blocks[-1]["kind"] != "break":
            self.blocks.append({"kind": "break"})

    def imageId(self, path: str) -> int | None:
        """Stores the picture at path once, or None if it cannot be shown"""
        if path in self.imageIds:
            return self.imageIds[path]
        mediaType = self.mediaTypes.get(path) or mimetypes.guess_type(path)[0]
        if mediaType not in IMAGE_TYPES or path not in self.unpacker.zf.namelist():
            return None
        self.images.append(EpubImage(mediaType, self.unpacker.read(path)))
        self.imageIds[path] = len(self.images) - 1
        return self.imageIds[path]

    def addImage(self, path: str, alt: str):
        imageId = self.imageId(path)
        if imageId is not None:
            alt = " ".join(alt.split())
            self.blocks.append({"kind": "image", "image": imageId, "alt": alt})


def parseEpub(data: bytes, filename: str | None) -> ParsedEpub:
    """
    Reads an EPUB into blocks of text, scene breaks and images, the chapters
    in reading order. A title is taken from its metadata or, failing that,
    from the file name.
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
        opfDir = posixpath.dirname(opfPath)
        items = _manifest(opf, opfDir)
        chapters = _spinePaths(opf, items)

        if _encryptedPaths(unpacker) & set(chapters):
            raise HTTPException(
                status_code=422, detail="DRM protected EPUBs are not supported"
            )

        book = _Book(
            unpacker, {path: mediaType for path, mediaType, _ in items.values()}
        )
        for path in chapters:
            _readChapter(book, unpacker.read(path), posixpath.dirname(path))

        # Readers show the cover first, even when no chapter does
        cover = _coverPath(opf, items)
        if cover and cover not in book.imageIds:
            imageId = book.imageId(cover)
            if imageId is not None:
                book.blocks.insert(0, {"kind": "image", "image": imageId, "alt": ""})

        metadataTitle = opf.findtext(f".//{{{DC_NS}}}title") or ""
    except HTTPException:
        raise
    except Exception:
        # Broken books fail in many different ways
        raise HTTPException(status_code=422, detail="The EPUB could not be read")

    blocks = book.blocks
    while blocks and blocks[0]["kind"] == "break":
        blocks.pop(0)
    while blocks and blocks[-1]["kind"] == "break":
        blocks.pop()

    if not any(block["kind"] in TEXT_KINDS for block in blocks):
        raise HTTPException(status_code=422, detail="This EPUB has no readable text")

    title = metadataTitle.strip() or PurePath(filename or "").stem.strip() or "EPUB"
    return ParsedEpub(title=title[:TITLE_MAX_LENGTH], blocks=blocks, images=book.images)


def _manifest(opf: etree._Element, opfDir: str) -> dict[str, tuple[str, str, str]]:
    """Each item of the book by id: its path in the zip, type and properties"""
    return {
        item.get("id"): (
            posixpath.normpath(posixpath.join(opfDir, unquote(item.get("href", "")))),
            item.get("media-type", ""),
            item.get("properties", ""),
        )
        for item in opf.iterfind(f".//{{{OPF_NS}}}manifest/{{{OPF_NS}}}item")
    }


def _spinePaths(opf: etree._Element, items: dict) -> list[str]:
    """Paths in the zip of the documents read in order, skipping the extras"""
    return [
        items[ref.get("idref")][0]
        for ref in opf.iterfind(f".//{{{OPF_NS}}}spine/{{{OPF_NS}}}itemref")
        if ref.get("linear") != "no"
    ]


def _coverPath(opf: etree._Element, items: dict) -> str | None:
    for path, _, properties in items.values():
        if "cover-image" in properties.split():
            return path
    # EPUB 2 names the cover in a <meta>
    for meta in opf.iterfind(f".//{{{OPF_NS}}}meta"):
        if meta.get("name") == "cover" and meta.get("content") in items:
            return items[meta.get("content")][0]
    return None


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


def _ownStyle(el: etree._Element, tag: str) -> int:
    css = el.get("style") or ""
    style = 0
    if tag in ITALIC_TAGS or ITALIC_CSS.search(css):
        style |= ITALIC
    if tag in BOLD_TAGS or BOLD_CSS.search(css):
        style |= BOLD
    return style


def _imagePath(src: str | None, chapterDir: str) -> str | None:
    """The path in the zip of a picture of the chapter, if it is in the book"""
    if not src:
        return None
    url = urlsplit(src)
    if url.scheme or url.netloc:
        return None
    return posixpath.normpath(posixpath.join(chapterDir, unquote(url.path)))


def _readChapter(book: _Book, document: bytes, chapterDir: str):
    """
    Adds the blocks of a chapter to the book: one per heading, paragraph or
    list item, keeping the line breaks of the book inside them (verses,
    addresses…) along with which parts are in italic or bold
    """
    try:
        root = etree.fromstring(document, XML_PARSER)
    except etree.XMLSyntaxError:
        # Not well formed XHTML (e.g. HTML entities): read it as HTML
        root = lxml.html.document_fromstring(document)

    # The text gathered for the next block, with the style of each piece
    pieces: list[tuple[str, int]] = []
    # Block elements being read, the innermost last
    openBlocks: list[str] = []
    style = 0
    # Inside a table row, the cells make one line (e.g. "CHAPTER I." and
    # its name in a table of contents)
    rowDepth = 0

    def flush():
        kind = (
            HEADING_KINDS.get(openBlocks[-1], "paragraph")
            if openBlocks
            else "paragraph"
        )
        lines = _lines(pieces)
        pieces.clear()
        # An empty line, like two <br> between stanzas, splits the block
        group: list[list[tuple[str, int]]] = []
        for line in lines + [[]]:
            if line:
                group.append(line)
            elif group:
                _addTextBlock(book, kind, group)
                group = []

    def walk(el: etree._Element):
        nonlocal style, rowDepth
        outerStyle = style
        if not _isSkipped(el):
            tag = _localName(el)
            isBlock = tag in BLOCK_TAGS and rowDepth == 0
            if isBlock:
                flush()
                openBlocks.append(tag)
            if tag == "tr":
                rowDepth += 1
            style |= _ownStyle(el, tag)

            if tag == "svg":
                # Covers are often a picture inside an SVG
                flush()
                for image in el.iter(f"{{*}}image", "image"):
                    href = image.get(f"{{{XLINK_NS}}}href") or image.get("href")
                    path = _imagePath(href, chapterDir)
                    if path:
                        book.addImage(path, "")
            else:
                if tag == "img":
                    path = _imagePath(el.get("src"), chapterDir)
                    if path:
                        flush()
                        book.addImage(path, el.get("alt") or "")
                elif tag == "hr":
                    flush()
                    book.addBreak()
                elif tag == "br":
                    pieces.append((LINE_BREAK, 0))
                elif tag in ("td", "th") or (rowDepth and tag in BLOCK_TAGS):
                    pieces.append((" ", 0))
                pieces.append((el.text or "", style))
                for child in el:
                    walk(child)

            if tag == "tr":
                rowDepth -= 1
            if isBlock:
                flush()
                openBlocks.pop()
        style = outerStyle
        pieces.append((el.tail or "", style))

    walk(root)
    flush()


def _lines(pieces: list[tuple[str, int]]) -> list[list[tuple[str, int]]]:
    """
    The characters of the pieces with their style, line by line, with the
    whitespace of the source collapsed to single spaces. A space takes the
    style both its neighbours share, so "<i>two words</i>" stays one run.
    """
    lines: list[list[tuple[str, int]]] = [[]]
    hasSpace = False
    for text, style in pieces:
        for char in text:
            line = lines[-1]
            if char == LINE_BREAK:
                lines.append([])
                hasSpace = False
            elif char.isspace():
                hasSpace = bool(line)
            else:
                if hasSpace:
                    line.append((" ", line[-1][1] & style))
                    hasSpace = False
                line.append((char, style))
    return lines


def _addTextBlock(book: _Book, kind: str, lines: list[list[tuple[str, int]]]):
    chars = [
        char
        for i, line in enumerate(lines)
        for char in ([("\n", 0)] if i else []) + line
    ]
    text = "".join(char for char, _ in chars)
    if set(text) <= DECORATIONS:
        book.addBreak()
        return

    styles = []
    for flag, name in STYLE_NAMES.items():
        start = None
        for i, (_, charStyle) in enumerate(chars + [("", 0)]):
            if charStyle & flag and start is None:
                start = i
            elif not charStyle & flag and start is not None:
                styles.append({"start": start, "end": i, "style": name})
                start = None
    styles.sort(key=lambda s: (s["start"], s["style"]))

    block = {"kind": kind, "text": text}
    if styles:
        block["styles"] = styles
    book.blocks.append(block)
