# 0008. Buona Strada fonte ufficiale, allineamento manuale tracciato nel registro

- **Stato:** Accettata
- **Data:** 2026-11-14

## Contesto

Buona Strada è il sistema ufficiale AGESCI per l'anagrafica e il censimento e resta la fonte ufficiale. Non offre API né esportazioni utilizzabili da un altro sistema. PPU tiene una propria copia dell'anagrafica, che i capi modificano: senza un meccanismo di allineamento le due anagrafiche divergono.

## Decisione

PPU non si integra in automatico con Buona Strada. I campi anagrafici che esistono anche su Buona Strada sono marcati come tali e l'allineamento è manuale, tracciato nel registro `modifiche`:

- dopo la conferma la modifica è subito operativa in PPU ed entra nel registro con stato `da_riportare`;
- le modifiche `da_riportare` formano una coda, consultabile nella PWA;
- chi riporta la modifica su Buona Strada la segna come allineata nel registro, che annota chi ha confermato e quando.

Chi può confermare, e con quali vincoli, è una regola di dominio applicata nel livello di servizi (ADR 0004), non parte di questa decisione.

## Alternative scartate

- **Modifica non operativa fino all'allineamento:** blocca il lavoro dei capi per giorni e richiede di gestire valori "in attesa" in tutte le letture.
- **Nessun tracciamento:** divergenza certa tra PPU e Buona Strada, scoperta solo al censimento.
- **Automazione via scraping:** fragile a ogni cambio dell'interfaccia di Buona Strada, richiede credenziali personali conservate da PPU e probabilmente è contraria ai termini d'uso.
- **PPU come fonte ufficiale:** non dipende da noi; il censimento passa da Buona Strada.

## Conseguenze

- Il registro `modifiche` ha uno stato Buona Strada e chi ha confermato; i campi anagrafici portano il marcatore "Buona Strada".
- Per un periodo PPU può essere più aggiornato di Buona Strada: la coda serve proprio a rendere visibile questo scarto.
- Le notifiche segnalano le modifiche da riportare.
- Se in futuro Buona Strada offrirà esportazioni o API, un nuovo ADR potrà affiancare o sostituire l'allineamento manuale con un confronto automatico.
