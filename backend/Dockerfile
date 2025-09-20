# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

FROM base AS dev
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlalchemy asyncpg pydantic
# deps installed in image so conainer boots fast; code is bind-mounted
