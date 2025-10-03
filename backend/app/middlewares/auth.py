from typing import Iterable
from fastapi import Request, Response
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.errorHandler.authError import AuthError
from app.models.user import Users
from app.security import decode_access_token


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, protected_paths: Iterable[str]):
        super().__init__(app)
        self.protected_paths = tuple(protected_paths)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if not request.url.path.startswith(self.protected_paths):
            return await call_next(request)

        try:
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.lower().startswith("bearer "):
                raise AuthError(401, "Missing token")

            token = auth_header.split(" ", 1)[1]

            try:
                payload = decode_access_token(token)
                user_id = int(payload["sub"])
            except Exception:
                raise AuthError(401, "Invalid or expired token")

            sessionmaker = request.app.state.sessionmaker
            async with sessionmaker() as session:
                result = await session.execute(select(Users).where(Users.id == user_id))
                user = result.scalar_one_or_none()

                if not user:
                    raise AuthError(404, "User not found")

                request.state.user = user
                return await call_next(request)
        except AuthError as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})
