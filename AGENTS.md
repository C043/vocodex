# Agent guidelines

## Test-driven development (required)

Every change in this project is built with TDD, backend and frontend alike:

1. **Red**: write or update a test that describes the new behavior or the bug,
   and run it to see it fail for the expected reason.
2. **Green**: write the smallest implementation that makes it pass.
3. **Refactor**: clean up with the whole suite green.

Do not write implementation code before a failing test exists for it. Bug
fixes start with a test that reproduces the bug.

## Running the tests

- Backend (pytest, needs the database): `docker compose exec backend pytest`
- Frontend (vitest): `cd frontend && npx vitest --run`, plus `npm run typecheck`
- Browser extension (vitest): `cd extension && npx vitest --run`, plus
  `npm run typecheck`. It stands on its own: it never imports from
  `frontend/`. Its text utils and voice/speed selects are copies of the
  app's, so a change to those in the app is made in `extension/` too

## Git

Do not commit: leave changes in the working tree for the maintainer to review.
