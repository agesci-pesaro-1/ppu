-- Operations waiting for confirmation (before/after preview → explicit confirmation).
-- Additions only: compatible with the previous version of the code (ADR 0006).

CREATE TABLE anteprime (
  id TEXT PRIMARY KEY,                       -- UUID; becomes modifiche.operazione on confirmation
  autore_email TEXT NOT NULL,
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin')),
  tipo TEXT NOT NULL,                        -- operation type: 'user.set', 'tag.merge', ...
  payload TEXT NOT NULL,                     -- JSON: the request to apply
  anteprima TEXT NOT NULL,                   -- JSON: before/after rows shown to the author
  conteggio INTEGER NOT NULL DEFAULT 1,      -- items touched; > 1 = mass operation
  stato TEXT NOT NULL DEFAULT 'in_attesa'
    CHECK (stato IN ('in_attesa', 'confermata', 'annullata', 'scaduta')),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  scade_il TEXT NOT NULL,
  chiuso_il TEXT
) STRICT;

CREATE INDEX anteprime_autore ON anteprime (autore_email, stato);

-- A preview is closed only once: a second confirmation (even a concurrent one)
-- makes the whole batch fail, data included.
CREATE TRIGGER anteprime_chiusura_unica
BEFORE UPDATE OF stato ON anteprime
WHEN OLD.stato <> 'in_attesa'
BEGIN
  SELECT RAISE(ABORT, 'anteprime row already closed');
END;
