# Lammah Game

Lammah Game is split into a NestJS backend and a Next.js frontend.

## Project structure

```text
Lammah-game/
├── Lammah-game-backend/   # NestJS API, MongoDB/Mongoose, auth, AI, music
├── Lammah-game-frontend/  # Next.js web app
└── docker-compose.yml     # Local/VPS Docker setup
```

## Environment files

Create local env files from the examples before running the apps:

```sh
cp Lammah-game-backend/.env.example Lammah-game-backend/.env
cp Lammah-game-frontend/.env.example Lammah-game-frontend/.env.local
```

Do not commit `.env`, `.env.local`, or other real secret files. Keep real JWT secrets, API keys, Spotify credentials, and database URLs out of GitHub.

## Backend env variables

Required:

- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: strong secret used to sign auth tokens.

Common optional values:

- `PORT`: backend port, defaults to `3000`.
- `APP_BASE_URL`: public backend URL, for example `http://localhost:3000`.
- `JWT_EXPIRES_IN`: token lifetime, for example `7d`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`: optional first admin seed.
- `AI_PROVIDER`: `openrouter` or `lmstudio`.
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`: required when using OpenRouter.
- `LMSTUDIO_BASE_URL`, `LMSTUDIO_MODEL`, `LMSTUDIO_API_KEY`: used when using LM Studio.
- `AI_REQUEST_TIMEOUT_MS`, `AI_MAX_TOKENS`, `AI_ENABLE_REWRITE`, `AI_AUDIO_VOICE`: AI generation tuning.
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_MARKET`, `SPOTIFY_SEED_TRACKS`: music question support.

## Frontend env variables

- `NEXT_PUBLIC_API_URL`: browser-visible backend URL, for example `http://localhost:3000`.

## Run locally

From the repo root, you can run common workspace commands:

```sh
npm run build
npm run lint
npm test
npm run verify
```

See [TESTING.md](TESTING.md) for unit, browser, integration-boundary, and fixture
guidance. Dependencies are managed by the single root `package-lock.json`.

Backend:

```sh
cd Lammah-game-backend
npm install
npm run start:dev
```

Frontend:

```sh
cd Lammah-game-frontend
npm install
npm run dev
```

Local URLs:

- Backend API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`
- Frontend: `http://localhost:3001`

## Run with Docker Compose

The compose file is set up for a simple testing server/VPS with local MongoDB:

```sh
cp Lammah-game-backend/.env.example Lammah-game-backend/.env
docker compose up --build
```

Docker URLs:

- Backend API: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- MongoDB: `localhost:27017`

If you use MongoDB Atlas instead of the bundled local MongoDB service, set `MONGODB_URI` to your Atlas connection string and remove the `mongodb` service, `backend.depends_on`, and the `MONGODB_URI` override from `docker-compose.yml`.
