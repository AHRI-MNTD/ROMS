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

# Copy only runtime artifacts and dependencies; do not ship source files or local secrets.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
RUN chmod +x /app/apps/api/docker-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]

# Start production API server
CMD ["node", "apps/api/dist/index.js"]
