import pytest
from sqlalchemy import delete

from app.main import app
from app.models.user import Users
from app.models.entry import Entries
from app.security import create_access_token, hash_password


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
        await db_session.execute(delete(Users).where(Users.username.in_(to_delete)))
        await db_session.commit()


@pytest.fixture
async def entry_cleanup(db_session):
    to_delete = set()

    def track(id: int):
        to_delete.add(id)

    yield track
    if to_delete:
        await db_session.execute(delete(Entries).where(Entries.id.in_(to_delete)))
        await db_session.commit()


@pytest.fixture
async def auth_header(db_session, user_cleanup):
    username = "entries-user"
    user_cleanup(username)

    user = Users(username=username, hashed_password=hash_password("irrelevant"))
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(user.id, username)
    return {"Authorization": f"Bearer {token}"}, user
