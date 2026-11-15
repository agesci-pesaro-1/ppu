# Pipeline di GitHub Actions

PPU si pubblica solo da GitHub Actions, mai da una macchina locale (ADR 0008). Questa guida elenca cosa configurare nel repository del proprio gruppo.

## Flussi

| Workflow | Quando | Cosa fa |
| --- | --- | --- |
| `ci.yml` | ogni pull request e ogni push su `main` | `pnpm check`, `pnpm typecheck`, `pnpm test`; controllo della firma DCO su ogni commit della pull request |
| `preview.yml` | apertura e aggiornamento di una pull request | crea il D1 `ppu-preview-pr-<n>` (giurisdizione UE), applica migrazioni, seed base e seed demo, pubblica il Worker `ppu-preview-pr-<n>` su `workers.dev` con identità simulata, commenta l'indirizzo sulla pull request, esegue i test E2E |
| `preview-chiusura.yml` | chiusura o merge della pull request | elimina Worker e D1 della preview |
| `rilascio.yml` | push su `main` | test, migrazioni sul D1 di produzione, deploy della **beta** |
| `rilascio.yml` | avvio manuale (*Run workflow*) | deploy della **produzione** (dopo l'approvazione dell'environment) o di nuovo della beta |

Senza i segreti di Cloudflare, preview e rilascio si saltano con un avviso: la CI funziona comunque. Le pull request da fork non ricevono segreti, quindi non hanno preview.

## Segreti del repository

*Settings → Secrets and variables → Actions → Secrets*

| Nome | Valore |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Token API di Cloudflare con i permessi *Workers Scripts: Edit* e *D1: Edit* sull'account del gruppo (più *Zone: Workers Routes: Edit* e *DNS: Edit* sulla zona se si usano domini personalizzati) |
| `CLOUDFLARE_ACCOUNT_ID` | ID dell'account Cloudflare del gruppo |

## Variabili del repository

*Settings → Secrets and variables → Actions → Variables*. Valgono per beta e produzione.

| Nome | Esempio | Note |
| --- | --- | --- |
| `PPU_DOMINIO` | `example.org` | Dominio Google Workspace del gruppo |
| `PPU_NOME_GRUPPO` | `Gruppo Esempio 1` | Facoltativa |
| `PPU_ACCESS_TEAM_DOMAIN` | `esempio.cloudflareaccess.com` | Team di Cloudflare Access |
| `PPU_D1_NOME` | `ppu` | Nome del D1 di produzione, condiviso da beta e produzione |
| `PPU_D1_ID` | `xxxxxxxx-xxxx-...` | ID del D1 di produzione |

## Environments

*Settings → Environments*

| Environment | Protezione | Variabili dell'environment |
| --- | --- | --- |
| `beta` | branch di deploy: solo `main` | `PPU_ACCESS_AUD` (audience dell'applicazione Access della beta), `PPU_ROUTE` (per esempio `ppu-api-beta.example.org`, facoltativa) |
| `produzione` | branch di deploy: solo `main`; **revisori obbligatori** (chi dà il via libera dopo i tester) | `PPU_ACCESS_AUD`, `PPU_ROUTE` |

Le variabili dell'environment hanno la precedenza su quelle del repository con lo stesso nome.

## Prima installazione su Cloudflare

Una sola volta, da chi amministra l'account Cloudflare del gruppo:

1. Creare il D1 di produzione **con giurisdizione UE**. La giurisdizione si sceglie solo alla creazione: dalla dashboard (*Storage & Databases → D1 → Create*, *Jurisdiction: EU*) oppure con `wrangler d1 create ppu --jurisdiction eu`. Annotare nome e ID in `PPU_D1_NOME` e `PPU_D1_ID`.
2. Creare in Cloudflare Access un'applicazione per ciascun indirizzo pubblico (beta e produzione), con Google Workspace come provider e la regola sul dominio; per la beta, la regola ammette solo i tester. Copiare l'*Application Audience (AUD) Tag* in `PPU_ACCESS_AUD` dell'environment corrispondente.
3. Il primo rilascio applica le migrazioni. Il seed base va applicato una volta sul D1 di produzione (verrà automatizzato dallo script di installazione).

Il Worker di beta e produzione **non** è pubblicato su `workers.dev`: è raggiungibile solo dalla rotta configurata, protetta da Access. Senza il JWT di Access ogni chiamata risponde 401.

## Preview

- D1 e Worker per pull request, eliminati alla chiusura.
- Solo dati del seed demo, dominio `example.org`, identità simulata con l'header `X-Ppu-Utente-Test`. La preview è pubblica su `workers.dev` ma non contiene dati reali.
- Il seed demo si applica solo a un D1 vuoto; i push successivi applicano soltanto le migrazioni nuove.

## Protezioni sulla modalità di test

L'identità simulata non può arrivare in beta o produzione per tre motivi indipendenti:

1. `wrangler.jsonc` la attiva solo nella sezione `preview`;
2. `scripts/configura-wrangler.ts` rifiuta di generare una configurazione di beta o produzione che la contenga, e `rilascio.yml` blocca il deploy se il file generato la nomina;
3. il Worker stesso (`src/config.ts`) rifiuta di avviarsi con `MODALITA_TEST` fuori da `locale` e `preview`.

## Rollback

Per tornare alla versione precedente del Worker, da un workflow o da chi ha accesso all'account Cloudflare:

```bash
pnpm exec wrangler rollback --name ppu-produzione --message "Motivo del rollback"
```

Per la beta il Worker si chiama `ppu-beta`. Il rollback riguarda solo il codice: le migrazioni sono sempre retrocompatibili con la versione precedente (ADR 0008), quindi il database non va toccato.

## Test E2E in locale

```bash
pnpm e2e
```

Playwright prepara un D1 locale da zero (migrazioni, seed base e demo in `packages/worker/.wrangler/e2e`), avvia `wrangler dev` con l'identità simulata ed esegue i test. Per provarli contro una preview già pubblicata:

```bash
E2E_BASE_URL=https://ppu-preview-pr-12.esempio.workers.dev pnpm e2e
```
