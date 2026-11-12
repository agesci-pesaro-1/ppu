# Contribuire a PPU

Grazie per l'interesse. PPU gestisce dati di minori: alcune regole qui sotto non sono negoziabili.

## Regole fondamentali

- **Mai dati reali** nel repository, nei test, nelle fixture, negli screenshot o nei log. Solo dati inventati.
- **I permessi si controllano nel livello di servizi**, mai solo nella UI o nel prompt del modello.
- **Nessun valore specifico di un gruppo nel codice** (dominio, nome, unità attive, colori): vanno in configurazione.
- **Lo schema del database cambia solo con migrazioni** numerate in `migrations/`, compatibili con la versione precedente del codice (prima si aggiunge, poi si toglie).
- **Le scelte architetturali si registrano come ADR** in `docs/adr/`. Un ADR accettato non si modifica: se ne scrive uno nuovo che lo supera.

## Lingua

Interfaccia, documentazione e ADR in italiano. Tabelle e colonne di dominio in italiano senza accenti (`associati`, `unita`, `riunioni`). Funzioni di infrastruttura e utility in inglese.

## Ambiente di sviluppo

L'ambiente consigliato è GitHub Codespaces, configurato in `.devcontainer/`. In locale servono Node.js 26 e pnpm:

```bash
corepack enable
pnpm install
pnpm check
```

`pnpm check` esegue lint e formattazione con Biome; `pnpm format` corregge la formattazione.

## Pull request

- Una cosa per volta: pull request piccole e focalizzate.
- Le funzionalità grandi si dividono in più pull request in sequenza.
- Ogni pull request passa dalla pipeline (lint, test, build, preview, E2E) e da una revisione prima del merge.
- Se la modifica cambia una decisione registrata, aggiungi un nuovo ADR nella stessa pull request.

## Firma DCO

Ogni commit deve essere firmato con il [Developer Certificate of Origin](https://developercertificate.org/) (DCO). Con la firma dichiari di avere il diritto di contribuire quel codice con la licenza del progetto (AGPL-3.0).

Si firma aggiungendo `-s` al commit:

```bash
git commit -s -m "Descrizione della modifica"
```

Git aggiunge in fondo al messaggio una riga come questa, con il nome e l'email della tua configurazione:

```
Signed-off-by: Nome Cognome <nome@example.com>
```

Se hai dimenticato la firma sull'ultimo commit:

```bash
git commit --amend -s --no-edit
```

Per più commit di una pull request:

```bash
git rebase --signoff main
```

### Testo del DCO

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

## Segnalare problemi di sicurezza

Non aprire una issue pubblica per vulnerabilità o esposizione di dati: scrivi ai maintainer tramite la funzione "Report a vulnerability" della scheda Security del repository.
