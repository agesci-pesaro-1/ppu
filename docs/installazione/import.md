# Import iniziale dal foglio

Il primo caricamento degli associati arriva dal foglio di calcolo che il gruppo usa oggi. L'import gira **dentro il Worker** ed è riservato al **webmaster**: nessuno script locale scrive sul database di produzione.

Il flusso ha due passi:

1. **anteprima**: il Worker legge il file e la mappatura, controlla ogni riga e restituisce il piano (righe da creare, già presenti, con errori) e un codice di controllo (`hash`). Non scrive nulla.
2. **conferma**: il Worker ricalcola il piano, verifica che l'`hash` sia lo stesso (stesso file, stessa mappatura, nessun nuovo associato nel frattempo) e salva tutto in un'unica transazione, registro delle modifiche compreso. O entra tutto, o niente.

## 1. Esportare il foglio in CSV

- Da Google Fogli: *File → Scarica → Valori separati da virgola (.csv)*.
- Da Excel o LibreOffice: *Salva con nome → CSV*, codifica UTF-8. Il separatore può essere `;` o `,`: viene riconosciuto in automatico.
- La prima riga deve contenere i nomi delle colonne, senza celle unite.
- Le date nel formato `gg/mm/aaaa` (o `aaaa-mm-gg`, da indicare nella mappatura).

Il CSV contiene dati personali di minori: tienilo solo sul tuo computer, **non** caricarlo su chat, email, Drive condivisi o nel repository (il `.gitignore` blocca i file `.csv` fuori da `seed/`, ma non affidarti solo a quello).

## 2. Scrivere la mappatura

La mappatura dice, per ogni campo di PPU, da quale colonna del foglio leggerlo. Parti da [`import-esempio.json`](import-esempio.json): i nomi delle colonne lì sono **inventati** e vanno sostituiti con quelli del vostro foglio.

| Sezione | Contenuto |
| --- | --- |
| `versione` | Sempre `1`. |
| `formatoData` | `"gg/mm/aaaa"` (predefinito) o `"aaaa-mm-gg"`. |
| `associato` | Campo → colonna. Obbligatori `cognome` e `nome`. Campi possibili: `codice_censimento`, `cognome`, `nome`, `data_nascita`, `luogo_nascita`, `codice_fiscale`, `indirizzo`, `cap`, `comune`, `provincia`, `cellulare`, `telefono_casa`, `email`, `informativa`, `informativa_data`, `consenso_2a`, `consenso_2b`, `consenso_2c`, `note_privacy`. |
| `unita` | `colonna` e `valori`: per ogni valore che compare nel foglio, l'id dell'unità in PPU (`lupetti`, `coccinelle`, `esploratori`, `guide`, `noviziato`, `clan`, `coca`, o le unità del vostro gruppo). |
| `tutori` | Fino a 4 genitori o tutori per riga: `relazione` (`madre`, `padre`, `tutore`, ...) e `campi` (`nome` obbligatorio, poi `cognome`, `codice_fiscale`, `cellulare`, `email`, `riceve_comunicazioni`). |
| `note` | Colonne di note generali: diventano voci libere di progressione (tipo predefinito `nota`). |
| `valoriSi`, `valoriNo` | Valori aggiuntivi da leggere come sì o no nelle colonne dei consensi. |

Le colonne del foglio non citate nella mappatura vengono ignorate e l'anteprima le elenca, così puoi controllare di non averne dimenticata nessuna.

### Come vengono letti i valori

- **Date:** convertite in `aaaa-mm-gg`; una data inesistente (per esempio 31/02) è un errore.
- **Sì/no** (informativa e consensi): `sì`, `si`, `x`, `1`, `vero`... valgono sì; vuoto, `no`, `0`... valgono no. Un valore non riconosciuto vale **no**, con un avviso: per un consenso è la scelta prudente.
- **Telefoni:** solo cifre, con prefisso internazionale (`+39` se manca).
- **CAP:** se il foglio ha tolto lo zero iniziale (`1100`), viene completato (`01100`) con un avviso.
- **Codici fiscali e provincia:** in maiuscolo.
- **Tutori senza cognome:** prendono quello dell'associato, con un avviso. Se l'associato è maggiorenne, i tutori vengono importati già archiviati.

## 3. Anteprima e conferma

Per ora l'import si chiama via API (in seguito ci sarà uno strumento nell'MCP admin). Serve un token di Cloudflare Access del tuo account webmaster, ottenuto per esempio con `cloudflared access login https://<indirizzo-del-worker>`.

Prepara il corpo della richiesta (il file resta sul tuo computer):

```bash
jq -n --rawfile csv foglio.csv --slurpfile m mappatura.json '{csv: $csv, mappatura: $m[0]}' > richiesta.json
```

Anteprima:

```bash
curl -s -X POST https://<indirizzo-del-worker>/api/admin/import/anteprima \
  -H "cf-access-token: $(cloudflared access token -app=https://<indirizzo-del-worker>)" \
  -H 'content-type: application/json' --data @richiesta.json
```

La risposta contiene i conteggi, le colonne ignorate e, per ogni riga, solo numero di riga, cognome, nome, unità ed eventuali errori e avvisi per campo (mai contatti o codici fiscali). Correggi il foglio o la mappatura finché `conErrori` è 0: la conferma è rifiutata se c'è anche una sola riga con errori.

Conferma, con l'`hash` dell'anteprima:

```bash
jq --arg hash '<hash>' '. + {hash: $hash}' richiesta.json > conferma.json
curl -s -X POST https://<indirizzo-del-worker>/api/admin/import/conferma \
  -H "cf-access-token: $(cloudflared access token -app=https://<indirizzo-del-worker>)" \
  -H 'content-type: application/json' --data @conferma.json
```

## Regole

- **Duplicati:** una riga con un codice censimento già presente in PPU è "già presente" e viene saltata (nessun aggiornamento). Si può quindi ripetere l'import dopo aver aggiunto righe al foglio. Codici censimento o fiscali ripetuti nel file, o un codice fiscale già presente, sono errori.
- **Registro:** ogni associato, tutore e nota creati entra nel registro delle modifiche con canale `import`. Queste righe **non** sono "da riportare su Buona Strada": i dati arrivano dal foglio, che è già allineato a Buona Strada. Se il vostro foglio contiene dati che Buona Strada non ha, allineali prima dell'import.
- **Storico:** chi ha un'unità viene inserito nello storico dell'anno scout attuale, se ne esiste uno.
- **Limiti:** al massimo 1000 righe e circa 1 MB per import; per fogli più grandi, dividi il file.
- **Dopo l'import:** cancella `foglio.csv`, `richiesta.json` e `conferma.json` dal tuo computer e svuota il cestino. Il CSV non viene mai salvato né scritto nei log dal Worker.
