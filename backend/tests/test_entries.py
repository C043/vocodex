import os, pytest


@pytest.mark.asyncio
async def test_entries(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    # Save entry test
    title = "TestTitle"
    content = "TestContent"
    headers, user = auth_header

    resp = await client.post(
        "/entries/text",
        headers=headers,
        json={"title": title, "content": content, "user_id": user.id},
    )

    assert resp.status_code == 201
    data = resp.json()
    entryId = data["id"]
    assert entryId
    entry_cleanup(entryId)

    # Get entry test
    resp = await client.get(
        f"/entries/{entryId}",
        headers=headers,
    )

    assert resp.status_code == 200
    getData = resp.json()

    getTitle = getData["title"]
    getContent = getData["content"]
    assert getTitle == "TestTitle"
    assert getContent == "TestContent"

    # Title parsing test
    title = ""
    content = "Testing things out"

    resp = await client.post(
        "/entries/text",
        headers=headers,
        json={"title": title, "content": content, "user_id": user.id},
    )

    assert resp.status_code == 201
    data = resp.json()
    entryId = data["id"]
    assert entryId
    entry_cleanup(entryId)

    resp = await client.get(
        f"/entries/{entryId}",
        headers=headers,
    )

    assert resp.status_code == 200
    getData = resp.json()

    getTitle = getData["title"]
    getContent = getData["content"]
    assert getTitle == "Testing things out"
    assert getContent == "Testing things out"

    # List current user entries
    resp = await client.get(
        f"/entries/list/me",
        headers=headers,
    )

    assert resp.status_code == 200
    payload = resp.json()
    print(payload)
    entries = payload["entries"]
    assert len(entries) == 2
    assert entries[0]["date"] is not None

    # Delete entry test
    resp = await client.delete(f"/entries/{entryId}", headers=headers)

    assert resp.status_code == 204

    resp = await client.get(
        f"/entries/list/me",
        headers=headers,
    )

    payload = resp.json()
    print(payload)
    entries = payload["entries"]
    assert len(entries) == 1
