# Dati iniziali

Dopo le migrazioni, un'installazione riceve i dati in quest'ordine:

1. **Configurazione del gruppo**: branche, unità e tipi di tag. Ogni gruppo scrive il proprio file JSON partendo da [`config/gruppo.esempio.json`](../config/gruppo.esempio.json) e mette solo quello che gli serve. Lo script lo traduce in SQL:

   ```bash
   pnpm -s seed:gruppo config/gruppo.json > gruppo.sql
   ```

   Il tipo di tag `varie` è obbligatorio: è il predefinito per i tag senza categoria. Il file si può riapplicare quando si aggiunge qualcosa: le voci nuove entrano, quelle già presenti non cambiano.

2. **`base/`**: il catalogo di progressione dal Regolamento metodologico (versione leggibile in [`docs/catalogo-progressione.md`](../docs/catalogo-progressione.md)). Entrano solo le voci delle branche presenti nella configurazione. Idempotente.

3. **Solo per preview, test E2E e demo pubblica**: dati **inventati**, generati da `scripts/genera-seed-demo.ts`. Nel repository non c'è nessun file SQL dei dati demo: i test importano lo script, la pipeline genera l'SQL al momento. Presuppongono la configurazione d'esempio. Mai in produzione.

   ```bash
   pnpm -s seed:demo > demo.sql
   ```

   Nessun dato reale: nomi, indirizzi, telefoni, email e codici fiscali sono finti (email su `example.org`, codici fiscali con prefisso `DEMO`, comune e provincia inesistenti).
