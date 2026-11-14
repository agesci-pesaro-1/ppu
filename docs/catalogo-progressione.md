# Catalogo di progressione

Le voci standard che i capi trovano già pronte quando registrano la progressione
personale di un associato. È la versione leggibile di
`seed/base/0002_catalogo_progressione.sql`: le due devono coincidere, e un test
(`pnpm test`) lo verifica.

## Come funziona

Ogni traguardo raggiunto da un associato è una riga della tabella `progressione`,
con data e anno scout. La voce può essere:

- **dal catalogo**: una delle voci qui sotto, scelta da un elenco;
- **libera**: tipo e descrizione scritti a mano, per ciò che il catalogo non ha
  (per esempio le vecchie note generali importate dal foglio).

Le voci del catalogo non si cancellano: quelle non più in uso si disattivano.
Dopo l'installazione chi ha accesso completo può aggiungerne altre.

La colonna **Ordine** decide la posizione nell'elenco, dentro ogni branca.

## L/C — Lupetti e Coccinelle (`lc`)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | promessa | Promessa |

## E/G — Esploratori e Guide (`eg`)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | promessa | Promessa |
| 2 | tappa | Scoperta |
| 3 | tappa | Competenza |
| 4 | tappa | Responsabilità |

## R/S — Rover e Scolte (`rs`)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | promessa | Promessa |
| 2 | impegno | Firma dell'impegno |
| 3 | partenza | Partenza |

## Da completare

- Specialità (E/G) e brevetti di competenza (E/G): elenco in arrivo.
- Prede, voli e gli altri momenti L/C.
- Revisione di tutti i momenti di ogni branca.
