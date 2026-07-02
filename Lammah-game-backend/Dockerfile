FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY Lammah-game-backend/package.json ./Lammah-game-backend/package.json
COPY Lammah-game-frontend/package.json ./Lammah-game-frontend/package.json
RUN npm ci

FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/Lammah-game-backend/package.json ./Lammah-game-backend/package.json
COPY --from=deps /app/Lammah-game-backend/node_modules ./Lammah-game-backend/node_modules
COPY --from=deps /app/Lammah-game-frontend/package.json ./Lammah-game-frontend/package.json
COPY --from=deps /app/Lammah-game-frontend/node_modules ./Lammah-game-frontend/node_modules
COPY . .
RUN npm run build --workspace Lammah-game-backend

FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY Lammah-game-backend/package.json ./Lammah-game-backend/package.json
COPY Lammah-game-frontend/package.json ./Lammah-game-frontend/package.json
RUN npm ci --omit=dev
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_PATH=/app/Lammah-game-backend/node_modules:/app/node_modules
ENV PORT=3000

COPY --from=prod-deps --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/Lammah-game-backend/package.json ./Lammah-game-backend/package.json
COPY --from=prod-deps --chown=node:node /app/Lammah-game-backend/node_modules ./Lammah-game-backend/node_modules
COPY --from=build --chown=node:node /app/Lammah-game-backend/dist ./Lammah-game-backend/dist

RUN mkdir -p uploads && chown -R node:node uploads

USER node

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace", "Lammah-game-backend"]
