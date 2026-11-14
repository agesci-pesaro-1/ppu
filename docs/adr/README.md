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
| [0006](0006-beta-e-produzione-stesso-database.md) | Beta e produzione sullo stesso database, migrazioni retrocompatibili | Accettata |
| [0007](0007-un-installazione-per-gruppo.md) | Un'installazione separata per ogni gruppo | Accettata |
| [0008](0008-buona-strada-fonte-ufficiale.md) | Buona Strada fonte ufficiale, allineamento manuale tracciato nel registro | Accettata |
