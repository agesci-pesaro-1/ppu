-- Dati di base AGESCI: branche e unità standard.
-- Ogni gruppo può disattivare unità, rinominarle o aggiungerne (per esempio
-- un'unità mista) dall'MCP admin dopo l'installazione.

INSERT INTO branche (id, nome, ordine) VALUES
  ('lc', 'Lupetti e Coccinelle', 1),
  ('eg', 'Esploratori e Guide', 2),
  ('rs', 'Rover e Scolte', 3),
  ('coca', 'Comunità capi', 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO unita (id, nome, branca_id, attiva, ordine) VALUES
  ('lupetti', 'Lupetti', 'lc', 1, 1),
  ('coccinelle', 'Coccinelle', 'lc', 1, 2),
  ('esploratori', 'Esploratori', 'eg', 1, 3),
  ('guide', 'Guide', 'eg', 1, 4),
  ('noviziato', 'Noviziato', 'rs', 1, 5),
  ('clan', 'Clan', 'rs', 1, 6),
  ('coca', 'Co.Ca.', 'coca', 1, 7)
ON CONFLICT (id) DO NOTHING;
