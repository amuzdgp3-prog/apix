# ---- Build Stage ----
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

# Build shared package and server
RUN pnpm --filter @apix/shared build
RUN pnpm --filter @apix/server build

# ---- Production Stage ----
FROM node:22-alpine

WORKDIR /app

# Copy source (not just dist) — tsx resolves ESM imports without .js extensions
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY --from=builder /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
COPY --from=builder /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=builder /app/packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Fix pnpm symlink: replace symlink with real copy of @apix/shared
# Docker COPY doesn't preserve symlinks in multi-stage builds
RUN rm -rf /app/apps/server/node_modules/@apix/shared && \
    mkdir -p /app/apps/server/node_modules/@apix && \
    cp -r /app/packages/shared /app/apps/server/node_modules/@apix/shared && \
    rm -rf /app/apps/server/node_modules/@apix/shared/src /app/apps/server/node_modules/@apix/shared/tsconfig.json

EXPOSE 3001

CMD ["sh", "-c", "cd /app/apps/server && npx tsx /app/apps/server/src/index.ts"]
