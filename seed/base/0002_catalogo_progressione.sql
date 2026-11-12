-- Catalogo di progressione: punto di partenza minimo.
-- Contiene solo le voci comuni e stabili; specialità, brevetti, prede e voli
-- vanno completati da chi ha accesso completo secondo il regolamento in vigore.

INSERT INTO catalogo_progressione (branca_id, tipo, nome, ordine) VALUES
  ('lc', 'promessa', 'Promessa', 1),

  ('eg', 'promessa', 'Promessa', 1),
  ('eg', 'tappa', 'Scoperta', 2),
  ('eg', 'tappa', 'Competenza', 3),
  ('eg', 'tappa', 'Responsabilità', 4),

  ('rs', 'promessa', 'Promessa', 1),
  ('rs', 'impegno', 'Firma dell''impegno', 2),
  ('rs', 'partenza', 'Partenza', 3)
ON CONFLICT (branca_id, tipo, nome) DO NOTHING;
