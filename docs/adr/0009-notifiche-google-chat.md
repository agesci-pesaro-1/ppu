# 0009. Notifiche tramite webhook Google Chat

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Alcuni eventi richiedono di avvisare i capi: modifiche da riportare su Buona Strada, presenze non inserite dopo una riunione. Il gruppo usa già Google Workspace e i suoi spazi Chat.

## Decisione

Le notifiche partono dal Worker verso webhook in ingresso di Google Chat, uno per spazio, configurati come segreti. I messaggi contengono il minimo indispensabile (per esempio "3 modifiche da riportare") e un collegamento alla PWA, senza dati personali.

## Alternative scartate

- **Email:** servirebbe un servizio di invio e un mittente configurato; più rumorosa.
- **Notifiche push della PWA:** più complesse (chiavi VAPID, iscrizioni); restano un punto aperto per il futuro.
- **Bot Chat completo:** richiede un progetto Google Cloud con API Chat; eccessivo per avvisi a senso unico.

## Conseguenze

- Configurazione semplice: un URL segreto per spazio.
- Nessun dato degli associati nei messaggi: si consulta tutto nella PWA, con i controlli di accesso.
- Nella demo pubblica e in preview i webhook sono disattivati.
