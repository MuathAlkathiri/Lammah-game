# Testing and verification

The repository uses one root npm lockfile and npm workspaces. Install dependencies
from the repository root; do not create nested lockfiles.

## Fast, deterministic verification

`npm run verify` runs frontend and backend linting, TypeScript checks, frontend
Vitest mapper tests, backend Jest tests, OpenAPI drift validation, Orval generated
client drift validation, the API architecture guard, and both production builds.
Normal verification performs no external AI, media-provider, or network calls.

## Frontend unit tests

- `npm run test:frontend` runs Vitest once in jsdom.
- `npm run test:frontend:watch` starts watch mode.
- Handwritten feature mappers are tested; generated Orval code is not tested directly.

## Browser smoke tests

Start an isolated frontend/backend environment, then run `npm run test:e2e`.
The anonymous admin-route test needs no credentials. The login/hydration/logout flow
requires `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` belonging to test fixtures and is
skipped otherwise. `E2E_BASE_URL` defaults to `http://127.0.0.1:3001`.

Install the browser once with `npx playwright install chromium`. Use
`npm run test:e2e:ui` for interactive debugging. Never point E2E at production.

## Integration and live-provider boundaries

Backend Jest suites mock AI and asset-provider infrastructure. Live AI is intentionally
excluded from verification and must never persist content by default. Media integration
requires FFmpeg/FFprobe and belongs in an isolated Docker test environment. Test fixture
work must use a database name ending in `_test`; production seeds are not test fixtures.

Known deferred work: full Mongo-backed lifecycle fixtures and game/music HTTP suites,
plus a separately gated live-AI smoke command. These are not represented as completed.
