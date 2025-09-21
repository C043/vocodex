# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app

FROM base AS deps
COPY requirements /deps/requirements
RUN pip install --no-cache-dir -r /deps/requirements/base.txt

FROM deps AS dev
RUN pip install --no-cache-dir -r /deps/requirements/dev.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM deps AS prod
COPY backend/ /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
