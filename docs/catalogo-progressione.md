# Catalogo di progressione

Le voci standard che i capi trovano già pronte quando registrano la progressione
personale di un associato. È la versione leggibile di
`seed/base/0002_catalogo_progressione.sql`: le due devono coincidere, e un test
(`pnpm test`) lo verifica.

**Versione:** `2026-07-29`, Regolamento metodologico AGESCI, aggiornato al Consiglio generale 2026.

## Come funziona

Ogni traguardo raggiunto da un associato è una riga della tabella `progressione`,
con data e anno scout. La voce può essere:

- **dal catalogo**: una delle voci qui sotto, scelta da un elenco;
- **libera**: tipo e descrizione scritti a mano, per ciò che il catalogo non ha
  (per esempio le vecchie note generali importate dal foglio).

### Versioni

Ogni voce del catalogo appartiene alla versione del Regolamento metodologico da cui
è presa, identificata dalla **data di aggiornamento del documento**. Quando AGESCI
pubblica un aggiornamento si aggiunge una nuova versione con le sue voci; quelle
delle versioni precedenti non si toccano, così la progressione già registrata
continua a puntare alla voce in vigore quando è stata conquistata. Per le nuove
registrazioni si propone la versione più recente.

Le voci non più in uso si disattivano, non si cancellano. Chi ha accesso completo
può aggiungere voci del gruppo, senza versione.

### Colonne

- **Ordine:** posizione nell'elenco dentro la branca. I momenti partono da 1, le
  specialità da 101, i brevetti da 201, gli eventi da 301.
- **Tipo:** il valore della colonna `tipo` (`promessa`, `fase`, `tappa`,
  `passaggio`, `partenza`, `specialita`, `brevetto`, `evento`).
- I nomi si possono declinare al maschile o al femminile, come dice il regolamento:
  nel catalogo compaiono come negli allegati.

## L/C — Lupetti e Coccinelle (`lc`)

### Momenti

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | promessa | Promessa |
| 2 | fase | Lupo della legge |
| 3 | fase | Lupo della rupe |
| 4 | fase | Lupo anziano |
| 5 | fase | Coccinella del prato |
| 6 | fase | Coccinella del bosco |
| 7 | fase | Coccinella della montagna |

### Specialità (Allegato 3)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 101 | specialita | Amico degli animali |
| 102 | specialita | Amico degli anziani |
| 103 | specialita | Amico del mare |
| 104 | specialita | Amico della natura |
| 105 | specialita | Amico di Aronne |
| 106 | specialita | Amico di Samuele |
| 107 | specialita | Amico di San Francesco |
| 108 | specialita | Artigiano |
| 109 | specialita | Astronomo |
| 110 | specialita | Atleta |
| 111 | specialita | Attore |
| 112 | specialita | Botanico |
| 113 | specialita | Canterino |
| 114 | specialita | Cercatore di tracce |
| 115 | specialita | Cittadino del mondo |
| 116 | specialita | Collezionista |
| 117 | specialita | Cuoco |
| 118 | specialita | Disegnatore |
| 119 | specialita | Folclorista |
| 120 | specialita | Fotografo |
| 121 | specialita | Giardiniere |
| 122 | specialita | Giocatore di squadra |
| 123 | specialita | Giocattolaio |
| 124 | specialita | Giornalista |
| 125 | specialita | Guida |
| 126 | specialita | Infermiere |
| 127 | specialita | Kim |
| 128 | specialita | Maestro dei giochi |
| 129 | specialita | Maestro del bosco |
| 130 | specialita | Maestro della salute |
| 131 | specialita | Maestro di danze |
| 132 | specialita | Mani abili |
| 133 | specialita | Massaio |
| 134 | specialita | Meteorologo |
| 135 | specialita | Montanaro |
| 136 | specialita | Musicista |
| 137 | specialita | Ripara-Ricicla |
| 138 | specialita | Sarto |
| 139 | specialita | Scaccia pericoli |
| 140 | specialita | Scrittore |

### Eventi a partecipazione individuale

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Campetto Piccole Orme |

## E/G — Esploratori e Guide (`eg`)

### Momenti

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | promessa | Promessa |
| 2 | tappa | Scoperta |
| 3 | tappa | Competenza |
| 4 | tappa | Responsabilità |

