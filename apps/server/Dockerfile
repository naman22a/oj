FROM docker:27-cli AS docker-cli

# -----------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------
FROM node:24-bookworm-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# -----------------------------------------------
# Stage 2: Build
# -----------------------------------------------
FROM deps AS build

WORKDIR /app

COPY . .

RUN pnpm build

# -----------------------------------------------
# Stage 3: Production
# -----------------------------------------------
FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && useradd --uid 10001 --create-home --shell /usr/sbin/nologin app

WORKDIR /app

RUN mkdir -p /app/temp \
    && chown -R app:app /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/src/migrations ./src/migrations
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

USER app

EXPOSE 5000

CMD ["node", "dist/server.js"]
