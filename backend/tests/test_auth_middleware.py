import os, pytest
from sqlalchemy import delete
from app.models.user import Users
from app.security import create_access_token


@pytest.mark.asyncio
async def test_protected_route_require_token(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth middleware tests")

    resp = await client.post("/upload/some-resource", json={})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing token"


@pytest.mark.asyncio
async def test_protected_route_rejects_malformed_header(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth middleware tests")

    resp = await client.post(
        "/upload/some-resource",
        headers={"Authorization": "Token abc123"},
        json={},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Missing token"


@pytest.mark.asyncio
async def test_protected_route_rejects_invalid_token(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth middleware tests")

    resp = await client.post(
        "/upload/some-resource",
        headers={"Authorization": "Bearer abc123"},
        json={},
    )
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid or expired token"


@pytest.mark.asyncio
async def test_protected_route_missing_user(client, db_session, user_cleanup):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth middleware tests")

    username = "ghost-user"
    user = Users(username=username, hashed_password="irrelevant")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    user_cleanup(username)

    token = create_access_token(user.id, username)

    await db_session.execute(delete(Users).where(Users.id == user.id))
    await db_session.commit()

    resp = await client.post(
        "/upload/some-resource",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.asyncio
async def test_protected_route_allows_valid_user(client, db_session, user_cleanup):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping auth middleware tests")

    username = "happy-user"
    user_cleanup(username)
    user = Users(username=username, hashed_password="irrelevant")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, username)

    resp = await client.post(
        "/upload/some-resource",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert resp.status_code != 401
