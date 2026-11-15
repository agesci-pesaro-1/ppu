-- PPU — initial schema.
--
-- Conventions:
--   * domain tables and columns in Italian, without accents;
--   * dates as ISO 8601 TEXT ('YYYY-MM-DD'), instants as ISO 8601 UTC TEXT;
--     every date-only column has CHECK (col IS date(col)): it rejects other
--     formats, times and non-existent dates such as '2026-02-30';
--   * booleans as INTEGER 0/1 with CHECK;
--   * no hard deletes: rows are archived;
--   * permissions are NOT in the database: the service layer enforces them.
--
-- D1 always enforces foreign keys.

-- ---------------------------------------------------------------------------
-- Group structure
-- ---------------------------------------------------------------------------

CREATE TABLE branche (
  id TEXT PRIMARY KEY,                       -- 'lc', 'eg', 'rs', 'coca'
  nome TEXT NOT NULL,
  ordine INTEGER NOT NULL DEFAULT 0
) STRICT;

-- Units come from the group configuration (active, name, mixed units).
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
  data_inizio TEXT NOT NULL UNIQUE CHECK (data_inizio IS date(data_inizio)), -- date of the yearly unit transitions (passaggi)
  attuale INTEGER NOT NULL DEFAULT 0 CHECK (attuale IN (0, 1)),
  creato_da TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Only one current year at a time.
CREATE UNIQUE INDEX anni_scout_un_solo_attuale ON anni_scout (attuale) WHERE attuale = 1;

-- ---------------------------------------------------------------------------
-- Members (associati)
-- ---------------------------------------------------------------------------

-- Personal data fields marked "Buona Strada" are listed in the code
-- (service layer), not here.
CREATE TABLE associati (
  id INTEGER PRIMARY KEY,
  codice_censimento TEXT UNIQUE,             -- optional
  cognome TEXT NOT NULL,
  nome TEXT NOT NULL,
  data_nascita TEXT CHECK (data_nascita IS date(data_nascita)),
  luogo_nascita TEXT,
  codice_fiscale TEXT UNIQUE,                -- Buona Strada only, never in normal views
  unita_id TEXT REFERENCES unita (id),       -- current unit
  -- residence
  indirizzo TEXT,
  cap TEXT,
  comune TEXT,
  provincia TEXT,
  -- personal contacts
  cellulare TEXT,
  email TEXT,
  -- group communications: the service layer decides who gets them (member or guardians)
  riceve_comunicazioni INTEGER NOT NULL DEFAULT 1 CHECK (riceve_comunicazioni IN (0, 1)),
  -- privacy
  informativa INTEGER NOT NULL DEFAULT 0 CHECK (informativa IN (0, 1)),
  informativa_data TEXT CHECK (informativa_data IS date(informativa_data)),
  consenso_2a INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2a IN (0, 1)),
  consenso_2b INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2b IN (0, 1)),
  consenso_2c INTEGER NOT NULL DEFAULT 0 CHECK (consenso_2c IN (0, 1)),
  note_privacy TEXT,
  -- status
  stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'archiviato')),
  archiviato_il TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((stato = 'archiviato') = (archiviato_il IS NOT NULL))
) STRICT;

CREATE INDEX associati_unita ON associati (unita_id, stato);
CREATE INDEX associati_nome ON associati (cognome COLLATE NOCASE, nome COLLATE NOCASE);

-- A member can be in more than one unit in the same year (e.g. a leader).
CREATE TABLE storico_unita (
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  unita_id TEXT NOT NULL REFERENCES unita (id),
  anno_scout_id INTEGER NOT NULL REFERENCES anni_scout (id),
  PRIMARY KEY (associato_id, anno_scout_id, unita_id)
) STRICT;

CREATE INDEX storico_unita_anno ON storico_unita (anno_scout_id, unita_id);

