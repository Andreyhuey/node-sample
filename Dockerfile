# syntax=docker/dockerfile:1

# ---- build: install everything and compile TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- prod-deps: only the packages the app needs at runtime
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- runtime: small image with compiled JS, runtime deps and migrations
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./

# Don't run as root inside the container.
USER node
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

# Migrations run as a separate step (see docker-compose.yml and the deploy
# config) so a failed migration never starts a half-upgraded app.
CMD ["node", "dist/index.js"]
