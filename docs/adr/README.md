# Decisioni architetturali (ADR)

Ogni scelta architetturale di PPU è registrata qui come ADR (Architecture Decision Record).

## Regole

- Un file per decisione: `NNNN-titolo.md`, numerazione progressiva.
- Struttura: contesto, decisione, alternative scartate, conseguenze, stato.
- Stati: **Proposta**, **Accettata**, **Superata da NNNN**.
- Un ADR accettato non si modifica. Se la scelta cambia, si scrive un nuovo ADR che lo supera e si aggiorna solo lo stato di quello vecchio.
- Per un nuovo ADR, parti da [`modello.md`](modello.md).

## Elenco

| N. | Titolo | Stato |
| --- | --- | --- |
| [0001](0001-cloudflare-al-posto-di-firebase.md) | Cloudflare (Workers, Pages, D1) al posto di Firebase | Accettata |
| [0002](0002-d1-relazionale-giurisdizione-ue.md) | D1 relazionale con giurisdizione UE | Accettata |
| [0003](0003-workspace-solo-identita.md) | Workspace solo per identità, ruoli nel database | Accettata |
| [0004](0004-un-backend-mcp-e-rest.md) | Un solo backend con endpoint MCP e API REST | Accettata |
| [0005](0005-pwa-in-svelte.md) | PWA in Svelte, non Next.js né AppSheet | Accettata |
| [0006](0006-allineamento-buona-strada.md) | Allineamento manuale con Buona Strada, con conferma di una seconda persona | Accettata |
| [0007](0007-tag-liberi-con-revisione.md) | Tag liberi con revisione del webmaster | Accettata |
| [0008](0008-beta-e-produzione-stesso-database.md) | Beta e produzione sullo stesso database, migrazioni retrocompatibili | Accettata |
| [0009](0009-notifiche-google-chat.md) | Notifiche tramite webhook Google Chat | Accettata |
| [0010](0010-open-source-un-installazione-per-gruppo.md) | Progetto open source, un'installazione separata per ogni gruppo | Accettata |
| [0011](0011-licenza-agpl.md) | Licenza AGPL-3.0 per il codice | Accettata |
| [0012](0012-strumenti-di-sviluppo.md) | Strumenti di sviluppo: Node 26, pnpm, Biome | Proposta |
| [0013](0013-unita-nel-database.md) | Unità nel database, gestite dall'MCP admin | Proposta |
| [0014](0014-pwa-servita-dal-worker.md) | PWA servita dallo stesso Worker dell'API (supera l'hosting dell'ADR 0005) | Proposta |
