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

Start the isolated environment with
`docker compose -f docker-compose.test.yml --profile e2e up --build -d`, then run
`npm run test:e2e`. It uses the ephemeral `lammah_e2e_test` database and deterministic
fixture accounts. `E2E_BASE_URL` defaults to `http://127.0.0.1:3201`. Stop and erase
the ephemeral stack with `docker compose -f docker-compose.test.yml down -v`.

Install the browser once with `npm run test:e2e:install`. Use
`npm run test:e2e:ui` for interactive debugging. Focused commands are
`npm run test:e2e:admin`, `npm run test:e2e:game`, and `npm run test:e2e:ai`.
Never point E2E at production.

Chromium coverage includes authentication/session protection, administrator navigation
and Catalog CRUD, deterministic dashboard statistics, Game creation/reveal/award/skip
with refresh persistence, and AI Generator ready/failed/timeout presentation. AI browser
presentation uses Playwright interception with deterministic reviewed-draft fixtures;
the real orchestration and persistence boundaries remain covered by backend integration
tests, so browser tests make no live AI or asset calls. Mutations use unique names and
clean up when supported; resetting the `_test` database and rebuilding the E2E profile
provides a clean major-suite boundary.

Playwright retains traces, screenshots, and video only on failure. The expected local
runtime is under 15 seconds after the Docker E2E stack is healthy. Full completion of
all 36 board questions is intentionally left to HTTP lifecycle coverage; the browser
suite verifies representative persisted award and skip transitions without adding a
long, brittle UI loop.

## Integration and live-provider boundaries

Backend Jest suites mock AI and asset-provider infrastructure. Live AI is intentionally
excluded from verification and must never persist content by default. Media integration
requires FFmpeg/FFprobe and belongs in an isolated Docker test environment. Test fixture
work must use a database name ending in `_test`; production seeds are not test fixtures.

Backend integration fixtures can only target database names ending in `_test`:
`npm run test:fixtures:seed`, `npm run test:fixtures:reset`, and
`npm run test:backend:integration`. The HTTP integration suites cover auth and catalogs,
the admin/public Questions CRUD and approval lifecycle, deterministic primary/cover
asset resolution, the Games board, reveal, scoring, skip, finish, subscription,
ownership and persistence lifecycle, Music upload/list/update/answer/soft-delete and
cleanup behavior, and reviewed AI generation/save behavior. They use the real Nest
modules, MongoDB repositories, guards, validation, orchestration, agents, prompt
builders, knowledge loading, repair, and response mappers.

Music HTTP tests replace only local audio storage, inspection, and snippet processing
with deterministic recording fakes. They cover default and custom snippet timing,
multipart validation, safe generated names, draft Question creation, normalized Arabic
answers, compensation, and response safety. Real FFmpeg/FFprobe execution remains in
the separate media integration suite.

AI HTTP tests inject a queued fake `LlmClientService` and deterministic `AssetService`.
They verify the generator → asset planner → asset reviewer → question reviewer order,
default count, knowledge fallback metadata, wrong-answer repair success/failure/empty
behavior, gameplay normalization, timeout and unavailable errors, independent primary
and cover failures, generation/persistence separation, partial and duplicate save-draft
reporting, legacy endpoint compatibility, and debug-tools authorization without calling
external providers. Fake-provider call counts prove fatal failures do not continue into
asset work. Live AI remains a separate opt-in check; broader browser coverage remains
Playwright debt and is intentionally outside this phase.

Games concurrency is verified against MongoDB by loading the same game twice, saving
one copy, and asserting that saving the stale copy raises Mongoose's version error.
Run these suites through `docker compose -f docker-compose.test.yml run --rm
backend-integration`; the current baseline is 5 suites and 31 tests (about 5 seconds
after MongoDB is healthy). They remain in
`verify:full` rather than the offline `verify` command because they require MongoDB.

Run the real synthetic-tone suite locally when FFmpeg/FFprobe exist, or with
`npm run test:media:integration:docker`. `npm run verify:full` uses the Docker
integration and media runners before Playwright, so it does not depend on host FFmpeg.

OpenAPI generation uses a controller-only documentation module and performs no MongoDB,
storage, media, seed, or AI initialization. `npm run api:check` proves this with an
unreachable MongoDB URI and a 15-second bound before validating byte-for-byte drift.

`npm run test:ai:live` is skipped unless all explicit `LIVE_AI_*` variables are set;
it requests one reviewed draft and never calls the save-drafts endpoint.

## Known Next.js workspace warning

Local Next.js 15.5.19 builds succeed but its lockfile repair code emits
`ENOWORKSPACES` while incorrectly probing `pnpm config get registry`. The repository
has one authoritative root npm lockfile and already sets `outputFileTracingRoot`.
Docker performs the same SWC lockfile repair successfully. No lockfile is deleted and
the project remains on npm; this is retained as upstream-tooling noise because the
production build exits successfully.
