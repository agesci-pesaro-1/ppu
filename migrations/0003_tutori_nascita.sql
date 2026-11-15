-- Data e luogo di nascita dei genitori/tutori: campi anagrafici Buona Strada
-- presenti nel foglio di partenza. Solo aggiunte (compatibile con la versione precedente).

ALTER TABLE tutori ADD COLUMN data_nascita TEXT;
ALTER TABLE tutori ADD COLUMN luogo_nascita TEXT;
