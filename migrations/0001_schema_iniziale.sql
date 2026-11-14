-- PPU — schema iniziale.
--
-- Convenzioni:
--   * tabelle e colonne di dominio in italiano, senza accenti;
--   * date come TEXT ISO 8601 ('AAAA-MM-GG'), istanti come TEXT ISO 8601 UTC;
--     ogni colonna di sola data ha CHECK (col IS date(col)): rifiuta formati
--     diversi, orari e date inesistenti come '2026-02-30';
--   * booleani come INTEGER 0/1 con CHECK;
--   * nessuna cancellazione definitiva: le righe si archiviano;
--   * i permessi NON sono nel database: li applica il livello di servizi.
--
-- D1 applica sempre le chiavi esterne.

-- ---------------------------------------------------------------------------
-- Struttura del gruppo
-- ---------------------------------------------------------------------------

CREATE TABLE branche (
  id TEXT PRIMARY KEY,                       -- 'lc', 'eg', 'rs', 'coca'
  nome TEXT NOT NULL,
  ordine INTEGER NOT NULL DEFAULT 0
) STRICT;

-- Le unità sono configurabili per gruppo (attive, nome, unità miste).
CREATE TABLE unita (
  id TEXT PRIMARY KEY,                       -- slug: 'lupetti', 'esploratori', ...
  nome TEXT NOT NULL,
  branca_id TEXT NOT NULL REFERENCES branche (id),
  attiva INTEGER NOT NULL DEFAULT 1 CHECK (attiva IN (0, 1)),
  ordine INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE anni_scout (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,                 -- '2026/27'
  data_inizio TEXT NOT NULL UNIQUE CHECK (data_inizio IS date(data_inizio)), -- data dei passaggi
  attuale INTEGER NOT NULL DEFAULT 0 CHECK (attuale IN (0, 1)),
  creato_da TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Un solo anno attuale alla volta.
CREATE UNIQUE INDEX anni_scout_un_solo_attuale ON anni_scout (attuale) WHERE attuale = 1;

-- ---------------------------------------------------------------------------
-- Associati
-- ---------------------------------------------------------------------------

-- I campi anagrafici marcati "Buona Strada" sono elencati nel codice
-- (livello di servizi), non qui.
CREATE TABLE associati (
  id INTEGER PRIMARY KEY,
  codice_censimento TEXT UNIQUE,             -- facoltativo
  cognome TEXT NOT NULL,
  nome TEXT NOT NULL,
  data_nascita TEXT CHECK (data_nascita IS date(data_nascita)),
  luogo_nascita TEXT,
  codice_fiscale TEXT UNIQUE,                -- solo per Buona Strada, mai nelle viste normali
  unita_id TEXT REFERENCES unita (id),       -- unità attuale
  -- residenza
  indirizzo TEXT,
  cap TEXT,
  comune TEXT,
  provincia TEXT,
  -- contatti personali
  cellulare TEXT,
  email TEXT,
  -- comunicazioni del gruppo: a chi vanno (associato o tutori) lo decide il livello di servizi
  riceve_comunicazioni INTEGER NOT NULL DEFAULT 1 CHECK (riceve_comunicazioni IN (0, 1)),
  -- privacy
  informativa INTEGER NOT NULL DEFAULT 0 CHECK (informativa IN (0, 1)),
  informativa_data TEXT CHECK (informativa_data IS date(informativa_data)),
  consenso_2a INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2a IN (0, 1)),
  consenso_2b INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2b IN (0, 1)),
  consenso_2c INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2c IN (0, 1)),
  note_privacy TEXT,
  -- stato
  stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'archiviato')),
  archiviato_il TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((stato = 'archiviato') = (archiviato_il IS NOT NULL))
) STRICT;

CREATE INDEX associati_unita ON associati (unita_id, stato);
CREATE INDEX associati_nome ON associati (cognome COLLATE NOCASE, nome COLLATE NOCASE);

-- Un associato può stare in più unità nello stesso anno (per esempio un capo).
CREATE TABLE storico_unita (
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  unita_id TEXT NOT NULL REFERENCES unita (id),
  anno_scout_id INTEGER NOT NULL REFERENCES anni_scout (id),
  PRIMARY KEY (associato_id, anno_scout_id, unita_id)
) STRICT;

