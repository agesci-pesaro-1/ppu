-- Name the privacy consents after what they cover instead of the form's letters.
-- A: processing and disclosure for association activities (enrolment, legal duties, camps, events).
-- B: photos and videos, rights assigned to AGESCI.
-- C: commercial promotion within the AGESCI system (scout shops).
-- A plain rename breaks the previous code version: accepted because no production data
-- or running beta exists yet. From here on, migrations go back to add-then-remove (ADR 0006).

ALTER TABLE associati RENAME COLUMN consenso_2a TO consenso_attivita;
ALTER TABLE associati RENAME COLUMN consenso_2b TO consenso_immagini;
ALTER TABLE associati RENAME COLUMN consenso_2c TO consenso_commerciale;
