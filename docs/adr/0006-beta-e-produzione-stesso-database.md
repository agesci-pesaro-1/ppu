# 0006. Beta e produzione sullo stesso database, migrazioni retrocompatibili

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Ogni versione passa da un gruppo di tester prima di arrivare a tutti i capi. I tester devono lavorare sui dati veri, altrimenti il loro lavoro va perso. Il piano gratuito non giustifica una sincronizzazione tra database.

## Decisione

- **preview:** per ogni pull request, D1 separato con seed demo e identità simulata da una modalità di test del Worker, attiva solo lì.
- **beta:** al merge su main, sottodominio protetto da Access aperto solo agli utenti `beta_tester`; usa il D1 di produzione.
- **produzione:** promozione manuale da GitHub dopo il via libera dei tester, con rollback alla versione precedente.

Poiché beta e produzione condividono il D1, ogni migrazione deve funzionare sia con la versione corrente sia con la precedente: prima si aggiunge (colonne, tabelle), poi si toglie in una migrazione successiva, quando nessuna versione in uso dipende più dal vecchio schema.

## Alternative scartate

- **Database di beta separato con copia dei dati:** dati reali duplicati, modifiche dei tester perse o da riconciliare.
- **Beta su dati finti:** non verifica i casi reali.
- **Nessuna beta:** ogni errore arriva subito a tutti i capi.

## Conseguenze

- Le migrazioni distruttive (rinomina, rimozione, cambio di tipo) richiedono due passaggi in due rilasci.
- Le migrazioni si applicano al D1 di produzione al merge su main, prima del deploy della beta.
- La modalità di test dell'identità non deve mai essere attivabile in beta o produzione: va verificata dalla pipeline.
