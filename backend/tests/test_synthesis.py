import os, pytest


@pytest.mark.asyncio
async def test_synthesis(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    text = "Testing"
    voice = "ar-EG-SalmaNeural"
    headers, user = auth_header

    resp = await client.post(
        "/synthesis/GET",
        headers=headers,
        json={"text": text, "voice": voice},
    )

    assert resp.status_code == 200
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert len(resp.content) > 0
    assert resp.content[0] == 0xFF  # Valid MP3 starts with 0xFF
