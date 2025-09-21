import pytest
from sqlalchemy import delete

from app.main import app
from app.models.user import User


@pytest.fixture
async def db_session(client):
    Session = app.state.sessionmaker
    async with Session() as session:
        yield session


@pytest.fixture
async def user_cleanup(db_session):
    to_delete = set()

    def track(username: str):
        to_delete.add(username)

    yield track
    if to_delete:
        await db_session.execute(delete(User).where(User.username.in_(to_delete)))
        await db_session.commit()
