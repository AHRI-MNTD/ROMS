#!/bin/sh
set -e

echo "================================================"
echo "🚀 Starting ROMS Production Initialization"
echo "================================================"

echo "==> Step 1: Applying Database Schema & Migrations..."
if [ "$NODE_ENV" = "production" ]; then
  pnpm exec prisma migrate deploy --schema=packages/db/prisma/schema.prisma || pnpm exec prisma db push --schema=packages/db/prisma/schema.prisma
else
  pnpm exec prisma db push --schema=packages/db/prisma/schema.prisma
fi

echo "==> Step 2: Checking Seeding Configuration..."
if [ "$NODE_ENV" = "production" ] && [ "$ENABLE_SEED" != "true" ]; then
  echo "ℹ️ Seeding skipped in production environment (ENABLE_SEED is not true)."
else
  echo "==> Running Automated Database Seeding..."
  pnpm --filter @roms/db exec tsx seed.ts || echo "⚠️ Seeding completed with warnings or skipped."
fi

echo "==> Step 3: Launching ROMS API Server..."
exec "$@"
