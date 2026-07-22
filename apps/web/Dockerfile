# --- Build Stage ---
FROM node:20-alpine AS builder
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace package manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/

# Install workspace dependencies
RUN pnpm install

# Copy workspace source
COPY . .

# Build web frontend static assets and workspace dependencies
RUN pnpm --filter @roms/web... build

# --- Production Runner Stage ---
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static assets from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
