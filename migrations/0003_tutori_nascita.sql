-- Birth date and place of parents/guardians: Buona Strada personal data fields
-- found in the starting sheet. Additions only: compatible with the previous
-- version of the code (ADR 0006).

ALTER TABLE tutori ADD COLUMN data_nascita TEXT CHECK (data_nascita IS date(data_nascita));
ALTER TABLE tutori ADD COLUMN luogo_nascita TEXT;
