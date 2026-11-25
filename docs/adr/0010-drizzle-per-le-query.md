# 0010. Drizzle per le query, schema nelle migrazioni SQL

- **Stato:** Accettata
- **Data:** 2026-11-16

## Contesto

Il Worker legge e scrive D1 (ADR 0002). Con le query SQL scritte a mano:

- un nome di colonna sbagliato o un tipo sbagliato si scopre solo quando la query gira;
- le righe arrivano con i nomi italiani delle colonne (`accesso_completo`, `associato_id`), mentre il codice è in inglese: ogni lettura va tradotta a mano, campo per campo;
- i booleani arrivano come 0/1 e vanno convertiti ogni volta.

Lo schema però usa cose che nessun ORM sa descrivere nel proprio formato: tabelle `STRICT`, trigger che rendono `modifiche` e `accessi` immodificabili, `CHECK` su date e valori, indici unici parziali. Sono le protezioni del registro e dei dati, molti dei quali di minori.

Inoltre beta e produzione condividono lo stesso D1 (ADR 0006): ogni migrazione deve funzionare con la versione corrente e con la precedente. SQLite sa cambiare poco con `ALTER TABLE`, e gli strumenti che generano migrazioni ricorrono spesso alla ricreazione della tabella (nuova tabella, copia dei dati, cancellazione della vecchia), che perde `STRICT` e i trigger e non è compatibile con la versione precedente.

## Decisione

- Il Worker usa **Drizzle ORM** (`drizzle-orm/d1`) per tutte le query.
- **Le migrazioni SQL restano la fonte di verità dello schema**, scritte a mano in `migrations/` come oggi. `drizzle-kit` non genera migrazioni.
- `packages/worker/src/db/schema.ts` **rispecchia** lo schema: tabelle, colonne, tipi, `NOT NULL`, valori predefiniti, chiavi primarie ed esterne. Le colonne restano in italiano, le proprietà nel codice sono in inglese (per esempio `fullAccess: integer('accesso_completo', { mode: 'boolean' })`). `CHECK`, indici, `STRICT` e trigger stanno solo nelle migrazioni; i valori ammessi dai `CHECK` che il codice usa (canali, entità del registro, stati) sono ripetuti come `enum` per tipizzare le query.
- Un test (`packages/worker/test/schema.test.ts`) confronta lo schema Drizzle con il database migrato e fallisce se tabelle, colonne, tipi, `NOT NULL`, valori predefiniti o chiavi non coincidono. Una migrazione che cambia tabelle o colonne deve aggiornare anche `schema.ts` nella stessa pull request.
- Le scritture che vanno salvate insieme (un dato e la sua riga di `modifiche`) usano `db.batch()` di Drizzle, che corrisponde al batch atomico di D1.
- Il SQL scritto a mano resta ammesso dove Drizzle non arriva, con `sql` di Drizzle e parametri, mai concatenando valori.

## Alternative scartate

- **Query SQL a mano:** nessun controllo dei tipi e traduzione manuale dei nomi a ogni lettura.
- **Schema in TypeScript come fonte, migrazioni generate da `drizzle-kit`:** una sola definizione, ma trigger e `STRICT` andrebbero comunque scritti a mano a parte, e le migrazioni generate che ricreano le tabelle perderebbero quelle protezioni e romperebbero la compatibilità con la versione precedente. Ogni migrazione andrebbe riletta e corretta: le protezioni dipenderebbero da cosa genera uno strumento.
- **Kysely:** query builder vicino al SQL, con tipi generati dal database e senza schema duplicato; ma i tipi avrebbero i nomi italiani delle colonne, la traduzione verso il codice resterebbe manuale, e il batch di D1 andrebbe gestito a parte.
- **Prisma:** pesante per i Workers e con un proprio sistema di migrazioni poco adatto a SQLite con trigger e tabelle `STRICT`.

## Conseguenze

- Le query sono tipizzate: colonne inesistenti, tipi sbagliati e valori fuori dai `CHECK` noti si vedono a `pnpm typecheck`.
- Lo schema si scrive due volte (SQL e TypeScript); il test di allineamento rende visibile ogni differenza in CI.
- Chi scrive una migrazione aggiorna anche `schema.ts`. Per i vincoli che il test non confronta (`CHECK`, indici, trigger) restano i test dello schema in `tests/db/`.
- D1 ammette al massimo 100 parametri per query: le scritture di massa vanno divise in più istruzioni dentro lo stesso batch (il registro delle modifiche usa già un `INSERT` per riga).
