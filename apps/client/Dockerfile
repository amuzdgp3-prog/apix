# ---- Build Stage ----
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config and lockfile
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/client/package.json apps/client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/client/ apps/client/

# Build shared package and client
RUN pnpm --filter @apix/shared build
RUN pnpm --filter @apix/client build

# ---- Result: built files are in apps/client/dist ----
FROM busybox:latest
COPY --from=builder /app/apps/client/dist /dist