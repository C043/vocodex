import re
from dataclasses import dataclass

import httpx
import trafilatura
from fastapi import HTTPException

TITLE_MAX_LENGTH = 1200
MAX_PAGE_BYTES = 5 * 1024 * 1024
FETCH_TIMEOUT_SECONDS = 15
HTML_CONTENT_TYPES = ("text/html", "application/xhtml+xml")
# Many websites refuse requests coming from clients that do not look like a browser
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
}

# Wikipedia style references like [1], [12-14], [a], [note 3], [citation needed]
CITATION_MARKER = re.compile(
    r"\s?\[(?:\d+(?:[,–-]\s?\d+)*|[a-z]|note \d+|citation needed)\]",
    re.IGNORECASE,
)


@dataclass
class ParsedWebsite:
    title: str
    content: str


async def fetchWebsite(
    url: str, transport: httpx.AsyncBaseTransport | None = None
) -> str:
    """
    Downloads the HTML of the given url, following redirects.
    Only HTML pages up to MAX_PAGE_BYTES are accepted.
    """
    try:
        async with httpx.AsyncClient(
            transport=transport,
            headers=REQUEST_HEADERS,
            follow_redirects=True,
            timeout=FETCH_TIMEOUT_SECONDS,
        ) as client:
            async with client.stream("GET", url) as response:
                if response.is_error:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Could not fetch website: status {response.status_code}",
                    )

                content_type = response.headers.get("content-type", "").lower()
                if not content_type.startswith(HTML_CONTENT_TYPES):
                    raise HTTPException(
                        status_code=415, detail="The url does not point to a web page"
                    )

                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > MAX_PAGE_BYTES:
                        raise HTTPException(
                            status_code=413, detail="The web page is too large"
                        )

                return body.decode(response.charset_encoding or "utf-8", "replace")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not fetch website")


def parseWebsite(html: str) -> ParsedWebsite:
    """
    Extracts the readable article (title and main text) out of an HTML page,
    leaving out navigation, footers, scripts and other boilerplate, the same
    way a reader mode would.
    """
    text = trafilatura.extract(
        html,
        output_format="txt",
        include_comments=False,
        include_tables=False,
        favor_recall=True,
    )
    paragraphs = [
        CITATION_MARKER.sub("", line).strip() for line in (text or "").splitlines()
    ]
    paragraphs = [p for p in paragraphs if p]
    if not paragraphs:
        raise HTTPException(
            status_code=422, detail="No readable content found on the website"
        )
    content = "\n\n".join(paragraphs)

    metadata = trafilatura.extract_metadata(html)
    title = (metadata.title if metadata else None) or " ".join(content.split()[:3])

    return ParsedWebsite(title=title[:TITLE_MAX_LENGTH], content=content)
