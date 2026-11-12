# PPU — Progressione Personale Unitaria

Gestionale degli associati per gruppi scout AGESCI. I capi consultano e modificano i dati da una PWA o dal proprio assistente AI (server MCP). Progetto a codice aperto (AGPL-3.0): ogni gruppo installa la propria istanza con la stessa infrastruttura.

Il piano completo è in `docs/piano.md`. Le decisioni architetturali sono in `docs/adr/`. Prima di cambiare una scelta già registrata in un ADR, proponi un nuovo ADR invece di modificare quello esistente.

## Stack

- **Backend:** TypeScript su Cloudflare Workers. Un solo Worker con due ingressi sullo stesso livello di servizi:
  - endpoint MCP remoto (Streamable HTTP) per gli assistenti AI, con OAuth Google tramite `workers-oauth-provider`, limitato al dominio configurato;
  - API REST per la PWA.
- **Database:** Cloudflare D1 (SQLite), creato con `--jurisdiction eu`. La giurisdizione si imposta solo alla creazione.
- **PWA:** Svelte + Vite + `vite-plugin-pwa`, build statica su Cloudflare Pages, protetta da Cloudflare Access (Google Workspace come provider, regola sul dominio). Il Worker verifica il JWT di Access su ogni chiamata della PWA.
- **MCP admin:** strumenti riservati al webmaster (utenti, ruoli, unità, revisione dei tag).
- **Notifiche:** webhook in ingresso di Google Chat.
- **Test:** unit test + E2E con Playwright.
- **Strumenti:** Node.js 26, pnpm (workspace in `packages/*`), Biome per lint e formattazione (`pnpm check`).

## Regole di dominio (non negoziabili)

### Identità e permessi
- Google Workspace serve **solo** per identità e login. Nessun gruppo né attributo Workspace viene letto.
- Un account del dominio configurato è un capo con **lettura su tutto**.
- Unità e ruoli stanno nella tabella `utenti` (chiave: email):
  - `unita`: una o più unità in cui il capo può modificare;
  - `accesso_completo`: modifica su tutte le unità;
  - `buona_strada`: può confermare l'allineamento con Buona Strada;
  - `webmaster`: accede all'MCP admin;
  - `beta_tester`, `escluso`.
- Ogni unità può avere più capi con gli stessi permessi.
- I dati di un capo li modifica il capo stesso o chi ha accesso completo.
- **I permessi si controllano sempre nel livello di servizi**, mai solo nella UI o nel prompt del modello. MCP e REST chiamano le stesse funzioni.

### Unità
Lupetti, Coccinelle, Esploratori, Guide, Clan (rover e scolte), Noviziato, Co.Ca. Le unità attive sono configurabili per gruppo.

### Flusso delle modifiche
- Ogni modifica passa da **anteprima prima/dopo → conferma esplicita** di chi la fa.
- **Anagrafica** (campi marcati "Buona Strada"): dopo la conferma il nuovo valore è subito operativo e la modifica entra nel registro con stato `da_riportare`. Un utente con ruolo `buona_strada`, **diverso dall'autore**, conferma poi di averla riportata su Buona Strada. Il vincolo vale per tutti, anche per chi ha accesso completo.
- **Presenze, progressione, tag:** salvati subito dopo la conferma, con registro.
- Nessuna cancellazione definitiva: solo archiviazione.
- Le operazioni di massa richiedono una conferma esplicita.

### Privacy (dati in gran parte di minori)
- Risposte minime di default: nome, unità, essenziale. Contatti visibili nella scheda.
- Codici fiscali e campi solo Buona Strada non compaiono nelle viste normali.
- Le letture di dati sensibili si registrano nella tabella `accessi`.
- Genitori/tutori archiviati automaticamente al compimento dei 18 anni.
- Dati sanitari: **fuori dal sistema**.
- I consensi (informativa, 2A, 2B, 2C) sono campi sì/no; gli strumenti li rispettano (per esempio il controllo foto).
- Mai dati reali nel repository, nei test, nelle fixture o nei log. Solo dati finti.
- Nessun livello gratuito di API AI che possa usare i dati per l'addestramento.

