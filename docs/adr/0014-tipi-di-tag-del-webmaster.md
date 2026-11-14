# 0014. Tipi di tag gestiti dal webmaster, con il tipo "varie"

- **Stato:** Proposta
- **Data:** 2026-11-14

## Contesto

L'ADR 0007 stabilisce che qualsiasi capo crea tag e che il webmaster li rivede, e che il seed base fornisce i tipi di tag comuni. Non dice chi può creare nuovi tipi, né dove finisce un tag che non rientra in nessun tipo.

## Decisione

- I tipi di tag (`tipi_tag`) li crea, rinomina e riordina solo il webmaster, dall'MCP admin, con registro. Il seed base inserisce i tipi comuni: squadriglia, sestiglia, consiglio, incarico, evento, esperienza, varie.
- Dentro ogni tipo qualsiasi capo crea tutti i tag che vuole, come previsto dall'ADR 0007.
- Il tipo `varie` raccoglie le proposte non categorizzate: è il tipo predefinito quando un capo crea un tag senza sceglierne uno. Il webmaster, nella revisione, può spostare un tag di `varie` nel tipo giusto o crearne uno nuovo.

## Alternative scartate

- **Tipi liberi come i tag:** i tipi servono a ordinare e filtrare; se li crea chiunque si moltiplicano come i tag, senza la revisione che li tiene in ordine.
- **Tipo obbligatorio senza un tipo predefinito:** un capo con un tag che non sa dove mettere sceglierebbe un tipo a caso, rendendo più difficile la revisione.

## Conseguenze

- `tag.tipo_id` ha `'varie'` come valore predefinito; il seed base deve sempre contenere il tipo `varie`.
- Il controllo "solo il webmaster crea tipi" sta nel livello di servizi, come gli altri permessi.
- La revisione del webmaster parte di solito dai tag in `varie`.
