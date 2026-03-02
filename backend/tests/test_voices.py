import os, pytest


@pytest.mark.asyncio
async def test_voices(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping entries tests")

    headers, user = auth_header

    # List possible voices
    resp = await client.get("/voices", headers=headers)

    assert resp.status_code == 200
