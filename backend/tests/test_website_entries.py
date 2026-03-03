import os, pytest


@pytest.mark.asyncio
async def test_website_import(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    url = "https://www.example.com"
    headers, user = auth_header

    resp = await client.post(
        "/entries/website", headers=headers, json={"url": url, "user_id": user.id}
    )

    assert resp.status_code == 201
    data = resp.json()
    entryId = data["id"]
    assert entryId

    resp = await client.get(f"/entries/{entryId}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    title = data["title"]
    content: str = data["content"]

    assert title == "Example Domain"
    assert (
        "This domain is for use in documentation examples without needing permission. Avoid uses in operations."
        in content
    )

    entry_cleanup(entryId)
