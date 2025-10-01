import os, pytest


@pytest.mark.asyncio
async def test_entry_saving(client, entry_cleanup, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

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

    getResp = await client.get(
        f"/entries/{entryId}",
        headers=headers,
    )

    assert getResp.status_code == 200
    getData = getResp.json()

    getTitle = getData["title"]
    getContent = getData["content"]
    assert getTitle == "TestTitle"
    assert getContent == "TestContent"


# @pytest.mark.asyncio
# async def test_get_entry_by_id(client, entry_cleanup, auth_header):
#     if "DATABASE_URL" not in os.environ:
#         pytest.skip("DATABASE_URL not set; skipping entries tests")
#
#     title = "TestTitle"
#     content = "TestContent"
#     headers, user = auth_header
#
#     resp = await client.post(
#         "/entries/text",
#         headers=headers,
#         json={"title": title, "content": content, "user_id": user.id},
#     )
#
#
# @pytest.mark.asyncio
# async def test_entry_title_empty(client, entry_cleanup, auth_header):
#     if "DATABASE_URL" not in os.environ:
#         pytest.skip("DATABASE_URL not set; skipping entries tests")
#
#     title = ""
#     content = "Testing things out"
#     headers, user = auth_header
#
#     resp = await client.post(
#         "/entries/text",
#         headers=headers,
#         json={"title": title, "content": content, "user_id": user.id},
#     )
#
#     assert resp.status_code == 201
#     data = resp.json()
#     entryId = data["id"]
#     assert entryId
#     entry_cleanup(entryId)
#
#     entry = await session
