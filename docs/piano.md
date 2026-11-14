# PPU — piano di progetto

Nov 12, 2026 · @Andrea Righi

## Obiettivo e principi

PPU (Progressione Personale Unitaria) è il gestionale degli associati del gruppo, usato dai capi tramite una PWA e i propri assistenti AI, con permessi per unità e login Google Workspace.

- **Due modi di lavorare, stesse regole:** dalla PWA (consultazione, modifica, presentazione) o parlando con il proprio assistente AI (server MCP).
- **Login Google, infrastruttura Cloudflare:** login con l'account Workspace, ruoli e dati su Cloudflare, dove il dominio è già gestito. Nessun profilo nuovo.
- **Sicurezza sul server, non nel modello:** permessi, conferme e registro sono applicati dal backend.
- **Dati pubblici il giusto:** risposte minime di default, dati sensibili solo su richiesta e registrati.
- **Costo zero in pratica:** piani gratuiti Cloudflare, senza carta di credito.
- **Buona Strada resta la fonte ufficiale dell'anagrafica:** non ha API, quindi l'allineamento è manuale e tracciato.
- **Open source e replicabile:** ogni gruppo installa la propria istanza con la stessa infrastruttura; schema, migrazioni e dati di base fanno parte del progetto.

## Utenti e ruoli

Workspace serve solo per l'identità: creazione degli account e login. Chi ha un account @agescipesaro1.it è un capo e può leggere; unità e ruoli stanno nella tabella `utenti` del database, gestita dal webmaster.

| Ruolo | Dove si definisce | Può |
| --- | --- | --- |
| Tutti i capi | Account @agescipesaro1.it | Leggere tutto, dati delicati compresi; usare PWA e assistente AI |
| Capo di unità | `utenti/{email}` → unità | Modificare anagrafica, presenze e progressione della propria unità |
| Accesso completo | `utenti/{email}` → accesso completo | Modificare su tutte le unità |
| Referente Buona Strada | `utenti/{email}` → Buona Strada | Confermare dalla PWA che una modifica è stata riportata su Buona Strada |
| Webmaster | `utenti/{email}` → webmaster | Gestire unità, ruoli e tag ufficiali tramite l'MCP admin |

- **Unità:** Lupetti, Coccinelle, Esploratori, Guide, Clan (rover e scolte), Noviziato, Co.Ca.
- **Ruoli nel database:** si gestiscono dall'MCP admin, in futuro anche da una dashboard. Nessun gruppo né attributo su Workspace.
- Un account @agescipesaro1.it senza scheda in `utenti` è un capo in sola lettura.
- Account rimosso o sospeso su Workspace = login impossibile, quindi accesso revocato anche se la scheda resta nel database.
- Ogni unità può avere più capi, tutti con gli stessi permessi e lo stesso flusso di conferma; un capo può seguire più unità. Un capo assegnato ai Lupetti non modifica le Coccinelle.
- I dati di un capo li modifica il capo stesso o chi ha accesso completo.
- Ragazzi e genitori non accedono al sistema; in futuro riceveranno solo messaggi.
- Un account del dominio che non è un capo (per esempio una segreteria) si esclude con un flag nella sua scheda `utenti`.

## Architettura e stack

Un unico Worker Cloudflare serve assistenti AI e PWA con le stesse regole; D1 contiene i dati, Google Workspace fornisce solo identità e login.

_[Diagramma: architettura · client, backend, servizi Google — da aggiungere]_

Il Worker ricava l'identità dal login Google e legge unità e ruoli dalla tabella `utenti`; solo l'MCP admin la scrive.

- **Backend:** TypeScript su Cloudflare Workers, con due ingressi sullo stesso livello di servizi: endpoint MCP per gli assistenti AI e API REST per la PWA.
- **Server MCP:** remoto, dal modello Cloudflare con OAuth Google (`workers-oauth-provider`), limitato al dominio @agescipesaro1.it.
- **Dati:** D1 (SQLite) con giurisdizione UE, da impostare alla creazione; raggiungibile solo dal Worker, mai dai client.
- **Permessi:** tabella `utenti` in D1. Nessun Admin SDK né privilegio sul dominio Workspace.
- **PWA:** Svelte + Vite + plugin PWA su Cloudflare Pages, protetta da Cloudflare Access con Google Workspace come provider e regola sul dominio. Il Worker verifica il token di Access sulle chiamate della PWA.
- **Notifiche:** webhook in ingresso di Google Chat.
- **Assistenti supportati:** Claude (connettore personalizzato, anche sul piano gratuito) e altri client MCP. L'app Gemini oggi non accetta connettori personalizzati sugli account Workspace.
- **Costi:** piani gratuiti di Workers, Pages, D1 e Access, senza carta di credito. Access è gratuito fino a 50 utenti: oggi i capi sono 21.
- **Google Cloud Console:** serve solo per il client OAuth del login Google.