CREATE INDEX storico_unita_anno ON storico_unita (anno_scout_id, unita_id);

-- Genitori e tutori. Archiviati automaticamente quando l'associato compie 18 anni.
CREATE TABLE tutori (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  -- ruolo verso l'associato; i legami tra due associati stanno in `relazioni`
  ruolo TEXT NOT NULL CHECK (ruolo IN ('madre', 'padre', 'tutore', 'affidatario', 'altro')),
  cognome TEXT NOT NULL,
  nome TEXT NOT NULL,
  codice_fiscale TEXT,                       -- solo per Buona Strada
  cellulare TEXT,
  email TEXT,
  associato_collegato_id INTEGER REFERENCES associati (id),  -- tutore che è anche associato
  archiviato INTEGER NOT NULL DEFAULT 0 CHECK (archiviato IN (0, 1)),
  archiviato_il TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (associato_collegato_id IS NULL OR associato_collegato_id <> associato_id),
  CHECK ((archiviato = 1) = (archiviato_il IS NOT NULL))
) STRICT;

CREATE INDEX tutori_associato ON tutori (associato_id, archiviato);

-- Relazioni tra associati. L'inversa la crea il livello di servizi nella stessa
-- transazione (genitore <-> figlio, zio <-> nipote, le altre simmetriche).
CREATE TABLE relazioni (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  altro_associato_id INTEGER NOT NULL REFERENCES associati (id),
  tipo TEXT NOT NULL CHECK (
    tipo IN ('genitore', 'figlio', 'fratello', 'zio', 'nipote', 'cugino', 'coniuge', 'altro')
  ),
  archiviata INTEGER NOT NULL DEFAULT 0 CHECK (archiviata IN (0, 1)),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (associato_id <> altro_associato_id),
  UNIQUE (associato_id, altro_associato_id, tipo)
) STRICT;

-- ---------------------------------------------------------------------------
-- Progressione personale
-- ---------------------------------------------------------------------------

-- Versioni del Regolamento metodologico da cui viene il catalogo, identificate
-- dalla data di aggiornamento del documento. La più recente è quella in vigore.
CREATE TABLE versioni_regolamento (
  data TEXT PRIMARY KEY CHECK (data IS date(data)),
  nome TEXT NOT NULL,
  note TEXT
) STRICT;

-- Una nuova versione del regolamento aggiunge nuove righe: le voci precedenti
-- restano, così la progressione registrata punta alla voce in vigore allora.
CREATE TABLE catalogo_progressione (
  id INTEGER PRIMARY KEY,
  versione TEXT REFERENCES versioni_regolamento (data),  -- NULL: voce aggiunta dal gruppo
  branca_id TEXT NOT NULL REFERENCES branche (id),
  tipo TEXT NOT NULL,                        -- 'promessa', 'tappa', 'specialita', 'brevetto', ...
  nome TEXT NOT NULL,
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo INTEGER NOT NULL DEFAULT 1 CHECK (attivo IN (0, 1)),
  -- distintivo: collegamento all'immagine pubblicata da AGESCI (i file non stanno qui)
  immagine_url TEXT CHECK (immagine_url IS NULL OR immagine_url LIKE 'https://%'),
  UNIQUE (versione, branca_id, tipo, nome)
) STRICT;

-- Una voce viene dal catalogo oppure è libera (tipo + descrizione).
CREATE TABLE progressione (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  catalogo_id INTEGER REFERENCES catalogo_progressione (id),
  tipo TEXT,
  descrizione TEXT,
  data TEXT CHECK (data IS date(data)),
  anno_scout_id INTEGER REFERENCES anni_scout (id),
  archiviata INTEGER NOT NULL DEFAULT 0 CHECK (archiviata IN (0, 1)),
  creato_da TEXT NOT NULL,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (catalogo_id IS NOT NULL OR (tipo IS NOT NULL AND descrizione IS NOT NULL))
) STRICT;

CREATE INDEX progressione_associato ON progressione (associato_id, archiviata);

-- ---------------------------------------------------------------------------
-- Tag
-- ---------------------------------------------------------------------------

