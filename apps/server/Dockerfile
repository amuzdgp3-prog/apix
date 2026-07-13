# ---- Build Stage ----
FROM node:22-alpine AS builder

# Install build tools for bcrypt native compilation
RUN apk add --no-cache python3 make g++

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN pnpm install --no-frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

RUN pnpm --filter @apix/shared build
RUN pnpm --filter @apix/server build

# ---- Production Stage ----
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/package.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/server/tsconfig.json ./apps/server/tsconfig.json
COPY --from=builder /app/apps/server/drizzle.config.ts ./apps/server/drizzle.config.ts
COPY --from=builder /app/packages/shared/tsconfig.json ./packages/shared/tsconfig.json
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules

# Create drizzle dir (migrations not in git, created at runtime by drizzle-kit)
RUN mkdir -p /app/apps/server/drizzle

# Fix pnpm symlink
RUN rm -rf /app/apps/server/node_modules/@apix/shared
RUN mkdir -p /app/apps/server/node_modules/@apix
RUN cp -r /app/packages/shared /app/apps/server/node_modules/@apix/shared
RUN rm -rf /app/apps/server/node_modules/@apix/shared/src /app/apps/server/node_modules/@apix/shared/tsconfig.json

EXPOSE 3001

CMD ["sh", "-c", "cd /app/apps/server && npx tsx src/index.ts"]