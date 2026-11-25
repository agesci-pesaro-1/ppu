# Worker PPU

Backend unico di PPU (ADR 0004): API REST per la PWA ed endpoint MCP (per ora l'MCP admin del webmaster). Tutti gli ingressi passano dallo stesso livello di servizi.

## Struttura

- `src/config.ts`: legge e valida la configurazione dell'installazione.
- `src/db/`: client Drizzle e `schema.ts`, che rispecchia le migrazioni (ADR 0010). Se una migrazione cambia tabelle o colonne, va aggiornato anche questo file: `test/schema.test.ts` confronta i due.
- `src/identity/`: identità dal JWT di Cloudflare Access (o dall'header di test in locale e preview) e caricamento di unità e ruoli da `utenti`.
- `src/services/permissions.ts`: le regole di permesso, in un solo posto.
- `src/services/audit-log.ts`: registro delle modifiche (`modifiche`, nello stesso batch del dato) e delle letture sensibili (`accessi`).
- `src/services/previews.ts`: anteprima prima/dopo → conferma esplicita, riusabile da ogni tipo di modifica (tabella `anteprime`).
- `src/services/admin/`: gestione di utenti, unità e tag, riservata al webmaster.
- `src/identity/google.ts` e `src/oauth/`: login Google per l'MCP (pagina di consenso, PKCE, controllo del dominio).
- `src/mcp/`: endpoint MCP Streamable HTTP senza stato (`/mcp/admin`).
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
| `GOOGLE_CLIENT_ID` | per l'MCP | Segreto: ID del client OAuth Google |
| `GOOGLE_CLIENT_SECRET` | per l'MCP | Segreto: segreto del client OAuth Google |
| `OAUTH_KV` | per l'MCP | Binding KV del provider OAuth |

Configurazione del login Google e collegamento di Claude: [`docs/installazione/mcp-admin.md`](../../docs/installazione/mcp-admin.md).

In modalità di test l'identità si passa con l'header `X-Ppu-Test-User: <email>` (REST e MCP), usando gli utenti finti del seed demo (`capo.lupetti@example.org`, `capogruppo@example.org`, `webmaster@example.org`, ...).

## Sviluppo locale

```bash
cp .dev.vars.example .dev.vars
pnpm db:local .wrangler/state
pnpm dev
```

`pnpm db:local` ricrea da zero il D1 locale con migrazioni, configurazione d'esempio del gruppo, seed base e dati demo. `wrangler dev` usa `.wrangler/state` come cartella predefinita.

## Ambienti pubblicati

`wrangler.jsonc` contiene le sezioni `preview`, `beta` e `production` senza valori del gruppo. La pipeline genera `wrangler.generated.json` con `scripts/wrangler-config.ts` (vedi `docs/installazione/pipeline.md`).

## Test

`pnpm test` esegue i test dentro il runtime Workers (Miniflare), con le migrazioni reali, la configurazione d'esempio, il seed base e i dati demo (generati da `scripts/`) applicati a un D1 locale.