-- Parents and guardians. Archived automatically when the member turns 18.
CREATE TABLE tutori (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  -- role towards the member; links between two members are in `relazioni`
  ruolo TEXT NOT NULL CHECK (ruolo IN ('madre', 'padre', 'tutore', 'affidatario', 'altro')),
  cognome TEXT NOT NULL,
  nome TEXT NOT NULL,
  codice_fiscale TEXT,                       -- Buona Strada only
  cellulare TEXT,
  email TEXT,
  associato_collegato_id INTEGER REFERENCES associati (id),  -- guardian who is also a member
  archiviato INTEGER NOT NULL DEFAULT 0 CHECK (archiviato IN (0, 1)),
  archiviato_il TEXT,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (associato_collegato_id IS NULL OR associato_collegato_id <> associato_id),
  CHECK ((archiviato = 1) = (archiviato_il IS NOT NULL))
) STRICT;

CREATE INDEX tutori_associato ON tutori (associato_id, archiviato);

-- Relationships between members. The service layer creates the inverse in the
-- same transaction (genitore <-> figlio, zio <-> nipote, the others symmetric).
CREATE TABLE relazioni (
  id INTEGER PRIMARY KEY,
  associato_id INTEGER NOT NULL REFERENCES associati (id),
  altro_associato_id INTEGER NOT NULL REFERENCES associati (id),
  tipo TEXT NOT NULL CHECK (
    tipo IN ('genitore', 'figlio', 'fratello', 'zio', 'nipote', 'cugino', 'altro')
  ),
  archiviata INTEGER NOT NULL DEFAULT 0 CHECK (archiviata IN (0, 1)),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (associato_id <> altro_associato_id),
  UNIQUE (associato_id, altro_associato_id, tipo)
) STRICT;

-- ---------------------------------------------------------------------------
-- Personal progression
-- ---------------------------------------------------------------------------

-- Versions of the Regolamento metodologico the catalogue comes from, keyed by
-- the document's update date. The most recent one is in force.
CREATE TABLE versioni_regolamento (
  data TEXT PRIMARY KEY CHECK (data IS date(data)),
  nome TEXT NOT NULL,
  note TEXT
) STRICT;

-- A new Regolamento version adds new rows: earlier entries stay, so recorded
-- progression keeps pointing to the entry in force at the time.
CREATE TABLE catalogo_progressione (
  id INTEGER PRIMARY KEY,
  versione TEXT REFERENCES versioni_regolamento (data),  -- NULL: entry added by the group
  branca_id TEXT NOT NULL REFERENCES branche (id),
  -- 'tappa' (every milestone of the journey, see seed/base/0001_catalogo_progressione.sql),
  -- 'specialita', 'brevetto', 'evento'
  tipo TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordine INTEGER NOT NULL DEFAULT 0,
  attivo INTEGER NOT NULL DEFAULT 1 CHECK (attivo IN (0, 1)),
  -- badge: source the Worker downloads the image from (ADR 0009); no files here
  immagine_url TEXT CHECK (immagine_url IS NULL OR immagine_url LIKE 'https://%'),
  UNIQUE (versione, branca_id, tipo, nome)
) STRICT;

-- An entry comes from the catalogue or is free text (type + description).
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

-- Types come from the group configuration, decided by the webmaster; within each
-- type any leader creates the tags they want. 'varie' collects uncategorised proposals.
CREATE TABLE tipi_tag (
  id TEXT PRIMARY KEY,                       -- 'squadriglia', 'sestiglia', 'varie', ...
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
  esclusivo INTEGER NOT NULL DEFAULT 0 CHECK (esclusivo IN (0, 1)),  -- at most one tag of that type per person and year
  unito_in_id INTEGER REFERENCES tag (id),   -- set when the webmaster merges two tags
  creato_da TEXT NOT NULL,
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (unito_in_id IS NULL OR unito_in_id <> id),
  CHECK (unito_in_id IS NULL OR stato = 'archiviato')
) STRICT;

CREATE UNIQUE INDEX tag_nome_univoco
  ON tag (lower(nome), tipo_id, coalesce(anno_scout_id, 0))
  WHERE stato <> 'archiviato';

-- Assignments are never deleted: they are closed with rimosso_il.
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
-- Meetings and attendance
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

-- Can be recorded before the meeting too (absences reported in advance).
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
-- Users (leaders) and roles. Written only by the MCP admin.
-- ---------------------------------------------------------------------------

