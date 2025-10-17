import pytest

pytest_plugins = "db_fixtures"
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager

from app.main import app


@pytest.fixture
async def client():
    """
    Creates an HTTP client that talks to the FastAPI app in-process.
    LifespanManager runs startup/shutdown so the DB engine/pool exists.
    """
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
