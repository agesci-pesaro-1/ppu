# 0010. Progetto open source, un'installazione separata per ogni gruppo

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Altri gruppi AGESCI hanno lo stesso problema. Un servizio centrale multi-gruppo renderebbe il nostro gruppo responsabile dei dati di altri, con oneri GDPR e costi che non può sostenere.

## Decisione

PPU è un progetto open source. Ogni gruppo installa la propria istanza con lo stesso codice: Worker, D1 e Access separati, nessun dato condiviso. Ogni gruppo è titolare dei propri dati.

- Lo schema esiste solo come migrazioni; i dati di base AGESCI sono in `seed/base/`, i dati finti in `seed/demo/`.
- Dominio, nome del gruppo, unità attive e branding stanno in configurazione e nei segreti di Cloudflare: nessun valore specifico del gruppo nel codice.
- L'import dal foglio usa una mappatura delle colonne configurabile.
- Rilasci con versione e changelog; la pipeline applica le migrazioni mancanti.
- Una demo pubblica con dati finti permette di provare PPU senza installarlo.

## Alternative scartate

- **Servizio centrale multi-gruppo:** responsabilità sui dati di altri, costi oltre i piani gratuiti, un unico punto di compromissione.
- **Codice chiuso:** nessun aiuto da altri gruppi, nessuna verificabilità da parte delle famiglie.

## Conseguenze

- Documentazione di installazione scritta per chi non è sviluppatore, e script di setup.
- Ogni scelta va valutata anche per un gruppo diverso dal nostro (unità diverse, dimensioni diverse).
- Mai dati reali nel repository pubblico.
