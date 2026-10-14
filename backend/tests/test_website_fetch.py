import httpx
import pytest
from fastapi import HTTPException

from app.controllers import websiteController

URL = "https://site.test/article"
HTML = "<html><body><p>Hello</p></body></html>"


def transport(handler):
    return httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_fetch_website_returns_html():
    def handler(request: httpx.Request):
        return httpx.Response(
            200, headers={"content-type": "text/html; charset=utf-8"}, text=HTML
        )

    html = await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert html == HTML


@pytest.mark.asyncio
async def test_fetch_website_sends_browser_like_headers():
    seen = {}

    def handler(request: httpx.Request):
        seen["user-agent"] = request.headers.get("user-agent", "")
        seen["accept"] = request.headers.get("accept", "")
        return httpx.Response(200, headers={"content-type": "text/html"}, text=HTML)

    await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert "Mozilla" in seen["user-agent"]
    assert "text/html" in seen["accept"]


@pytest.mark.asyncio
async def test_fetch_website_follows_redirects():
    def handler(request: httpx.Request):
        if request.url.path == "/old":
            return httpx.Response(301, headers={"location": URL})
        return httpx.Response(200, headers={"content-type": "text/html"}, text=HTML)

    html = await websiteController.fetchWebsite(
        "https://site.test/old", transport=transport(handler)
    )

    assert html == HTML


@pytest.mark.asyncio
async def test_fetch_website_decodes_declared_charset():
    def handler(request: httpx.Request):
        return httpx.Response(
            200,
            headers={"content-type": "text/html; charset=iso-8859-1"},
            content="<p>Caffè</p>".encode("iso-8859-1"),
        )

    html = await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert html == "<p>Caffè</p>"


@pytest.mark.asyncio
async def test_fetch_website_error_status_raises_bad_gateway():
    def handler(request: httpx.Request):
        return httpx.Response(404, headers={"content-type": "text/html"}, text="nope")

    with pytest.raises(HTTPException) as exc:
        await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_fetch_website_network_error_raises_bad_gateway():
    def handler(request: httpx.Request):
        raise httpx.ConnectError("unreachable", request=request)

    with pytest.raises(HTTPException) as exc:
        await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert exc.value.status_code == 502


@pytest.mark.asyncio
async def test_fetch_website_non_html_raises_unsupported_media_type():
    def handler(request: httpx.Request):
        return httpx.Response(
            200, headers={"content-type": "application/pdf"}, content=b"%PDF-1.7"
        )

    with pytest.raises(HTTPException) as exc:
        await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert exc.value.status_code == 415


@pytest.mark.asyncio
async def test_fetch_website_too_large_raises_content_too_large():
    def handler(request: httpx.Request):
        body = b"<p>" + b"a" * (websiteController.MAX_PAGE_BYTES + 1) + b"</p>"
        return httpx.Response(200, headers={"content-type": "text/html"}, content=body)

    with pytest.raises(HTTPException) as exc:
        await websiteController.fetchWebsite(URL, transport=transport(handler))

    assert exc.value.status_code == 413
