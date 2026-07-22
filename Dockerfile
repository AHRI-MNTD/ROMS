# --- Build Stage ---
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install workspace dependencies
RUN pnpm install

# Copy entire repository source
COPY . .

# Generate Prisma Client code
RUN pnpm exec prisma generate --schema=packages/db/prisma/schema.prisma

# Build the API package and all dependent packages
RUN pnpm --filter @roms/api... build

# --- Production Runner Stage ---
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Install pnpm for running db tasks if needed
RUN npm install -g pnpm@9

# Copy compiled application code and workspace dependencies from builder
COPY --from=builder /app ./
RUN chmod +x /app/apps/api/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]

# Start production API server
CMD ["node", "apps/api/dist/index.js"]
