import os, pytest
from fastapi import HTTPException

from app.controllers import websiteController

ARTICLE_HTML = """
<html>
  <head><title>Reading The Web Aloud</title></head>
  <body>
    <nav><a href="/">Home</a> <a href="/about">About</a></nav>
    <article>
      <p>Listening to articles is a great way to read while doing something else.</p>
      <p>The backend fetches the page and keeps only the readable text.</p>
    </article>
    <footer>All rights reserved</footer>
  </body>
</html>
"""


@pytest.fixture
def fake_website(monkeypatch):
    requested = []

    async def fetch(url: str) -> str:
        requested.append(url)
        return ARTICLE_HTML

    monkeypatch.setattr(websiteController, "fetchWebsite", fetch)
    return requested


@pytest.mark.asyncio
async def test_website_import_saves_parsed_entry(
    client, entry_cleanup, auth_header, fake_website
):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header

    resp = await client.post(
        "/entries/website",
        headers=headers,
        json={"url": "https://blog.test/reading-aloud"},
    )

    assert resp.status_code == 201
    entryId = resp.json()["id"]
    assert entryId
    entry_cleanup(entryId)
    assert fake_website == ["https://blog.test/reading-aloud"]

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Reading The Web Aloud"
    assert data["content"] == (
        "Listening to articles is a great way to read while doing something else."
        "\n\n"
        "The backend fetches the page and keeps only the readable text."
    )
    assert data["progress"] == 0

    resp = await client.get("/entries/list/me", headers=headers)
    assert [e["id"] for e in resp.json()["entries"]] == [entryId]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url", ["", "not a url", "ftp://files.test/doc.html", "javascript:alert(1)"]
)
async def test_website_import_rejects_invalid_urls(
    client, auth_header, fake_website, url
):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header

    resp = await client.post("/entries/website", headers=headers, json={"url": url})

    assert resp.status_code == 422
    assert fake_website == []

    resp = await client.get("/entries/list/me", headers=headers)
    assert resp.json()["entries"] == []


@pytest.mark.asyncio
async def test_website_import_fetch_failure_saves_nothing(
    client, auth_header, monkeypatch
):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    async def fetch(url: str) -> str:
        raise HTTPException(status_code=502, detail="Could not fetch website")

    monkeypatch.setattr(websiteController, "fetchWebsite", fetch)
    headers, user = auth_header

    resp = await client.post(
        "/entries/website", headers=headers, json={"url": "https://down.test"}
    )

    assert resp.status_code == 502
    assert resp.json()["detail"] == "Could not fetch website"

    resp = await client.get("/entries/list/me", headers=headers)
    assert resp.json()["entries"] == []


@pytest.mark.asyncio
async def test_website_import_requires_auth(client, fake_website):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    resp = await client.post("/entries/website", json={"url": "https://blog.test"})

    assert resp.status_code == 401
    assert fake_website == []


@pytest.mark.asyncio
async def test_website_import_real_website(client, entry_cleanup, auth_header):
    """Hits the real network, like the synthesis test does with edge-tts."""
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    url = "https://www.example.com"
    headers, user = auth_header

    resp = await client.post("/entries/website", headers=headers, json={"url": url})

    assert resp.status_code == 201
    entryId = resp.json()["id"]
    assert entryId
    entry_cleanup(entryId)

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    title = data["title"]
    content: str = data["content"]

    assert title == "Example Domain"
    assert "This domain is for use in documentation examples" in content
