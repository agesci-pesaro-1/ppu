# PPU — Progressione Personale Unitaria

Gestionale degli associati per gruppi scout AGESCI. I capi consultano e modificano anagrafica, presenze, progressione personale e tag da una PWA o dal proprio assistente AI (server MCP), con permessi per unità e login Google Workspace.

> **Stato:** in sviluppo, fase 0 (fondamenta). Non ancora utilizzabile.

## Come funziona

- **Due modi di lavorare, stesse regole:** dalla PWA o parlando con il proprio assistente AI. Entrambi passano dallo stesso backend.
- **Sicurezza sul server, non nel modello:** permessi, conferme e registro delle modifiche sono applicati dal backend.
- **Buona Strada resta la fonte ufficiale dell'anagrafica:** l'allineamento è manuale, tracciato e confermato da una seconda persona.
- **Dati di minori:** risposte minime di default, letture di dati sensibili registrate, dati sanitari fuori dal sistema.
- **Costo zero in pratica:** piani gratuiti di Cloudflare.

## Architettura

| Parte | Tecnologia |
| --- | --- |
| Backend | TypeScript su Cloudflare Workers: endpoint MCP (Streamable HTTP, OAuth Google) e API REST |
| Database | Cloudflare D1 (SQLite) con giurisdizione UE |
| PWA | Svelte + Vite su Cloudflare Pages, protetta da Cloudflare Access |
| Identità | Google Workspace, solo per il login |
| Notifiche | Webhook in ingresso di Google Chat |

Il piano completo è in [`docs/piano.md`](docs/piano.md); le decisioni architetturali sono in [`docs/adr/`](docs/adr/).

## Un'installazione per gruppo

PPU è pensato per essere installato da ogni gruppo sulla propria infrastruttura: stesso codice, Worker, D1 e Access separati, nessun dato condiviso tra gruppi. Dominio, nome del gruppo, unità attive e branding stanno in configurazione, non nel codice.

La guida di installazione arriverà nelle prossime fasi.

## Sviluppo

Requisiti: Node.js 26 e pnpm (tramite Corepack). L'ambiente consigliato è GitHub Codespaces, già configurato in `.devcontainer/`.

```bash
corepack enable
pnpm install
pnpm check
```

Il deploy avviene solo da GitHub Actions, mai da una macchina locale. Prima di contribuire leggi [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Licenza

Copyright © 2026 AGESCI Pesaro 1.

Il codice è distribuito con licenza [GNU Affero General Public License v3.0](LICENSE). Chi offre PPU come servizio a terzi deve pubblicare il codice delle proprie modifiche.
