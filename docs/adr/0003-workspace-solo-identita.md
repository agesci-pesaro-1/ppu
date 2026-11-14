# 0003. Workspace solo per identità, ruoli nel database

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

I capi hanno già un account Google Workspace del gruppo. Servono permessi per unità, ruoli speciali (accesso completo, referente Buona Strada, webmaster, tester beta) ed esclusioni (per esempio una segreteria). Leggere gruppi o attributi Workspace richiederebbe l'Admin SDK e privilegi sul dominio.

## Decisione

Google Workspace serve **solo** per identità e login. Un account del dominio configurato è un capo con lettura su tutto. Unità e ruoli stanno nella tabella `utenti` di D1 (chiave: email), scritta solo dall'MCP admin. Nessun gruppo né attributo Workspace viene letto.

## Alternative scartate

- **Gruppi Google o attributi personalizzati di Workspace:** servono Admin SDK e privilegi amministrativi sul dominio; il webmaster di PPU non è sempre l'amministratore di Workspace; più difficile da replicare.
- **Account e password propri di PPU:** un profilo in più da gestire, nessuna revoca automatica.

## Conseguenze

- Un account rimosso o sospeso su Workspace non può più fare login: l'accesso è revocato anche se la scheda in `utenti` resta.
- Un account del dominio senza scheda in `utenti` è un capo in sola lettura; un account non capo si esclude con il flag `escluso`.
- I permessi si controllano nel livello di servizi leggendo `utenti` a ogni richiesta.
