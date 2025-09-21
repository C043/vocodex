import os, pytest


@pytest.mark.asyncio
async def test_register_and_login(client, user_cleanup):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth tests")

    username = "username"
    user_cleanup(username)
    password = "12345678"

    resp = await client.post(
        "/auth/register", json={"username": username, "password": password}
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == username

    resp = await client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 200
    token = resp.json()["token"]
    assert token

    resp = await client.get("/auth/me", headers={"Authorization": f"bearer {token}"})
    assert resp.status_code == 200
    me = resp.json()
    assert me["username"] == username


@pytest.mark.asyncio
async def test_login_wrong_password(client, user_cleanup):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth test")

    username = "username"
    user_cleanup(username)
    password = "password"

    await client.post(
        "/auth/register", json={"username": username, "password": password}
    )

    password = "wrongPassword"
    resp = await client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 401