## Modello dati

Database D1 (SQLite) con giurisdizione UE: ogni voce sotto è una tabella, i percorsi indicano la struttura logica. Ogni campo anagrafico ha un'etichetta "Buona Strada": tutti i campi del foglio attuale tranne le note.

| Collezione | Contenuto |
| --- | --- |
| `associati/{id}` | ID interno (chiave); codice censimento univoco ma facoltativo; cognome, nome, data e luogo di nascita; unità attuale e storico unità per anno scout; residenza (indirizzo, CAP, comune, provincia); contatti personali (cellulare, telefono casa, email); privacy (informativa con data, consensi 2A, 2B, 2C, note privacy); stato (attivo o archiviato) |
| `associati/{id}` → genitori/tutori | Lista: relazione, anagrafica, CF, cellulare, email, flag "riceve comunicazioni", collegamento facoltativo al profilo se il tutore è anche associato. Archiviati automaticamente ai 18 anni |
| `associati/{id}/progressione/{voce}` | Voci dal catalogo di branca (prede, specialità, voli, tappe, brevetti…) o voci libere (data, tipo, descrizione). Le vecchie note generali diventano voci libere |
| `relazioni/{id}` | Due associati + tipo (genitore/figlio, fratello/sorella, zio/nipote, cugino, coniuge, altro), con l'inversa creata in automatico. Vale anche per i capi |
| `catalogo/{branca}` | Voci note di progressione per branca, gestite da chi ha accesso completo |
| `riunioni/{id}` | Unità, data, tipo; per ogni associato presente, assente o giustificato, con motivazione facoltativa (anche comunicata prima della riunione) |
| `modifiche/{id}` | Registro: autore, data, campo, prima/dopo, assistente usato, stato Buona Strada, chi ha confermato |
| `accessi/{id}` | Registro delle letture di dati sensibili |

- **`utenti/{email}`:** unità (una o più), accesso completo, Buona Strada, webmaster, esclusione; gestita dal webmaster tramite MCP admin.
- **`anni_scout`:** nome (per esempio 2026/27), data di inizio, anno attuale. L'anno cambia alla data dei passaggi, che varia ogni anno: chi ha accesso completo preme "Crea nuovo anno" e da lì partono i passaggi.
- **`tag/{id}`:** nome, tipo, stato (libero, ufficiale, archiviato), anno scout facoltativo, flag "esclusivo" (una sola voce di quel tipo per persona e anno, per esempio la squadriglia), creato da. Qualsiasi capo li crea e li usa su tutti gli associati; il webmaster vede tutti i tag con il loro utilizzo e decide quali rendere ufficiali, quali unire e quali archiviare.
- **`associati_tag`:** associato, tag, anno scout, nota facoltativa, chi e quando. Salvati subito con registro, fuori dal flusso Buona Strada.
- **Fuori dal sistema:** dati sanitari, che restano offline.
- **Codici fiscali:** usati solo per Buona Strada, non mostrati nelle viste normali.

## Flusso delle modifiche

Ogni modifica viene confermata da chi la fa. Quelle anagrafiche richiedono anche una seconda conferma, di una persona diversa, sull'allineamento con Buona Strada.

**Anagrafica**

1. Il capo modifica dalla PWA o chiede la modifica al suo assistente AI.
2. Il server verifica identità e permessi e restituisce un'anteprima prima/dopo.
3. Il capo conferma: il nuovo valore diventa subito operativo e la modifica entra nel registro come "da riportare su Buona Strada".
4. I referenti Buona Strada vengono avvisati (webhook in uno spazio Google Chat) e vedono la coda nella PWA.
5. Un referente, diverso dall'autore, riporta la modifica su Buona Strada e conferma dalla PWA.

