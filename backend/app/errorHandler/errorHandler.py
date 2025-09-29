from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import logging
from sqlalchemy.exc import (
    IntegrityError,
    DataError,
    OperationalError,
    TimeoutError as SATimeoutError,
)
from .authError import AuthError

logger = logging.getLogger("uvicorn.error")


def registerExceptionHandlers(app: FastAPI) -> None:
    @app.exception_handler(IntegrityError)
    async def _integrity(_: Request, exc: IntegrityError):
        return JSONResponse(status_code=409, content={"detail": "Integrity violation"})

    @app.exception_handler(DataError)
    async def _data(_: Request, exc: DataError):
        return JSONResponse(
            status_code=400, content={"detail": "Invalid or too long data"}
        )

    @app.exception_handler(OperationalError)
    async def _operational(_: Request, exc: OperationalError):
        logger.exception("OperationalError")
        return JSONResponse(status_code=503, content={"detail": "Database unavailable"})

    @app.exception_handler(SATimeoutError)
    async def _timeout(_: Request, exc: SATimeoutError):
        logger.exception("DB Timeout")
        return JSONResponse(status_code=503, content={"detail": "Database timeout"})

    @app.exception_handler(AuthError)
    async def _unauthorized(_: Request, exc: AuthError):
        logger.exception("Unauthorized error")
        return JSONResponse(
            status_code=exc.status_code, content={"detail": "Unauthorized"}
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        logger.exception("Unhandled error")
        return JSONResponse(
            status_code=500, content={"detail": "Internal server error"}
        )