-- I tipi li crea solo il webmaster (MCP admin); dentro ogni tipo qualsiasi capo
-- crea i tag che vuole. 'varie' raccoglie le proposte non ancora categorizzate.
CREATE TABLE tipi_tag (
  id TEXT PRIMARY KEY,                       -- 'squadriglia', 'evento', ...
  nome TEXT NOT NULL,
  esclusivo_predefinito INTEGER NOT NULL DEFAULT 0 CHECK (esclusivo_predefinito IN (0, 1)),
  ordine INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE tag (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo_id TEXT NOT NULL DEFAULT 'varie' REFERENCES tipi_tag (id),
  stato TEXT NOT NULL DEFAULT 'libero' CHECK (stato IN ('libero', 'ufficiale', 'archiviato')),
  anno_scout_id INTEGER REFERENCES anni_scout (id),
  esclusivo INTEGER NOT NULL DEFAULT 0 CHECK (esclusivo IN (0, 1)),  -- una sola voce di quel tipo per persona e anno
  unito_in_id INTEGER REFERENCES tag (id),   -- valorizzato quando il webmaster unisce due tag
  creato_da TEXT NOT NULL,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (unito_in_id IS NULL OR unito_in_id <> id),
  CHECK (unito_in_id IS NULL OR stato = 'archiviato')
) STRICT;

CREATE UNIQUE INDEX tag_nome_univoco
  ON tag (lower(nome), tipo_id, coalesce(anno_scout_id, 0))
  WHERE stato <> 'archiviato';

-- Le assegnazioni non si cancellano: si chiudono con rimosso_il.
CREATE TABLE associati_tag (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  tag_id INTEGER NOT NULL REFERENCES tag (id),
  anno_scout_id INTEGER REFERENCES anni_scout (id),
  nota TEXT,
  creato_da TEXT NOT NULL,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  rimosso_da TEXT,
  rimosso_il TEXT,
  CHECK ((rimosso_il IS NULL) = (rimosso_da IS NULL))
) STRICT;

CREATE UNIQUE INDEX associati_tag_attivo
  ON associati_tag (associato_id, tag_id, coalesce(anno_scout_id, 0))
  WHERE rimosso_il IS NULL;
CREATE INDEX associati_tag_tag ON associati_tag (tag_id) WHERE rimosso_il IS NULL;

-- ---------------------------------------------------------------------------
-- Riunioni e presenze
-- ---------------------------------------------------------------------------

CREATE TABLE riunioni (
  id INTEGER PRIMARY KEY,
  unita_id TEXT NOT NULL REFERENCES unita (id),
  anno_scout_id INTEGER REFERENCES anni_scout (id),
  data TEXT NOT NULL CHECK (data IS date(data)),
  tipo TEXT NOT NULL DEFAULT 'riunione',     -- 'riunione', 'uscita', 'campo', ...
  note TEXT,
  archiviata INTEGER NOT NULL DEFAULT 0 CHECK (archiviata IN (0, 1)),
  creato_da TEXT NOT NULL,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE INDEX riunioni_unita_data ON riunioni (unita_id, data);

-- Registrabile anche prima della riunione (assenze comunicate in anticipo).
CREATE TABLE presenze (
  riunione_id INTEGER NOT NULL REFERENCES riunioni (id),
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  stato TEXT NOT NULL CHECK (stato IN ('presente', 'assente', 'giustificato')),
  motivazione TEXT,
  registrato_da TEXT NOT NULL,
  registrato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (riunione_id, associato_id)
) STRICT;

-- ---------------------------------------------------------------------------
-- Utenti (capi) e ruoli. Scritta solo dall'MCP admin.
-- ---------------------------------------------------------------------------

-- Un account del dominio senza riga qui è un capo in sola lettura.
CREATE TABLE utenti (
  email TEXT PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%_@_%'),
  associato_id INTEGER UNIQUE REFERENCES associati (id),  -- scheda del capo, per "i propri dati"
  accesso_completo INTEGER NOT NULL DEFAULT 0 CHECK (accesso_completo IN (0, 1)),
  buona_strada INTEGER NOT NULL DEFAULT 0 CHECK (buona_strada IN (0, 1)),
  webmaster INTEGER NOT NULL DEFAULT 0 CHECK (webmaster IN (0, 1)),
  beta_tester INTEGER NOT NULL DEFAULT 0 CHECK (beta_tester IN (0, 1)),
  escluso INTEGER NOT NULL DEFAULT 0 CHECK (escluso IN (0, 1)),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Unità in cui il capo può modificare (una o più).
CREATE TABLE utenti_unita (
  email TEXT NOT NULL REFERENCES utenti (email),
  unita_id TEXT NOT NULL REFERENCES unita (id),
  PRIMARY KEY (email, unita_id)
) STRICT;

-- ---------------------------------------------------------------------------
-- Registri
-- ---------------------------------------------------------------------------

-- Ogni modifica confermata, una riga per campo. Le righe non si modificano
-- tranne che per la conferma Buona Strada.
CREATE TABLE modifiche (
  id INTEGER PRIMARY KEY,
  operazione TEXT NOT NULL,                  -- identificativo comune alle righe di una stessa conferma
  autore_email TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin', 'import', 'sistema')),
  entita TEXT NOT NULL,                      -- 'associati', 'tutori', 'presenze', ...
  entita_id TEXT NOT NULL,
  campo TEXT,                                -- NULL per creazione o archiviazione dell'intera riga
  valore_prima TEXT,                         -- JSON
  valore_dopo TEXT,                          -- JSON
  stato_buona_strada TEXT CHECK (stato_buona_strada IN ('da_riportare', 'riportata')),
  confermata_da TEXT,
  confermata_il TEXT,
  CHECK ((stato_buona_strada = 'riportata') = (confermata_da IS NOT NULL)),
  CHECK ((confermata_da IS NULL) = (confermata_il IS NULL)),
  -- chi conferma su Buona Strada non può essere l'autore, nemmeno con accesso completo
  CHECK (confermata_da IS NULL OR confermata_da <> autore_email)
) STRICT;

CREATE INDEX modifiche_entita ON modifiche (entita, entita_id, data);
CREATE INDEX modifiche_operazione ON modifiche (operazione);
CREATE INDEX modifiche_da_riportare ON modifiche (data) WHERE stato_buona_strada = 'da_riportare';

-- Il registro si scrive solo in aggiunta. L'unico aggiornamento ammesso è la
-- conferma Buona Strada: da 'da_riportare' a 'riportata', con chi e quando,
-- senza toccare le altre colonne.
CREATE TRIGGER modifiche_no_cancellazione BEFORE DELETE ON modifiche
BEGIN
  SELECT RAISE(ABORT, 'il registro modifiche non si cancella');
END;

CREATE TRIGGER modifiche_solo_conferma BEFORE UPDATE ON modifiche
WHEN OLD.stato_buona_strada IS NOT 'da_riportare'
  OR NEW.stato_buona_strada IS NOT 'riportata'
  OR NEW.id IS NOT OLD.id
  OR NEW.operazione IS NOT OLD.operazione
  OR NEW.autore_email IS NOT OLD.autore_email
  OR NEW.data IS NOT OLD.data
  OR NEW.canale IS NOT OLD.canale
  OR NEW.entita IS NOT OLD.entita
  OR NEW.entita_id IS NOT OLD.entita_id
  OR NEW.campo IS NOT OLD.campo
  OR NEW.valore_prima IS NOT OLD.valore_prima
  OR NEW.valore_dopo IS NOT OLD.valore_dopo
BEGIN
  SELECT RAISE(ABORT, 'il registro modifiche ammette solo la conferma Buona Strada');
END;

-- Letture di dati sensibili (codici fiscali, campi solo Buona Strada, esportazioni).
CREATE TABLE accessi (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin', 'sistema')),
  entita TEXT NOT NULL,
  entita_id TEXT,
  campi TEXT,                                -- JSON: elenco dei campi letti
  motivo TEXT
) STRICT;

CREATE INDEX accessi_email_data ON accessi (email, data);
CREATE INDEX accessi_entita ON accessi (entita, entita_id);

-- Anche il registro degli accessi si scrive solo in aggiunta.
CREATE TRIGGER accessi_no_cancellazione BEFORE DELETE ON accessi
BEGIN
  SELECT RAISE(ABORT, 'il registro accessi non si cancella');
END;

CREATE TRIGGER accessi_no_modifica BEFORE UPDATE ON accessi
BEGIN
  SELECT RAISE(ABORT, 'il registro accessi non si modifica');
END;