### Specialità individuali (Allegato 2)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 101 | specialita | Allevatore |
| 102 | specialita | Alpinista |
| 103 | specialita | Amico degli animali |
| 104 | specialita | Amico del quartiere |
| 105 | specialita | Archeologo |
| 106 | specialita | Artigiano |
| 107 | specialita | Artista di strada |
| 108 | specialita | Astronomo |
| 109 | specialita | Atleta |
| 110 | specialita | Attore |
| 111 | specialita | Batteliere |
| 112 | specialita | Boscaiolo |
| 113 | specialita | Botanico |
| 114 | specialita | Campeggiatore |
| 115 | specialita | Canoista |
| 116 | specialita | Cantante |
| 117 | specialita | Carpentiere navale |
| 118 | specialita | Ciclista |
| 119 | specialita | Collezionista |
| 120 | specialita | Coltivatore |
| 121 | specialita | Corrispondente |
| 122 | specialita | Corrispondente radio |
| 123 | specialita | Cuoco |
| 124 | specialita | Danzatore |
| 125 | specialita | Disegnatore |
| 126 | specialita | Elettricista |
| 127 | specialita | Elettronico |
| 128 | specialita | Esperto del computer |
| 129 | specialita | Europeista |
| 130 | specialita | Falegname |
| 131 | specialita | Fa tutto |
| 132 | specialita | Folclorista |
| 133 | specialita | Fotografo |
| 134 | specialita | Geologo |
| 135 | specialita | Giardiniere |
| 136 | specialita | Giocattolaio |
| 137 | specialita | Grafico |
| 138 | specialita | Guida |
| 139 | specialita | Guida marina |
| 140 | specialita | Hebertista |
| 141 | specialita | Idraulico |
| 142 | specialita | Infermiere |
| 143 | specialita | Interprete |
| 144 | specialita | Lavoratore/ce in cuoio |
| 145 | specialita | Maestro dei giochi |
| 146 | specialita | Maestro dei nodi |
| 147 | specialita | Meccanico |
| 148 | specialita | Modellista |
| 149 | specialita | Muratore |
| 150 | specialita | Musicista |
| 151 | specialita | Nuotatore |
| 152 | specialita | Osservatore |
| 153 | specialita | Osservatore meteo |
| 154 | specialita | Pescatore |
| 155 | specialita | Pompiere |
| 156 | specialita | Redattore |
| 157 | specialita | Regista |
| 158 | specialita | Sarto |
| 159 | specialita | Scenografo |
| 160 | specialita | Segnalatore |
| 161 | specialita | Servizio della Parola |
| 162 | specialita | Servizio liturgico |
| 163 | specialita | Servizio missionario |
| 164 | specialita | Topografo |
| 165 | specialita | Velista |

### Brevetti di competenza (Allegato 4)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 201 | brevetto | Animatore sportivo |
| 202 | brevetto | Artista |
| 203 | brevetto | Cittadino del mondo |
| 204 | brevetto | Esploratore delle acque |
| 205 | brevetto | Giornalista |
| 206 | brevetto | Grafico multimediale |
| 207 | brevetto | Guida alpina |
| 208 | brevetto | Liturgista |
| 209 | brevetto | Maestro delle tecnologie |
| 210 | brevetto | Mani Abili |
| 211 | brevetto | Naturalista |
| 212 | brevetto | Pioniere |
| 213 | brevetto | Sherpa |
| 214 | brevetto | Soccorritore |
| 215 | brevetto | Trappeur |

### Eventi di approfondimento della competenza (Allegato 5)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Campo di specialità |
| 302 | evento | Campo di competenza |

## R/S — Rover e Scolte (`rs`)

### Momenti

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | passaggio | Salita in clan/fuoco |
| 2 | partenza | Partenza |

### Eventi di progressione personale a partecipazione individuale (Allegato 1)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Evento di progressione personale a partecipazione individuale (EPPPI) |
| 302 | evento | Route d'orientamento alla scelta di servizio (ROSS) |
| 303 | evento | Evento per partenti |

## Da rivedere

- **L/C:** le fasi del lupetto (pista) e della coccinella (sentiero) stanno nella
  stessa branca; il capo sceglie quelle giuste. Non sono incluse le altre
  occasioni a partecipazione individuale (voli, cacce, campetti) perché il
  regolamento non le elenca per nome.
- **E/G:** la conclusione del sentiero (Art. 40) è una cerimonia di reparto, non
  una voce a sé: non è nel catalogo. Le specialità di squadriglia (Allegato 3 E/G)
  per ora non servono e non sono nel catalogo.
- **R/S:** per ora i soli momenti nel catalogo sono la salita in clan/fuoco
  (fine del noviziato) e la Partenza. Promessa (per chi
  arriva dall'esterno), passi di scoperta, competenza e responsabilità e firma
  della Carta di clan restano fuori finché non si decide come registrarli.
  Tra gli eventi a partecipazione individuale ci sono solo ROSS ed Evento per
  partenti, più una voce generica EPPPI per tutti gli altri (laboratori,
  campi di specializzazione, Ora et Labora, Route dello spirito, cantieri).
- **Date:** da decidere se la data di una tappa, fase o passo è l'inizio
  (quando si consegna il distintivo) o il riconoscimento della conclusione.
