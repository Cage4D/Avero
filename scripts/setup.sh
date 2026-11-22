#!/usr/bin/env bash
# Bootstrap a local AVERO development environment.
set -euo pipefail

cd "$(dirname "$0")/.."

info() { printf '\n\033[1;33m▸ %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

info "Checking Node.js version"
required="$(cat .nvmrc)"
command -v node >/dev/null || fail "Node.js is not installed. Install v${required} (e.g. 'nvm install')."
current="$(node -p 'process.versions.node')"
if [ "${current%%.*}" != "${required%%.*}" ]; then
  fail "Node ${required} required, found ${current}. Run 'nvm use'."
fi
echo "Node ${current}"

info "Checking pnpm"
command -v pnpm >/dev/null || fail "pnpm is not installed. Install it with 'npm install -g pnpm'."
echo "pnpm $(pnpm --version)"

info "Installing dependencies"
pnpm install

info "Creating .env files from .env.example where missing"
for dir in apps/api apps/web; do
  if [ ! -f "$dir/.env" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "created $dir/.env"
  else
    echo "kept existing $dir/.env"
  fi
done

info "Starting Postgres (docker compose)"
command -v docker >/dev/null || fail "Docker is not installed. Install Docker or point DATABASE_URL/DIRECT_URL at your own Postgres and run 'pnpm db:migrate && pnpm db:seed'."
docker compose up -d --wait postgres

info "Running Prisma migrations"
pnpm --filter @avero/api exec prisma migrate deploy

info "Seeding the database"
pnpm db:seed

info "Generating the API contract"
pnpm contract:generate

info "Done. Start everything with: pnpm dev"