**Presenze e progressione:** passi 1–3, poi il salvataggio è definitivo, con registro.

**Presenze, esempio:** "Riunione E/G di oggi: c'erano tutti tranne Marco e Giulia". L'agente risolve i nomi sulla propria unità, chiede quale persona in caso di omonimi, mostra il riepilogo e salva dopo la conferma.

**Regole fisse**

- Nessuna cancellazione definitiva: al massimo l'archiviazione.
- Le operazioni di massa richiedono una conferma esplicita.
- Chi conferma su Buona Strada non può essere l'autore, nemmeno con accesso completo.

## Privacy e sicurezza

I dati sono in gran parte di minori: escono dal sistema solo quando servono, solo verso chi ne ha diritto, e ogni passaggio viene registrato.

- **Un solo punto di accesso:** il database è raggiungibile solo dal Worker; PWA, assistenti AI e Chat passano dallo stesso backend.
- **Risposte minime:** di default nome, unità ed essenziale. I contatti sono visibili nella scheda; codici fiscali e campi solo Buona Strada no.
- **Login:** solo account del dominio Workspace, sessioni brevi. Chi viene sospeso o rimosso dal dominio perde l'accesso subito.
- **Assistenti AI:** ogni risposta passa dai server dell'assistente. Ogni capo disattiva l'uso delle chat per l'addestramento; va scritto nell'informativa.
- **Niente livelli gratuiti delle API AI** con dati degli associati, quando si aggiungeranno chat integrate o un agente in Chat.
- **Consensi applicati dagli strumenti:** per esempio il controllo di chi non può comparire nelle foto pubblicate.
- **Conservazione:** dati dei genitori archiviati ai 18 anni, ex associati archiviati. Il periodo di conservazione va deciso con la Co.Ca.
- **GDPR:** titolare è il gruppo o l'associazione; consigliata una valutazione d'impatto (DPIA) semplice prima dell'avvio.

## Sviluppo e rilascio

PPU si sviluppa e si rilascia dal cloud: nessun deploy da un computer personale, e ogni versione passa da test automatici e da un gruppo di tester prima di arrivare a tutti i capi.

_[Diagramma: pipeline · dalla pull request alla produzione — da aggiungere]_

- **Sviluppo in cloud:** repository GitHub, ambiente di sviluppo in GitHub Codespaces (devcontainer con Node, wrangler e Playwright), deploy solo da GitHub Actions.
- **Ambienti:** preview, beta e produzione. La preview ha un D1 separato con dati finti, mai dati reali.
- **Pipeline sulle pull request:** lint, test unitari, build, deploy di preview di Worker e PWA, migrazioni sul D1 di test, test E2E Playwright sui flussi principali (login, ricerca, modifica con conferma, coda Buona Strada, permessi per unità).
- **Login nei test:** in preview l'identità è simulata da una modalità di test del Worker, attiva solo in quell'ambiente, con un utente finto per ogni ruolo.
- **Pre-rilascio:** al merge su main la nuova versione va su beta, un sottodominio protetto da Access con una regola che ammette solo i tester; l'elenco lo gestisce il webmaster.
- **Migrazioni:** beta e produzione condividono lo stesso D1, quindi ogni migrazione deve funzionare con entrambe le versioni (prima si aggiunge, poi si toglie).
- **Produzione:** promozione manuale da GitHub dopo il via libera dei tester; rollback alla versione precedente con un comando.
- **Costi:** GitHub Actions e Codespaces hanno quote gratuite mensili, da verificare sul piano dell'account GitHub usato.

**Decisioni (ADR)**

Ogni scelta architetturale si registra come ADR in `docs/adr/NNNN-titolo.md` nel repository: contesto, decisione, alternative scartate, conseguenze, stato (proposta, accettata, superata da…). Un ADR non si modifica: se la scelta cambia se ne scrive uno nuovo che lo supera. Da scrivere subito, per le decisioni già prese:

1. Cloudflare (Workers, Pages, D1) al posto di Firebase
2. D1 relazionale con giurisdizione UE
3. Workspace solo per identità, ruoli nel database
4. Un solo backend con endpoint MCP e API REST
5. PWA in Svelte, non Next.js né AppSheet
6. Beta e produzione sullo stesso database, migrazioni retrocompatibili
7. Un'installazione separata per ogni gruppo
8. Buona Strada fonte ufficiale, allineamento manuale tracciato nel registro

