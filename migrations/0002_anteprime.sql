-- Operazioni in attesa di conferma (anteprima prima/dopo → conferma esplicita).
-- Solo aggiunte: compatibile con la versione precedente del codice (ADR 0008).

CREATE TABLE anteprime (
  id TEXT PRIMARY KEY,                       -- UUID; diventa modifiche.operazione alla conferma
  autore_email TEXT NOT NULL,
  canale TEXT NOT NULL CHECK (canale IN ('mcp', 'pwa', 'admin')),
  tipo TEXT NOT NULL,                        -- 'utente.imposta', 'tag.unisci', ...
  payload TEXT NOT NULL,                     -- JSON: la richiesta da applicare
  anteprima TEXT NOT NULL,                   -- JSON: righe prima/dopo mostrate all'autore
  conteggio INTEGER NOT NULL DEFAULT 1,      -- righe toccate; > 1 = operazione di massa
  stato TEXT NOT NULL DEFAULT 'in_attesa'
    CHECK (stato IN ('in_attesa', 'confermata', 'annullata', 'scaduta')),
  creato_il TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  scade_il TEXT NOT NULL,
  chiuso_il TEXT
) STRICT;

CREATE INDEX anteprime_autore ON anteprime (autore_email, stato);

-- Un'anteprima si chiude una volta sola: una seconda conferma (anche concorrente)
-- fa fallire l'intero batch, dato compreso.
CREATE TRIGGER anteprime_chiusura_unica
BEFORE UPDATE OF stato ON anteprime
WHEN OLD.stato <> 'in_attesa'
BEGIN
  SELECT RAISE(ABORT, 'anteprima già chiusa');
END;
