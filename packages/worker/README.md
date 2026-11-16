# Worker PPU

Backend unico di PPU (ADR 0004): API REST per la PWA, e in seguito endpoint MCP. Tutti gli ingressi passano dallo stesso livello di servizi.

## Struttura

- `src/config.ts`: legge e valida la configurazione dell'installazione.
- `src/db/`: client Drizzle e `schema.ts`, che rispecchia le migrazioni (ADR 0010). Se una migrazione cambia tabelle o colonne, va aggiornato anche questo file: `test/schema.test.ts` confronta i due.
- `src/identity/`: identità dal JWT di Cloudflare Access (o dall'header di test in locale e preview) e caricamento di unità e ruoli da `utenti`.
- `src/services/permissions.ts`: le regole di permesso, in un solo posto.
- `src/services/audit-log.ts`: registro delle modifiche (`modifiche`, nello stesso batch del dato) e delle letture sensibili (`accessi`).
- `src/domain/fields.ts`: quali campi sono anagrafica Buona Strada e quali sensibili.
- `src/rest/`: API REST per la PWA.

## Configurazione

| Variabile | Obbligatoria | Descrizione |
| --- | --- | --- |
| `ENVIRONMENT` | sì | `local`, `preview`, `beta`, `production`, `demo` |
| `DOMAIN` | sì | Dominio Google Workspace del gruppo |
| `GROUP_NAME` | no | Nome mostrato nell'interfaccia |
| `ACCESS_TEAM_DOMAIN` | sì, tranne con la modalità di test | `<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | sì, tranne con la modalità di test | Audience dell'applicazione Access |
| `TEST_MODE` | no | `on` per l'identità simulata: rifiutata fuori da `local` e `preview` |

In modalità di test l'identità si passa con l'header `X-Ppu-Test-User: <email>`, usando gli utenti finti del seed demo (`capo.lupetti@example.org`, `capogruppo@example.org`, `webmaster@example.org`, ...).

## Sviluppo locale

```bash
cp .dev.vars.example .dev.vars
pnpm exec wrangler d1 migrations apply DB --local
pnpm -s --dir ../.. seed:group > /tmp/gruppo.sql
pnpm exec wrangler d1 execute DB --local --file /tmp/gruppo.sql
pnpm exec wrangler d1 execute DB --local --file ../../seed/base/0001_catalogo_progressione.sql
pnpm dev
```

## Test

`pnpm test` esegue i test dentro il runtime Workers (Miniflare), con le migrazioni reali, la configurazione d'esempio, il seed base e i dati demo (generati da `scripts/`) applicati a un D1 locale.
