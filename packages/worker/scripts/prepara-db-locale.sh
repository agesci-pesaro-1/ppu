#!/usr/bin/env bash
# Crea da zero un D1 locale con migrazioni, seed base e seed demo.
# Uso: scripts/prepara-db-locale.sh [cartella]   (predefinita: .wrangler/e2e)
# Solo dati inventati: non usare mai con dati reali.
set -euo pipefail

cd "$(dirname "$0")/.."
stato="${1:-.wrangler/e2e}"

rm -rf "$stato"
export CI=1 # nessuna domanda interattiva da wrangler
pnpm exec wrangler d1 migrations apply DB --local --persist-to "$stato"
for file in ../../seed/base/*.sql ../../seed/demo/*.sql; do
  pnpm exec wrangler d1 execute DB --local --persist-to "$stato" --file "$file" >/dev/null
  echo "Applicato $file"
done
