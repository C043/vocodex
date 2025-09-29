import os, pytest


@pytest.mark.asyncio
async def test_protected_route_with_no_token(client):
    resp = await client.get("/upload/text")
