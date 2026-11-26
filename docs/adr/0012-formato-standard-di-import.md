# 0012. Formato standard per l'import degli associati

- **Stato:** Accettata
- **Data:** 2026-11-26
- **Supera:** il punto dell'[ADR 0007](0007-un-installazione-per-gruppo.md) sulla mappatura delle colonne configurabile per l'import

## Contesto

Il primo caricamento degli associati arriva dal foglio di calcolo che ogni gruppo usa prima di PPU. La prima versione dell'import leggeva il foglio così com'è, con una mappatura JSON configurabile (campo di PPU → colonna del foglio, valori delle unità, ruoli dei tutori, valori sì/no aggiuntivi), costruita a partire dal foglio del nostro gruppo.

Quel foglio però è nostro, non uno standard: Buona Strada non ne definisce uno, e ogni gruppo ha colonne, sigle e convenzioni diverse. Una mappatura abbastanza generale da coprirli tutti diventa un piccolo linguaggio di trasformazione da mantenere, documentare e testare per sempre, e ogni gruppo deve comunque impararlo per scriverla.

## Decisione

PPU accetta un solo **formato standard**: un file CSV con una riga per associato e intestazioni fisse, che sono i nomi dei campi dello schema (`cognome`, `data_nascita`, `consenso_immagini`, `unita`, `note`...). I genitori e i tutori stanno sulla stessa riga, in colonne numerate da `tutore1_` a `tutore4_` (`tutore1_ruolo`, `tutore1_nome`...).

- Solo `cognome` e `nome` sono obbligatori. Le altre colonne si possono togliere e stare in qualsiasi ordine.
- Una colonna fuori dal formato blocca l'import, così un errore di battitura non fa perdere dati in silenzio.
- I valori hanno formati fissi: date `gg/mm/aaaa` o `aaaa-mm-gg`, sì/no come `si`/`no` (un valore diverso è un errore), unità come id o nome dell'unità in PPU, ruoli dei tutori come nel database.
- Il modello con tutte le colonne è `docs/installazione/import-modello.csv`, con dati finti. Un test verifica che corrisponda alle colonne del codice.
- Ogni gruppo converte una volta il proprio foglio nel formato, con il foglio di calcolo o con uno script suo, fuori dal repository.

Restano invariati il flusso anteprima → conferma con `hash`, la riservatezza al webmaster e il passaggio via API e non dalla chat.

## Alternative considerate

- **Mappatura configurabile** (la prima versione): flessibile, ma complessa e pensata intorno a un foglio specifico.
- **Più file CSV** (associati, tutori) collegati da un codice: senza limite al numero di tutori, ma più difficili da preparare da un foglio di calcolo, dove i genitori stanno quasi sempre sulla riga del figlio.
- **JSON**: naturale per l'API, scomodo da produrre per chi lavora con un foglio di calcolo.
- **Esportazione di Buona Strada**: sarebbe lo standard naturale, ma oggi non contiene tutti i dati (contatti dei genitori, consensi, note). L'import dell'esportazione con confronto delle differenze resta una funzione separata del piano.

## Conseguenze

- Il codice dell'import è più piccolo e senza configurazione. Gli errori parlano il linguaggio del modello (`tutore1_ruolo: ruolo non valido`).
- Il formato fa parte dell'interfaccia pubblica di PPU: aggiungere una colonna è compatibile, rinominarla o toglierla no, e va annunciato nelle note di rilascio.
- Al massimo 4 tutori per associato nell'import. Altri si aggiungono dopo, dalla scheda.
- Se l'esportazione di Buona Strada diventa abbastanza completa, l'import potrà leggerla direttamente con un nuovo ADR.
