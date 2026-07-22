#!/bin/sh
set -e

echo "================================================"
echo "🚀 Starting ROMS Production Initialization"
echo "================================================"

echo "==> Step 1: Applying Database Schema & Migrations..."
pnpm exec prisma db push --schema=packages/db/prisma/schema.prisma

echo "==> Step 2: Running Automated Database Seeding..."
pnpm --filter @roms/db exec tsx seed.ts || echo "⚠️ Seeding completed with warnings or skipped."

echo "==> Step 3: Launching ROMS API Server..."
exec "$@"
