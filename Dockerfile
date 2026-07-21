# --- Build Stage ---
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate --schema=packages/db/prisma/schema.prisma
RUN pnpm --filter @roms/api... build
RUN pnpm prune --prod

# --- Production Runner Stage ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
