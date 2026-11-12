-- Tipi di tag comuni. I tag veri e propri li creano i capi.

INSERT INTO tipi_tag (id, nome, esclusivo_predefinito, ordine) VALUES
  ('squadriglia', 'Squadriglia', 1, 1),
  ('sestiglia', 'Sestiglia', 1, 2),
  ('consiglio', 'Consiglio', 0, 3),
  ('incarico', 'Incarico', 0, 4),
  ('evento', 'Evento', 0, 5),
  ('esperienza', 'Esperienza', 0, 6),
  ('altro', 'Altro', 0, 7)
ON CONFLICT (id) DO NOTHING;
