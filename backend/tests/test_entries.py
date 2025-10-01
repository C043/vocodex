import os, pytest


@pytest.mark.asyncio
async def test_entry_saving(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    title = "TestTitle"
    content = "TestContent"
    headers, user = auth_header

    resp = await client.post(
        "/uploads/text",
        headers=headers,
        json={"title": title, "content": content, "user_id": user.id},
    )

    assert resp.status_code == 201
    data = resp.json()
    entryId = data["id"]
    assert entryId
    entry_cleanup(entryId)
