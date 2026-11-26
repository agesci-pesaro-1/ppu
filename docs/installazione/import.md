# Import iniziale degli associati

Il primo caricamento degli associati arriva da un file CSV nel **formato standard di PPU**, uguale per tutti i gruppi (ADR 0012). PPU non legge il foglio del vostro gruppo così com'è: lo convertite una volta in questo formato, con il foglio di calcolo o con uno script vostro, e poi lo importate. L'import gira **dentro il Worker** ed è riservato al **webmaster**: nessuno script locale scrive sul database di produzione.

Il flusso ha due passi:

1. **anteprima**: il Worker legge il file, controlla ogni riga e restituisce il piano (righe da creare, già presenti, con errori) e un codice di controllo (`hash`). Non scrive nulla.
2. **conferma**: il Worker ricalcola il piano, verifica che l'`hash` sia lo stesso (stesso file, nessun nuovo associato nel frattempo) e salva tutto in un'unica transazione, registro delle modifiche compreso. O entra tutto, o niente.

## 1. Il formato

Parti dal modello [`import-modello.csv`](import-modello.csv): contiene tutte le colonne e tre righe di esempio con dati **inventati**, da cancellare.

- **Una riga per associato**, prima riga con i nomi delle colonne.
- **Nomi delle colonne fissi**, quelli del modello (maiuscole e minuscole non contano). Una colonna con un nome diverso blocca l'import: così un errore di battitura non fa perdere dati in silenzio.
- **Colonne obbligatorie:** solo `cognome` e `nome`. Le altre si possono togliere se non le avete; l'ordine è libero.
- **Separatore** `;` o `,` (riconosciuto in automatico), codifica UTF-8, nessuna cella unita.

| Colonna | Contenuto |
| --- | --- |
| `codice_censimento` | Codice di Buona Strada. Facoltativo, ma serve per riconoscere chi è già in PPU. |
| `cognome`, `nome` | Obbligatori. |
| `data_nascita`, `luogo_nascita` | Data in `gg/mm/aaaa` o `aaaa-mm-gg`. |
| `codice_fiscale` | |
| `unita` | Id dell'unità in PPU (`lupetti`, `esploratori`, `clan`...) o il suo nome (`Clan/Fuoco`). |
| `indirizzo`, `cap`, `comune`, `provincia` | Residenza. |
| `cellulare`, `email` | Contatti dell'associato. |
| `riceve_comunicazioni` | `si`/`no`. Se la colonna manca, sì. |
| `informativa`, `informativa_data` | Informativa consegnata e firmata (`si`/`no`) e data. |
| `consenso_attivita` | Punto A dell'informativa: dati per le attività associative (`si`/`no`). |
| `consenso_immagini` | Punto B: foto e video (`si`/`no`). |
| `consenso_commerciale` | Punto C: promozione commerciale del "Sistema AGESCI" (`si`/`no`). |
| `note_privacy` | Note sui consensi. |
| `note` | Note generali: diventano una voce libera di progressione di tipo `nota`. |
| `tutore1_ruolo` … `tutore4_ruolo` | Fino a 4 genitori o tutori: `madre`, `padre`, `tutore`, `affidatario` o `altro`. |
| `tutoreN_cognome`, `tutoreN_nome` | `nome` obbligatorio se il tutore è presente; senza cognome prende quello dell'associato. |
| `tutoreN_codice_fiscale`, `tutoreN_cellulare`, `tutoreN_email` | |

Un tutore è "presente" se almeno una delle sue colonne è compilata: in quel caso servono `ruolo` e `nome`.

### Come vengono letti i valori

- **Date:** `gg/mm/aaaa` o `aaaa-mm-gg`, convertite in `aaaa-mm-gg`; una data inesistente (per esempio 31/02) è un errore.
- **Sì/no:** `si`, `sì`, `x`, `1` valgono sì; vuoto, `no`, `0` valgono no. Qualsiasi altro valore è un **errore**: il file è preparato per PPU, quindi un valore diverso è un errore di conversione, e per un consenso non si tira a indovinare.
- **Telefoni:** solo cifre, con prefisso internazionale (`+39` se manca).
- **CAP:** se il foglio ha tolto lo zero iniziale (`1100`), viene completato (`01100`) con un avviso.
- **Codici fiscali e provincia:** in maiuscolo.
- **Tutori di maggiorenni:** importati già archiviati.

Il CSV contiene dati personali di minori: tienilo solo sul tuo computer, **non** caricarlo su chat, email, Drive condivisi o nel repository (il `.gitignore` blocca i file `.csv` fuori da `seed/` e dal modello, ma non affidarti solo a quello). Per lo stesso motivo l'import non è uno strumento dell'MCP admin: il file passerebbe dalla chat, cioè dai server del provider dell'assistente.

## 2. Convertire il vostro foglio

Se il vostro foglio ha colonne diverse, preparane una copia nel formato standard: rinomina le colonne, togli quelle che PPU non prevede, trasforma i valori (per esempio le sigle delle unità nei loro id, `X` → `si`). Ripeti l'anteprima finché non ci sono errori.

## 3. Anteprima e conferma

L'import si chiama via API. Serve un token di Cloudflare Access del tuo account webmaster, ottenuto per esempio con `cloudflared access login https://<indirizzo-del-worker>`.

Prepara il corpo della richiesta (il file resta sul tuo computer):

```bash
jq -n --rawfile csv import.csv '{csv: $csv}' > richiesta.json
```

Anteprima:

```bash
curl -s -X POST https://<indirizzo-del-worker>/api/admin/import/preview \
  -H "cf-access-token: $(cloudflared access token -app=https://<indirizzo-del-worker>)" \
  -H 'content-type: application/json' --data @richiesta.json
```

La risposta contiene i conteggi e, per ogni riga, solo numero di riga, cognome, nome, unità ed eventuali errori e avvisi per campo (mai contatti o codici fiscali). Correggi il file finché `counts.withErrors` è 0: la conferma è rifiutata se c'è anche una sola riga con errori.

Conferma, con l'`hash` dell'anteprima:

```bash
jq --arg hash '<hash>' '. + {hash: $hash}' richiesta.json > conferma.json
curl -s -X POST https://<indirizzo-del-worker>/api/admin/import/confirm \
  -H "cf-access-token: $(cloudflared access token -app=https://<indirizzo-del-worker>)" \
  -H 'content-type: application/json' --data @conferma.json
```

## Regole

- **Duplicati:** una riga con un codice censimento già presente in PPU è "già presente" e viene saltata (nessun aggiornamento). Si può quindi ripetere l'import dopo aver aggiunto righe al file. Codici censimento o fiscali ripetuti nel file, o un codice fiscale già presente, sono errori.
- **Registro:** ogni associato, tutore e nota creati entra nel registro delle modifiche con canale `import`. Queste righe **non** sono "da riportare su Buona Strada": il file si prepara da dati già allineati a Buona Strada. Se il vostro foglio contiene dati che Buona Strada non ha, allineali prima dell'import.
- **Storico:** chi ha un'unità viene inserito nello storico dell'anno scout attuale, se ne esiste uno.
- **Limiti:** al massimo 1000 righe e circa 1 MB per import; per fogli più grandi, dividi il file.
- **Dopo l'import:** cancella `import.csv`, `richiesta.json` e `conferma.json` dal tuo computer e svuota il cestino. Il CSV non viene mai salvato né scritto nei log dal Worker.
