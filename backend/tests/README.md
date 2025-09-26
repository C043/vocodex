# Testing FastAPI - VOCODEX backend
## Goals
---
- Fast, deterministic tests that run in-process (no real network)
- `App` startup/shutdown runs in tests (so `DB` pool is real)
- Clean pattern I can copy for any route (pure `HTTP`, DB-backed, errors, auth,
backgrounds, etc.)
## What We're Using (and why)
---
- `pytest` - test runner. Discover tests, run them, show nice failures.
- `pytest-asyncio` - lets us write `async def` tests so we can `aswait` `HTTP`
calls.
- `httpx` - async `HTTP` client. We point it at the app via an `ASGI transport`
  (no sockets)
- `asgi-lifespan` - runs `FastAPI` lifespan hooks (startup/shutdown) during
tests so our engine + pool are created and disposed properly
## The Flow
---
1. `LifespanManager(app)` starts the app -> `create_async_engine(...)`,
   `sessionmaker` set on `app.state`.
2. `ASGITransport(app=app)` makes `httpx.asyncClient` deliver requests directly
   into the app (zero network).
3. Tests calls `await client.get("/route")`.
4. Route runs, can use `DB` via `get_session` dependency.
5. Test asserts on `status_code` and `json()`.
6. After tests, lifespan shuts down and disposes the `DB` engine cleanly.
## Project Layout (backend)
---
```bash
backend/
  app/
    __init__.py
    main.py          # FastAPI app, lifespan, routes
    db.py            # get_session dependency
  tests/
    conftest.py      # shared fixtures (client)
    test_health.py
    test_db_health.py
  pytest.ini
```
## Fixtures in Python (what/why)
---
A `fixture` is a reusalble setup/teardown function for tests. We decide with
`@pytest.fixture` and `yield` the thing the test needs. `pytest`:
- Calls the `fixture` before the test
- hands the test the object (e.g. an `HTTP` client)
- after the test, resumes the fixture after the `yield` to clean up

We can sope `fixtures` (per test, module, session), and compose them (`fixtures` can depend on other `fixtures`). In our case:
- The `client` `fixture` uses `LifespanManager(app)` so startup/shutdown run
once per test (default scope)
- it yields an `httpx.AsyncClient` that talks in-process to the app
## Running tests
---
Inside `Docker`:
```bash
sudo docker compose exec backend pytest -q
```
Locally
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install --no-cache-dir -r /deps/requirements/dev.txt
pytest -q
```
## Reusable Patterns (examples)
---
### A) Route with body validation (Pydantic) - happy path
- prove input validation and `JSON` body handling
```python
async def test_create_item(client):
    payload = {"title": "Hello", "speed": 1.25}
    resp = await client.post("/items", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Hello"
    assert "id" in data
```
### B) Validation error (unhappy path)
- Guardrails hold
```python
async def test_create_item_invalid_speed(client):
    payload = {"title": "T", "speed": "fast"}
    resp = await client.post("/items", json=payload)
    assert resp.satus_code == 422
    body = resp.json()
```
### C) DB-backend create/list with a real transaction
- Prove session works; state chagnes persist.
```python
async def test_items_crud(client):
    # create
    resp = await client.post("/items", json={"title": "A", "speed": 1.0})
    assert resp.status_code == 201
    item = resp.json()

    # list
    resp = await client.get("/items")
    assert resp.status_code == 200
    items = resp.json()
    assert any(x["id"] == item["id"] for x in items)
```
### D) Idempotent commands (e.g. "play/pause")
- `HTTP` commands retried won't double-apply
```python
async def test_command_idempotent(client):
    cmd = {"command": "pause", "command_id": "abc-123"}
    resp1 = await client.post("/session/42/commands", json=cmd)
    resp2= await client.post("/session/42/command", json=cmd)
    assert resp1.status_code == resp2.status_code == 200
    assert resp1.json()["applied"] is True
    assert resp2.json()["applied"] is False
```
### E) Auth-protected route
- Verify 401/403 and success paths
```python
async def test_protected_requires_auth(client):
    resp = await client.get("/me")
    assert resp.status_code == 401

async def test_protected_with_token(client):
    headers = {"Authorization": "bearer testtoken"}
    resp = await client.get("/me", headers = headers)
    assert resp.status_code == 200
```
### F) Background work (e.g. kick off synthesis)
- Command returns 202; background task scheduled
```python
async def test_kick_off_synthesis(client):
    resp = await client.post("/syntesis", json = {"text": "Hello"})
    assert resp.status_code == 202
```
### G) Event Stream (SSE)
- State updates arrive; format is correct
```python
async def test_sse_stream(client):
    resp = await client.get("/sessions/42/events")
    assert resp.status_code == 200
```
