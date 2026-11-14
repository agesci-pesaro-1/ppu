# 0015. Immagini dei distintivi scaricate e servite dal Worker

- **Stato:** Proposta
- **Data:** 2026-11-14

## Contesto

Il catalogo di progressione (`catalogo_progressione`) ha per molte voci un'immagine del distintivo: specialità, brevetti, tappe, Promesse. Le immagini non sono nostre: vengono dal sito AGESCI (avventura.agesci.it) e da rivenditori (ilcastoroscoutshop.com, scoutshopcampania.it), senza una licenza che ne permetta la ridistribuzione. Per questo nel database c'è solo il collegamento all'originale (`immagine_url`) e nel repository, pubblico sotto AGPL, non c'è nessun file.

Se la PWA caricasse le immagini direttamente da quei collegamenti:

- il browser di ogni capo farebbe richieste a siti esterni, che vedrebbero indirizzo IP e orari d'uso dell'app;
- la demo pubblica avrebbe uscite esterne, contro la regola «nessuna uscita esterna»;
- l'app dipenderebbe da siti che possono cambiare o togliere le immagini in qualsiasi momento, soprattutto quelli dei rivenditori.

## Decisione

Ogni istanza tiene la propria copia delle immagini e la PWA le chiede solo al Worker.

- `immagine_url` resta la **fonte**: da dove scaricare l'immagine, non l'indirizzo usato dalla PWA.
- Il Worker scarica l'immagine dalla fonte e la salva in un bucket **R2** dell'istanza, creato con giurisdizione UE come il D1. La chiave dell'oggetto deriva dall'URL di origine, così una fonte nuova produce un oggetto nuovo.
- La PWA chiede le immagini a un endpoint del Worker (per esempio `/api/immagini/catalogo/{id}`), che le serve da R2 con intestazioni di cache lunghe. Come le altre chiamate della PWA, passa dalla verifica del JWT di Access.
- Lo scaricamento avviene:
  - con uno strumento dell'MCP admin, che scarica (o riscarica) tutte le immagini del catalogo: si usa dopo l'installazione e dopo ogni nuova versione del catalogo;
  - in modo pigro alla prima richiesta di un'immagine non ancora presente, come rete di sicurezza.
- Se la fonte non risponde, il Worker restituisce un segnaposto neutro e lo registra nei log, senza dati personali. L'immagine già salvata non si cancella se la fonte sparisce.
- Nella **demo pubblica** le immagini si scaricano durante la preparazione dell'istanza e lo scaricamento pigro è disattivato: a regime il Worker della demo non fa uscite esterne.
- Il webmaster può sostituire l'immagine di una voce (per esempio con una ufficiale) cambiando `immagine_url` dall'MCP admin, con registro.

## Alternative scartate

- **Collegamento diretto dalla PWA:** espone gli utenti a siti terzi, viola la regola della demo e rende l'app fragile.
- **File nel repository:** ridistribuirebbe con licenza AGPL immagini di cui non abbiamo i diritti.
- **Immagini come BLOB in D1:** evita un servizio in più, ma gonfia il database condiviso da beta e produzione, le sue esportazioni e i ripristini; R2 è fatto per file di questo tipo.
- **Solo scaricamento pigro:** la prima apertura di ogni immagine dipenderebbe dalla fonte; e la demo farebbe uscite esterne a regime.

## Conseguenze

- Nuovo binding R2 nel Worker e un bucket per istanza (più uno per ogni ambiente di preview), da creare nella pipeline di deploy con giurisdizione UE.
- Serve uno strumento MCP admin «scarica immagini del catalogo» e un endpoint di lettura per la PWA.
- Le richieste esterne partono solo dal Worker, mai dal browser dei capi.
- Ogni gruppo conserva una copia delle immagini per uso interno: resta valido che non vanno ridistribuite, e il README dell'installazione lo deve dire.
- Quando AGESCI renderà disponibili immagini ufficiali con una licenza chiara, basterà aggiornare `immagine_url` e riscaricare.
