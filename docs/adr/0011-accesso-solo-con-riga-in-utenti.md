# 0011. Accesso solo con una riga in `utenti`

- **Stato:** Accettata
- **Data:** 2026-11-16

## Contesto

L'ADR 0003 ha stabilito che Google Workspace serve solo per identità e login, e che un account del dominio senza scheda in `utenti` è un capo in sola lettura. Gli account del dominio che non sono capi (per esempio una segreteria) andavano esclusi uno per uno con il flag `escluso`.

PPU contiene dati in gran parte di minori. Con quella regola chiunque riceva un account nel dominio vede subito l'anagrafica di tutti, finché qualcuno non si ricorda di escluderlo: l'accesso è aperto per impostazione predefinita e la protezione dipende da un'azione manuale successiva. Nel dominio di un gruppo, oltre ai capi, possono esserci account condivisi o di servizio, ex capi che tengono la casella di posta, collaboratori esterni.

## Decisione

Il login resta comandato da Google Workspace, ma **entra in PPU solo chi ha una riga in `utenti`** non marcata `escluso`.

- Un account del dominio senza riga riceve un errore (`not_registered`, HTTP 403) con il messaggio «Non sei ancora abilitato a PPU: chiedi al webmaster del gruppo», sia dalla PWA sia dall'MCP.
- Una riga senza unità né ruoli è un capo in sola lettura.
- Il flag `escluso` resta e diventa la revoca dell'accesso: le righe di `utenti` non si cancellano (portano con sé storico e registro), quindi per togliere l'accesso a un ex capo si imposta `escluso`.
- Il primo webmaster si inserisce a mano una volta, all'installazione, seguendo la guida (`docs/installazione/pipeline.md`). Da lì in poi le righe di `utenti` si gestiscono solo dall'MCP admin.

Questo ADR supera la parte dell'ADR 0003 sugli account del dominio senza scheda in `utenti`; il resto dello 0003 resta valido.

## Alternative scartate

- **Lettura su tutto per ogni account del dominio, con esclusioni (ADR 0003):** apertura per impostazione predefinita su dati di minori; un account dimenticato vede tutto.
- **Gruppi Google o attributi Workspace per distinguere i capi:** scartati già dall'ADR 0003 (Admin SDK, privilegi sul dominio).
- **Primo webmaster da una variabile della pipeline:** scrive nel database a ogni rilascio o richiede logica per farlo una volta sola; un passo manuale all'installazione è più semplice e avviene una volta per gruppo.

## Conseguenze

- Ogni capo nuovo va abilitato dal webmaster con `set_user` prima di poter entrare. Conviene avere almeno due webmaster, così l'abilitazione non dipende da una sola persona; il sistema impedisce già di togliere il ruolo all'ultimo webmaster.
- Un'installazione senza righe in `utenti` non è utilizzabile finché non si inserisce il primo webmaster.
- Per ora chi non è abilitato vede solo l'errore; un collegamento diretto per scrivere al webmaster (email o Google Chat) si potrà aggiungere più avanti.
- Un account rimosso o sospeso su Workspace continua a non poter fare login, come nello 0003.
