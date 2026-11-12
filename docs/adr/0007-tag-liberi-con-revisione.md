# 0007. Tag liberi con revisione del webmaster

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

I capi raggruppano gli associati in molti modi: squadriglie e sestiglie, Consiglio della Legge, eventi, esperienze. Un elenco chiuso deciso in anticipo non copre i casi reali; un elenco totalmente libero produce doppioni.

## Decisione

Qualsiasi capo crea e usa tag su tutti gli associati. Un tag ha nome, tipo, stato (`libero`, `ufficiale`, `archiviato`), anno scout facoltativo, flag `esclusivo` (al massimo un tag di quel tipo per persona e anno, per esempio la squadriglia) e autore. Il webmaster vede tutti i tag con il loro utilizzo e decide quali rendere ufficiali, quali unire e quali archiviare, dall'MCP admin.

L'assegnazione di un tag (`associati_tag`) si salva subito dopo la conferma, con registro, fuori dal flusso Buona Strada.

## Alternative scartate

- **Solo tag ufficiali creati dal webmaster:** collo di bottiglia, i capi tornerebbero alle note libere.
- **Tag liberi senza revisione:** doppioni e varianti ortografiche non controllate.

## Conseguenze

- Serve un'operazione di unione che sposta le assegnazioni sul tag scelto, con registro.
- Il vincolo `esclusivo` va controllato nel livello di servizi (e, dove possibile, nel database).
- Il seed base fornisce i tipi di tag comuni.
