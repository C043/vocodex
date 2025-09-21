import os
import pytest


@pytest.mark.asyncio
async def test_db_health(client):
    if "DATABASE_URL" not in os.environ:
        pytest.skip("DATABASE_URL not set; skipping DB health test")

    r = await client.get("/db/health")
    assert r.status_code == 200
    data = r.json()
    assert data["db"] == "ok"
    assert data["result"] == 1
