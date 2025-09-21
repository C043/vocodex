from uuid import uuid4
import os, pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth tests")

    username = "username"
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

    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    me = resp.json()
    assert me["username"] == username


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth test")

    username = "username"
    password = "wrongPassword"

    await client.post(
        "/auth/register", json={"username": username, "password": password}
    )

    resp = await client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 401