Regole di dominio (chi conferma l'allineamento con Buona Strada, tag), strumenti di sviluppo e licenza non sono scelte architetturali: stanno in questo piano, in `CONTRIBUTING.md` e in `LICENSE`.

**Open source e replicabilità**

Un altro gruppo deve poter partire da zero con un repository, un account Cloudflare e un dominio Google Workspace.

- **Un'installazione per gruppo:** stesso codice, Worker, D1 e Access separati. Nessun dato condiviso tra gruppi: ogni gruppo è titolare dei propri dati.
- **Migrazioni come fonte di verità:** lo schema esiste solo come migrazioni SQL numerate (`wrangler d1 migrations`), applicate in ordine dalla pipeline; mai modifiche a mano sul database.
- **Dati di base (seed):** branche e unità standard AGESCI, cataloghi di progressione per branca, tipi di tag comuni. Ogni gruppo li adatta dopo l'installazione.
- **Dati finti (seed di test):** associati, famiglie e riunioni inventati, usati da preview, test E2E e demo. Mai dati reali nel repository.
- **Configurazione, non codice:** dominio, nome del gruppo, unità attive, colori e logo stanno in un file di configurazione e nei segreti di Cloudflare. Niente @agescipesaro1.it scritto nel codice.
- **Import generico:** l'import dal foglio usa una mappatura delle colonne configurabile, partendo dal formato del nostro foglio.
- **Aggiornamenti:** rilasci con versione e changelog; un gruppo aggiorna con il codice nuovo e la pipeline applica le migrazioni mancanti.
- **Documentazione:** README, guida di installazione passo passo, ADR pubblici, guida per chi contribuisce.

**Demo pubblica**

Una istanza aperta a tutti, per far provare PPU ad altri gruppi senza installarlo.

- **Separata da tutto:** Worker, Pages e D1 propri, nessun segreto di produzione, solo il seed di dati finti.
- **Accesso senza account:** al posto del login Google, una schermata per scegliere un ruolo (capo di unità, accesso completo, referente Buona Strada) e provare cosa può fare.
- **Modifiche permesse ma temporanee:** un Cron Trigger ripristina i dati finti ogni notte.
- **Niente uscite verso l'esterno:** webhook, mail e messaggi disattivati; l'eventuale chat AI con limiti stretti.
- **Aggiornata dalla pipeline:** ogni rilascio in produzione aggiorna anche la demo.

**Documentazione per gli utenti**

Guide non tecniche, scritte per i capi, separate dalla documentazione per sviluppatori.

- **Dove:** un piccolo sito di guide su Cloudflare Pages, collegato dalla sezione "Aiuto" della PWA.
- **Tutorial per ruolo:** primo accesso e installazione della PWA, cercare e consultare un associato, modificare e confermare, coda Buona Strada per i referenti, presenze e assenze, progressione e tag, modalità presentazione, collegare il proprio assistente AI.
- **Schermate sempre aggiornate:** gli screenshot si generano con Playwright sulla demo, nella stessa pipeline dei test E2E.
- **Guida per il webmaster:** gestione di utenti, ruoli e tag dall'MCP admin.
- **Guida di installazione** per altri gruppi, scritta per chi non è sviluppatore.

## Roadmap

Le fasi 0 e 1 sono il primo rilascio utilizzabile: i capi gestiscono l'anagrafica dal proprio assistente AI. Ogni fase successiva aggiunge strumenti sullo stesso backend, e i tutorial per gli utenti si aggiornano a ogni fase.

_[Diagramma: roadmap · 7 fasi in sequenza — da aggiungere]_

**Fase 0 · Fondamenta**

- [ ] Organizzazione GitHub del gruppo con repository pubblico (commit dai profili personali), account Cloudflare condiviso del gruppo, sviluppo in Codespaces, deploy solo dalla pipeline
- [ ] Cartella ADR con le decisioni già prese, file LICENSE AGPL-3.0, CONTRIBUTING con firma DCO nei commit
- [ ] Cloudflare: Worker, Pages, D1 con giurisdizione UE, Access sul dominio; client OAuth Google nella Cloud Console
- [ ] Ambienti preview, beta e produzione; pipeline con test E2E Playwright e promozione manuale
- [ ] Migrazioni D1 versionate, seed dei dati di base AGESCI e seed di dati finti per i test
- [ ] Configurazione per gruppo (dominio, nome, unità, branding), nessun valore fisso nel codice
- [ ] Tabella utenti (unità, accesso completo, Buona Strada, webmaster, tester beta)
- [ ] Login Google limitato al dominio configurato
- [ ] Import iniziale dal foglio attuale, con mappatura delle colonne e genitori in lista
- [ ] Registro modifiche e accessi
- [ ] MCP admin per il webmaster

**Fase 1 · Anagrafica tramite assistente AI**

- [ ] Server MCP remoto sul Worker con OAuth Google
- [ ] Strumenti di ricerca e lettura con risposte minime
- [ ] Modifiche con anteprima e conferma, permessi per unità
- [ ] Relazioni familiari con inversa automatica
- [ ] Coda "da riportare su Buona Strada" e webhook nello spazio Chat dei referenti
- [ ] Archiviazione automatica dei genitori ai 18 anni

**Fase 2 · PWA in Svelte**

- [ ] Svelte + Vite + PWA su Cloudflare Pages dietro Access, stesso backend
- [ ] Ricerca e filtri (anche per tag), scheda persona, modifica con anteprima e conferma
- [ ] Coda dei referenti con conferma (autore escluso)
- [ ] Modalità presentazione a schermo intero
- [ ] Demo pubblica con dati finti, scelta del ruolo e ripristino notturno
- [ ] Sito di guide per gli utenti, con i primi tutorial e screenshot generati da Playwright
- [ ] Esplorazione di Workers AI: chat interna alla PWA sugli strumenti esistenti, qualità in italiano, limiti del piano gratuito

**Fase 3 · Presenze**

- [ ] Riunioni per unità e strumento di registrazione presenze
- [ ] Assenze registrate man mano che vengono comunicate, con motivazione
- [ ] Promemoria ai capi dell'unità se dopo una riunione le presenze non sono state inserite (Cron Trigger del Worker)
- [ ] Presenze nella scheda e nella presentazione

**Fase 4 · Progressione personale e tag**

- [ ] Catalogo per branca e voci libere
- [ ] Migrazione delle note generali in voci libere
- [ ] Tag liberi creati da tutti i capi (squadriglie e sestiglie, CdA, eventi, esperienze) e revisione del webmaster dall'MCP admin

**Fase 5 · Comunicazioni**

- [ ] Strumento di controllo consensi per le foto
- [ ] Messaggi ai genitori: bozza, anteprima, invio dopo conferma

**Fase 6 · Evoluzioni**

- [ ] Import dell'esportazione Buona Strada con confronto delle differenze
- [ ] Passaggi di fine anno
- [ ] Chat interna alla PWA come modo principale di usare l'AI (Workers AI, se l'esplorazione della fase 2 va bene) e comandi in Google Chat
- [ ] Pubblicazione del calendario delle attività (Google Calendar o feed ICS per unità)
- [ ] Creazione automatica dei contatti dei genitori nella rubrica dei capi (Google People API)
- [ ] Pulsante "Scrivi su WhatsApp" nella scheda: apre la chat con il genitore tramite link wa.me, senza API e senza costi
- [ ] Kit per altri gruppi: guida di installazione e script di setup (D1 in UE, Access, client OAuth)

## Punti aperti

- [ ] Significato esatto dei consensi 2A, 2B, 2C e quali azioni devono bloccare.
- [ ] Procedura dei passaggi dopo "Crea nuovo anno": chi sposta i ragazzi e come (lo storico resta comunque visibile al nuovo capo).
- [ ] Elenco dei referenti Buona Strada da assegnare.
- [ ] Periodo di conservazione dei dati archiviati.
- [ ] Quali campi mostrare nella scheda e nella modalità presentazione, da decidere costruendo.
- [ ] Chiedere all'helpdesk AGESCI se esistono API o esportazioni più complete di Buona Strada.
- [ ] Indirizzo da cui partiranno le mail ai genitori.
- [ ] Licenza della documentazione per gli utenti (il codice è AGPL-3.0, per ora).
- [ ] Notifiche: restare su Google Chat o aggiungere notifiche push nella PWA.