-- A domain account without a row here is a read-only leader.
CREATE TABLE utenti (
  email TEXT PRIMARY KEY CHECK (email = lower(email) AND email LIKE '%_@_%'),
  associato_id INTEGER UNIQUE REFERENCES associati (id),  -- the leader's member record, for "own data"
  accesso_completo INTEGER NOT NULL DEFAULT 0 CHECK (accesso_completo IN (0, 1)),
  buona_strada INTEGER NOT NULL DEFAULT 0 CHECK (buona_strada IN (0, 1)),
  webmaster INTEGER NOT NULL DEFAULT 0 CHECK (webmaster IN (0, 1)),
  beta_tester INTEGER NOT NULL DEFAULT 0 CHECK (beta_tester IN (0, 1)),
  escluso INTEGER NOT NULL DEFAULT 0 CHECK (escluso IN (0, 1)),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  aggiornato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

-- Units where the leader can edit (one or more).
CREATE TABLE utenti_unita (
  email TEXT NOT NULL REFERENCES utenti (email),
  unita_id TEXT NOT NULL REFERENCES unita (id),
  PRIMARY KEY (email, unita_id)
) STRICT;

-- ---------------------------------------------------------------------------
-- Logs
-- ---------------------------------------------------------------------------

-- Every confirmed change, one row per field. Rows are never modified
-- except for the Buona Strada confirmation.
CREATE TABLE modifiche (
  id INTEGER PRIMARY KEY,
  operazione TEXT NOT NULL,                  -- id shared by the rows of the same confirmation
  autore_email TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin', 'import', 'sistema')),
  entita TEXT NOT NULL,                      -- 'associati', 'tutori', 'presenze', ...
  entita_id TEXT NOT NULL,
  campo TEXT,                                -- NULL when the whole row is created or archived
  valore_prima TEXT,                         -- JSON
  valore_dopo TEXT,                          -- JSON
  stato_buona_strada TEXT CHECK (stato_buona_strada IN ('da_riportare', 'riportata')),
  confermata_da TEXT,
  confermata_il TEXT,
  CHECK ((stato_buona_strada = 'riportata') = (confermata_da IS NOT NULL)),
  CHECK ((confermata_da IS NULL) = (confermata_il IS NULL)),
  -- whoever confirms on Buona Strada cannot be the author, not even with full access
  CHECK (confermata_da IS NULL OR confermata_da <> autore_email)
) STRICT;

CREATE INDEX modifiche_entita ON modifiche (entita, entita_id, data);
CREATE INDEX modifiche_operazione ON modifiche (operazione);
CREATE INDEX modifiche_da_riportare ON modifiche (data) WHERE stato_buona_strada = 'da_riportare';

-- The log is append-only. The only allowed update is the Buona Strada
-- confirmation: from 'da_riportare' to 'riportata', with who and when,
-- without touching the other columns.
CREATE TRIGGER modifiche_no_cancellazione BEFORE DELETE ON modifiche
BEGIN
  SELECT RAISE(ABORT, 'modifiche rows cannot be deleted');
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
  SELECT RAISE(ABORT, 'modifiche rows allow only the Buona Strada confirmation');
END;

-- Reads of sensitive data (tax codes, Buona Strada-only fields, exports).
CREATE TABLE accessi (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin', 'sistema')),
  entita TEXT NOT NULL,
  entita_id TEXT,
  campi TEXT,                                -- JSON: list of fields read
  motivo TEXT
) STRICT;

CREATE INDEX accessi_email_data ON accessi (email, data);
CREATE INDEX accessi_entita ON accessi (entita, entita_id);

-- The access log is append-only too.
CREATE TRIGGER accessi_no_cancellazione BEFORE DELETE ON accessi
BEGIN
  SELECT RAISE(ABORT, 'accessi rows cannot be deleted');
END;

CREATE TRIGGER accessi_no_modifica BEFORE UPDATE ON accessi
BEGIN
  SELECT RAISE(ABORT, 'accessi rows cannot be updated');
END;
