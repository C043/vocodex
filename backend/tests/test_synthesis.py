import os, pytest
import base64


@pytest.mark.asyncio
async def test_synthesis(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    text = "Testing some long text so see if boundaries apply"
    voice = "ar-EG-SalmaNeural"
    headers, user = auth_header

    resp = await client.post(
        "/synthesis/GET",
        headers=headers,
        json={"text": text, "voice": voice},
    )

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"
    data = resp.json()
    assert "audio" in data
    assert "boundaries" in data
    assert isinstance(data["boundaries"], list)

    audio_content = base64.b64decode(data["audio"])
    assert len(audio_content) > 0
    assert audio_content[0] == 0xFF  # Valid MP3 starts with 0xFF

    assert len(data["boundaries"]) > 0

    if len(data["boundaries"]) > 0:
        first_boundary = data["boundaries"][0]
        assert "text" in first_boundary
        assert "start" in first_boundary
        assert "end" in first_boundary
        assert first_boundary["text"] == "Testing"

    # Test with auto voice
    resp = await client.post(
        "/synthesis/GET", headers=headers, json={"text": text, "voice": ""}
    )

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/json"

    data = resp.json()
    assert "audio" in data
    assert "boundaries" in data

    assert len(data["boundaries"]) > 0

    if len(data["boundaries"]) > 0:
        first_boundary = data["boundaries"][0]
        assert "text" in first_boundary
        assert "start" in first_boundary
        assert "end" in first_boundary
        assert first_boundary["text"] == "Testing"

    audio_content = base64.b64decode(data["audio"])
    assert len(audio_content) > 0
    assert audio_content[0] == 0xFF  # Valid MP3 starts with 0xFF
