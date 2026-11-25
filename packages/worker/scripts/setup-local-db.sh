#!/usr/bin/env bash
# Creates a local D1 from scratch with the migrations, the example group
# configuration, seed/base and the demo data (see seed/README.md).
# Usage: scripts/setup-local-db.sh [dir]   (default: .wrangler/e2e)
# Fake data only: never use with real data.
set -euo pipefail

cd "$(dirname "$0")/.."
state="${1:-.wrangler/e2e}"
generated="$(mktemp -d)"
trap 'rm -rf -- "$generated"' EXIT

node ../../scripts/group-seed.ts >"$generated/group.sql"
node ../../scripts/demo-seed.ts >"$generated/demo.sql"

rm -rf -- "$state"
export CI=1 # no interactive prompts from wrangler
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$state"
for file in "$generated/group.sql" ../../seed/base/*.sql "$generated/demo.sql"; do
  pnpm exec wrangler d1 execute DB --local --persist-to "$state" --file "$file" >/dev/null
  echo "Applied $(basename "$file")"
done
