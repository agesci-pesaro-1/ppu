# 0002. D1 relazionale con giurisdizione UE

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

I dati sono in gran parte di minori e soggetti al GDPR. Il modello ha relazioni naturali (associati, tutori, unità per anno, presenze, tag) e registri da interrogare (modifiche, accessi). Lo schema deve essere versionato e replicabile da altri gruppi.

## Decisione

Usiamo Cloudflare D1 (SQLite) come database relazionale, creato con `--jurisdiction eu` così che i dati restino nell'Unione europea. Lo schema esiste solo come migrazioni SQL numerate in `migrations/`, applicate dalla pipeline con `wrangler d1 migrations`. Il database è raggiungibile solo dal Worker.

## Alternative scartate

- **Database documentale (Firestore, KV):** vincoli di integrità e join a carico del codice, registri difficili da interrogare.
- **Postgres gestito esterno:** costi o limiti stretti nei piani gratuiti, un servizio in più da configurare per ogni gruppo.
- **D1 senza giurisdizione:** posizione dei dati non garantita.

## Conseguenze

- La giurisdizione si imposta **solo alla creazione**: va scritto nella guida di installazione e nello script di setup.
- Vincoli, chiavi esterne e transazioni (batch) disponibili; limiti di dimensione del piano gratuito ampiamente sufficienti per un gruppo.
- Mai modifiche a mano sul database: ogni cambio passa da una migrazione.