## Modello dati (sintesi)

- `associati`: id interno (chiave), codice censimento (univoco, facoltativo), anagrafica, unità attuale, residenza (indirizzo, CAP, comune, provincia), contatti, privacy, stato (attivo/archiviato).
- `storico_unita`: associato, unità, anno scout.
- `tutori`: associato, relazione, anagrafica, CF, contatti, flag "riceve comunicazioni", collegamento facoltativo a un associato (capo che è anche genitore), archiviato.
- `relazioni`: due associati + tipo; l'inversa si crea in automatico.
- `anni_scout`: nome, data di inizio (data dei passaggi, variabile), attuale. Si crea con l'azione "Crea nuovo anno".
- `progressione`: voci dal catalogo di branca o voci libere (data, tipo, descrizione).
- `catalogo_progressione`: voci note per branca.
- `tag`: nome, tipo, stato (libero/ufficiale/archiviato), anno facoltativo, flag esclusivo, creato da. Qualsiasi capo crea e usa tag; il webmaster li rende ufficiali, li unisce o li archivia.
- `associati_tag`: associato, tag, anno scout, nota.
- `riunioni` e `presenze`: per ogni associato presente/assente/giustificato, motivazione facoltativa, registrabile anche prima della riunione.
- `utenti`: vedi sopra.
- `modifiche`: registro (autore, data, entità, campo, prima/dopo, canale MCP o PWA, stato Buona Strada, chi ha confermato).
- `accessi`: registro delle letture di dati sensibili.

## Convenzioni

- **Lingua:** UI, documentazione utente e ADR in italiano. Tabelle e colonne di dominio in italiano (`associati`, `unita`, `riunioni`), senza accenti. Codice tecnico (funzioni di infrastruttura, utility) in inglese.
- **Migrazioni:** lo schema esiste solo come migrazioni SQL numerate in `migrations/` (`wrangler d1 migrations`). Mai modifiche a mano sul database. Ogni migrazione deve funzionare sia con la versione corrente sia con la precedente (beta e produzione condividono lo stesso D1): prima si aggiunge, poi si toglie in una migrazione successiva.
- **Seed:** `seed/base/` con i dati standard AGESCI (branche, unità, cataloghi, tipi di tag); `seed/demo/` con dati finti per preview, test E2E e demo.
- **Configurazione:** dominio, nome del gruppo, unità attive e branding in configurazione e segreti Cloudflare. Nessun valore specifico del gruppo nel codice.
- **ADR:** `docs/adr/NNNN-titolo.md` (contesto, decisione, alternative, conseguenze, stato). Un ADR accettato non si modifica: se ne scrive uno nuovo che lo supera.
- **Commit:** firmati con DCO (`git commit -s`). Pull request piccole, una cosa per volta.

## Ambienti e rilascio

- **preview:** per ogni PR, D1 separato con seed demo, identità simulata da una modalità di test del Worker attiva solo qui, test E2E Playwright.
- **beta:** al merge su main, sottodominio protetto da Access aperto solo agli utenti `beta_tester`; usa il D1 di produzione.
- **produzione:** promozione manuale da GitHub dopo il via libera dei tester.
- **demo pubblica:** istanza separata con dati finti, scelta del ruolo senza login, ripristino notturno, nessuna uscita esterna.
- Deploy **solo** da GitHub Actions, mai da una macchina locale.

## Fase attuale

Fase 0 — Fondamenta. Ordine suggerito:
1. Struttura del repository, README, LICENSE (AGPL-3.0), CONTRIBUTING con DCO.
2. ADR 0001–0011 dalle decisioni del piano.
3. Prima migrazione dello schema + seed base + seed demo.
4. Worker con login Google, lettura della tabella `utenti`, registro modifiche e accessi.
5. Pipeline GitHub Actions (lint, test, build, preview, E2E).
6. MCP admin.
7. Import dal foglio esistente con mappatura delle colonne configurabile.
