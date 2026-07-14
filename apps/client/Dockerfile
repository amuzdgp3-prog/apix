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
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/client/ apps/client/

# Re-install to fix workspace symlinks after copying sources
RUN pnpm install --no-frozen-lockfile

# Build shared package and client
RUN cd packages/shared && npx tsc
RUN cd apps/client && npx vite build

# ---- Result: built files are in apps/client/dist ----
FROM busybox:latest
COPY --from=builder /app/apps/client/dist /dist
# Fix permissions: nginx needs read access (UID 101), Vite may create assets/ with 0700
RUN chmod -R 755 /dist && chmod -R a+r /dist
