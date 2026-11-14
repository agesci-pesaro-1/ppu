# 0001. Cloudflare (Workers, Pages, D1) al posto di Firebase

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

PPU serve un backend, un database e l'hosting di una PWA. Il gruppo vuole costo zero in pratica, senza carta di credito, e un'infrastruttura che altri gruppi possano replicare. Il dominio del gruppo è già gestito su Cloudflare. Il backend deve esporre anche un server MCP remoto con OAuth.

## Decisione

Usiamo Cloudflare: Workers per il backend, D1 per il database, Pages per la PWA, Access per proteggerla. Tutto sui piani gratuiti.

## Alternative scartate

- **Firebase (Firestore, Functions, Hosting):** le Cloud Functions richiedono il piano Blaze con carta di credito; Firestore è documentale e rende scomodi vincoli, relazioni e registri; le regole di sicurezza lato client spostano parte dei controlli fuori dal backend.
- **Server tradizionale (VPS):** costi fissi, manutenzione del sistema operativo e delle patch a carico di volontari.
- **Google Apps Script sul foglio esistente:** nessun controllo serio dei permessi per unità, nessun registro affidabile, difficile da replicare e testare.

## Conseguenze

- Costo nullo entro i limiti dei piani gratuiti (Access gratuito fino a 50 utenti).
- Un modello maturo per server MCP remoti con OAuth (`workers-oauth-provider`).
- Dipendenza da un solo fornitore: la logica resta in TypeScript standard e il database è SQLite, per limitare il costo di un eventuale cambio.
- Limiti del runtime Workers (tempo di CPU, niente API Node complete) da considerare nelle scelte delle librerie.
