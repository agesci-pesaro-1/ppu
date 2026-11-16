#!/usr/bin/env bash
# Crea da zero un D1 locale con migrazioni, configurazione d'esempio del gruppo,
# seed base e dati demo (seed/README.md).
# Uso: scripts/prepara-db-locale.sh [cartella]   (predefinita: .wrangler/e2e)
# Solo dati inventati: non usare mai con dati reali.
set -euo pipefail

cd "$(dirname "$0")/.."
stato="${1:-.wrangler/e2e}"
generati="$(mktemp -d)"
trap 'rm -rf -- "$generati"' EXIT

node ../../scripts/group-seed.ts >"$generati/gruppo.sql"
node ../../scripts/demo-seed.ts >"$generati/demo.sql"

rm -rf -- "$stato"
export CI=1 # nessuna domanda interattiva da wrangler
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$stato"
for file in "$generati/gruppo.sql" ../../seed/base/*.sql "$generati/demo.sql"; do
  pnpm exec wrangler d1 execute DB --local --persist-to "$stato" --file "$file" >/dev/null
  echo "Applicato $(basename "$file")"
done
