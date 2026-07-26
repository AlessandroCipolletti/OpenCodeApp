#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ] || [ ! -s .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is missing in .env. Copy values from .env.example and try again."
  exit 1
fi

echo "Starting PostgreSQL (Docker)..."
docker compose up -d --wait

echo "Running database migrations..."
npm run db:migrate

echo "Seeding database..."
npm run db:seed

echo "Starting API + web..."
echo "  Frontend: http://localhost:${WEB_PORT:-3000}"
echo "  API:      http://localhost:${API_PORT:-3001}/api"
npm run dev
