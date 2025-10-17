from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errorHandler.authError import AuthError
from .db import get_session
from .models.user import Users
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> Users:
    if not creds or creds.scheme.lower() != "bearer":
        raise AuthError(status_code=401, message="Missing token")
    try:
        payload = decode_access_token(creds.credentials)
        user_id = int(payload["sub"])
    except Exception:
        raise AuthError(status_code=401, message="Invalid or expired token")

    result = await session.execute(select(Users).where(Users.id == user_id))
    found = result.scalar_one_or_none()
    if not found:
        raise AuthError(status_code=404, message="User not found")
    return found
