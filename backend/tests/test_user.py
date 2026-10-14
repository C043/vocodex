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


@pytest.mark.asyncio
async def test_zoom_is_saved_per_mode(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    resp = await client.post(
        "/me/preferences", headers=headers, json={"zoom": {"text": 3}}
    )
    assert resp.status_code == 200
    resp = await client.post(
        "/me/preferences", headers=headers, json={"zoom": {"pdf": 2}}
    )
    assert resp.status_code == 200

    data = (await client.get("/me/preferences", headers=headers)).json()
    assert data["zoom"] == {"text": 3, "pdf": 2}


@pytest.mark.asyncio
async def test_saving_speed_and_voice_keeps_the_zoom(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    await client.post("/me/preferences", headers=headers, json={"zoom": {"pdf": 4}})
    await client.post(
        "/me/preferences", headers=headers, json={"speed": "+50%", "voice": "v"}
    )

    data = (await client.get("/me/preferences", headers=headers)).json()
    assert data == {"speed": "+50%", "voice": "v", "zoom": {"pdf": 4}}


@pytest.mark.asyncio
async def test_saving_zoom_keeps_speed_and_voice(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    await client.post(
        "/me/preferences", headers=headers, json={"speed": "+50%", "voice": "v"}
    )
    await client.post("/me/preferences", headers=headers, json={"zoom": {"text": 2}})

    data = (await client.get("/me/preferences", headers=headers)).json()
    assert data == {"speed": "+50%", "voice": "v", "zoom": {"text": 2}}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "zoom", [{"text": 0}, {"text": 5}, {"pdf": "big"}, {"audio": 2}]
)
async def test_invalid_zoom_is_rejected(client, auth_header, zoom):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    resp = await client.post("/me/preferences", headers=headers, json={"zoom": zoom})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_font_is_saved_and_keeps_the_rest(client, auth_header):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    await client.post(
        "/me/preferences",
        headers=headers,
        json={"speed": "+50%", "voice": "v", "zoom": {"text": 2}},
    )
    resp = await client.post(
        "/me/preferences", headers=headers, json={"font": "merriweather"}
    )
    assert resp.status_code == 200

    data = (await client.get("/me/preferences", headers=headers)).json()
    assert data == {
        "speed": "+50%",
        "voice": "v",
        "zoom": {"text": 2},
        "font": "merriweather",
    }


@pytest.mark.asyncio
@pytest.mark.parametrize("font", ["comic-sans", "", 3])
async def test_unknown_font_is_rejected(client, auth_header, font):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping synthesis tests")

    headers, user = auth_header

    resp = await client.post("/me/preferences", headers=headers, json={"font": font})
    assert resp.status_code == 422
