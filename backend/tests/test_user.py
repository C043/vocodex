import os, pytest


@pytest.mark.asyncio
async def test_user(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    speed = "+50%"
    voice = "ar-EG-SalmaNeural"
    headers, user = auth_header

    resp = await client.post(
        "/me/preferences", headers=headers, json={"speed": speed, "voice": voice}
    )

    assert resp.status_code == 200

    resp = await client.get("/me/preferences", headers=headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["speed"] == speed
    assert data["voice"] == voice
