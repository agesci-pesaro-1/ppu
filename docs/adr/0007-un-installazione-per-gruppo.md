# 0007. Un'installazione separata per ogni gruppo

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Altri gruppi AGESCI hanno lo stesso problema e potranno usare PPU. Un servizio centrale multi-gruppo renderebbe il nostro gruppo responsabile dei dati di altri, con oneri GDPR e costi che non può sostenere.

## Decisione

Ogni gruppo installa la propria istanza con lo stesso codice: Worker, D1 e Access separati, nessun dato condiviso. Ogni gruppo è titolare dei propri dati. Il codice non è multi-tenant.

- Lo schema esiste solo come migrazioni; i dati di base AGESCI sono in `seed/base/`, i dati finti in `seed/demo/`.
- Dominio, nome del gruppo, unità attive e branding stanno in configurazione e nei segreti di Cloudflare: nessun valore specifico del gruppo nel codice.
- L'import dal foglio usa una mappatura delle colonne configurabile.
- Un gruppo si aggiorna installando un rilascio nuovo; la pipeline applica le migrazioni mancanti.

## Alternative scartate

- **Servizio centrale multi-gruppo:** responsabilità sui dati di altri, costi oltre i piani gratuiti, un unico punto di compromissione, isolamento tra gruppi da garantire nel codice.

## Conseguenze

- Installazione e aggiornamento devono essere ripetibili da chi non è sviluppatore: servono guida e script di setup.
- Ogni scelta va valutata anche per un gruppo diverso dal nostro (unità diverse, dimensioni diverse).
- Le migrazioni devono funzionare su istanze ferme a rilasci diversi.
