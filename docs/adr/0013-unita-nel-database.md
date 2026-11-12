# 0013. Unità nel database, gestite dall'MCP admin

- **Stato:** Proposta
- **Data:** 2026-11-12

## Contesto

Il piano dice sia che le unità attive stanno "in un file di configurazione" sia che il webmaster "gestisce unità, ruoli e tag tramite l'MCP admin". Le unità sono anche referenziate da molte tabelle (associati, storico, riunioni, permessi dei capi). Alcuni gruppi hanno unità diverse dallo standard, per esempio un Branco/Cerchio misto al posto di Lupetti e Coccinelle separati.

## Decisione

Le unità sono righe della tabella `unita`, con branca, nome, ordine e flag `attiva`. Il seed base inserisce le sette unità standard AGESCI (Lupetti, Coccinelle, Esploratori, Guide, Noviziato e Clan in R/S, Co.Ca.). Dopo l'installazione il webmaster le attiva, disattiva, rinomina o ne aggiunge dall'MCP admin, con registro.

La configurazione del gruppo resta per ciò che non è un dato: dominio, nome del gruppo, branding, segreti. Lupetti e Coccinelle separati sono il default, non un vincolo: nessuna regola del codice dipende dal sesso o dall'elenco fisso delle unità.

## Alternative scartate

- **Unità attive in un file di configurazione:** le chiavi esterne non potrebbero puntare a un file; un cambio richiederebbe un nuovo deploy.
- **Elenco fisso nel codice:** impedisce unità miste o nomi diversi.

## Conseguenze

- Le chiavi esterne garantiscono che associati, riunioni e permessi usino solo unità esistenti.
- Un'unità non si cancella: si disattiva (resta nello storico).
- Lo script di installazione potrà leggere dalla configurazione l'elenco iniziale delle unità attive e aggiornare la tabella una volta sola.
