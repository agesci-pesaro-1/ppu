# 0006. Allineamento manuale con Buona Strada, con conferma di una seconda persona

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Buona Strada è il sistema ufficiale AGESCI per l'anagrafica e il censimento e resta la fonte ufficiale. Non ha API: ogni modifica anagrafica fatta in PPU va riportata a mano. Senza tracciamento le due anagrafiche divergono.

## Decisione

I campi anagrafici marcati "Buona Strada" seguono questo flusso:

1. il capo chiede la modifica; il server verifica permessi e mostra un'anteprima prima/dopo;
2. dopo la conferma il nuovo valore è subito operativo e la modifica entra nel registro con stato `da_riportare`;
3. i referenti Buona Strada vengono avvisati e vedono la coda nella PWA;
4. un utente con ruolo `buona_strada`, **diverso dall'autore**, la riporta su Buona Strada e conferma.

Il vincolo sull'autore vale per tutti, anche per chi ha accesso completo, ed è applicato nel livello di servizi.

## Alternative scartate

- **Modifica non operativa fino alla conferma:** blocca il lavoro dei capi per giorni.
- **Nessun tracciamento:** divergenza certa tra PPU e Buona Strada.
- **Automazione via scraping:** fragile e probabilmente contraria ai termini d'uso.

## Conseguenze

- Il registro `modifiche` ha uno stato Buona Strada e chi ha confermato.
- Servono almeno due referenti `buona_strada` perché ognuno possa vedere confermate le proprie modifiche.
- Se in futuro Buona Strada offrirà esportazioni o API, un nuovo ADR potrà affiancare un confronto automatico.
