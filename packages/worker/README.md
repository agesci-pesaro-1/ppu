# Worker PPU

Backend unico di PPU (ADR 0004): API REST per la PWA ed endpoint MCP (per ora l'MCP admin del webmaster). Tutti gli ingressi passano dallo stesso livello di servizi.

## Struttura

- `src/config.ts`: legge e valida la configurazione dell'installazione.
- `src/identita/`: identità dal JWT di Cloudflare Access (o dall'header di test in locale e preview) e caricamento di unità e ruoli da `utenti`.
- `src/servizi/permessi.ts`: le regole di permesso, in un solo posto.
- `src/servizi/registro.ts`: registro delle modifiche (nello stesso batch del dato) e delle letture sensibili.
- `src/dominio/campi.ts`: quali campi sono anagrafica Buona Strada e quali sensibili.
- `src/servizi/anteprime.ts`: anteprima prima/dopo → conferma esplicita, riusabile da ogni tipo di modifica (tabella `anteprime`).
- `src/servizi/admin/`: gestione di utenti, unità e tag, riservata al webmaster.
- `src/identita/google.ts` e `src/oauth/`: login Google per l'MCP (pagina di consenso, PKCE, controllo del dominio).
- `src/mcp/`: endpoint MCP Streamable HTTP senza stato (`/mcp/admin`).
- `src/rest/`: API REST per la PWA.

## Configurazione

| Variabile | Obbligatoria | Descrizione |
| --- | --- | --- |
| `AMBIENTE` | sì | `locale`, `preview`, `beta`, `produzione`, `demo` |
| `DOMINIO` | sì | Dominio Google Workspace del gruppo |
| `NOME_GRUPPO` | no | Nome mostrato nell'interfaccia |
| `ACCESS_TEAM_DOMAIN` | sì, tranne con la modalità di test | `<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | sì, tranne con la modalità di test | Audience dell'applicazione Access |
| `MODALITA_TEST` | no | `attiva` per l'identità simulata: rifiutata fuori da `locale` e `preview` |
| `GOOGLE_CLIENT_ID` | per l'MCP | Segreto: ID del client OAuth Google |
| `GOOGLE_CLIENT_SECRET` | per l'MCP | Segreto: segreto del client OAuth Google |
| `OAUTH_KV` | per l'MCP | Binding KV del provider OAuth |

Configurazione del login Google e collegamento di Claude: [`docs/installazione/mcp-admin.md`](../../docs/installazione/mcp-admin.md).

In modalità di test l'identità si passa con l'header `X-Ppu-Utente-Test: <email>` (REST e MCP), usando gli utenti finti del seed demo (`capo.lupetti@example.org`, `capogruppo@example.org`, `webmaster@example.org`, ...).

## Sviluppo locale

```bash
cp .dev.vars.example .dev.vars
pnpm db:locale .wrangler/state
pnpm dev
```

`pnpm db:locale` ricrea da zero il D1 locale con migrazioni, seed base e seed demo. `wrangler dev` usa `.wrangler/state` come cartella predefinita.

## Ambienti pubblicati

`wrangler.jsonc` contiene le sezioni `preview`, `beta` e `produzione` senza valori del gruppo. La pipeline genera `wrangler.generato.json` con `scripts/configura-wrangler.ts` (vedi `docs/installazione/pipeline.md`).

## Test

`pnpm test` esegue i test dentro il runtime Workers (Miniflare), con le migrazioni reali e i seed base e demo applicati a un D1 locale.
