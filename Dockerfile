# Development Dockerfile for AIRIS Code
FROM node:24-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.21.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY apps/airiscode-cli/package.json ./apps/airiscode-cli/
COPY packages/airiscode-core/package.json ./packages/airiscode-core/

RUN pnpm install --frozen-lockfile=false

COPY apps ./apps
COPY packages ./packages

CMD ["sleep", "infinity"]
