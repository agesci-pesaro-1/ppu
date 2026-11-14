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
- **Immagine:** per le specialità E/G, il distintivo come pubblicato da AGESCI su
  [avventura.agesci.it/specialita](https://avventura.agesci.it/specialita/). Nel
  database c'è solo il collegamento (`immagine_url`): le immagini sono di AGESCI e
  non stanno nel repository.
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

| Ordine | Tipo | Voce | Immagine |
| --- | --- | --- | --- |
| 101 | specialita | Allevatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_Allevatore.jpg" alt="" width="48"> |
| 102 | specialita | Alpinista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_Alpinista.jpg" alt="" width="48"> |
| 103 | specialita | Amico degli animali | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_amico-degli-animali.jpg" alt="" width="48"> |
| 104 | specialita | Amico del quartiere | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_amico_del_quartiere.jpg" alt="" width="48"> |
| 105 | specialita | Archeologo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_archeologo.jpg" alt="" width="48"> |
| 106 | specialita | Artigiano | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_artigiano-150x150.jpg" alt="" width="48"> |
| 107 | specialita | Artista di strada | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_artista_di_strada.jpg" alt="" width="48"> |
| 108 | specialita | Astronomo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_astronomo.jpg" alt="" width="48"> |
| 109 | specialita | Atleta | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_atleta.jpg" alt="" width="48"> |
| 110 | specialita | Attore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_attore.jpg" alt="" width="48"> |
| 111 | specialita | Batteliere | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_battelliere.jpg" alt="" width="48"> |
| 112 | specialita | Boscaiolo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_boscaiolo.jpg" alt="" width="48"> |
| 113 | specialita | Botanico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_botanico.jpg" alt="" width="48"> |
| 114 | specialita | Campeggiatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_campeggiatore.jpg" alt="" width="48"> |
| 115 | specialita | Canoista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_canoista-150x150.jpg" alt="" width="48"> |
| 116 | specialita | Cantante | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_cantante-150x150.jpg" alt="" width="48"> |
| 117 | specialita | Carpentiere navale | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_carpentiere_navale.jpg" alt="" width="48"> |
| 118 | specialita | Ciclista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_ciclista-150x150.jpg" alt="" width="48"> |
| 119 | specialita | Collezionista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_collezionista-150x150.jpg" alt="" width="48"> |
| 120 | specialita | Coltivatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_coltivatore-150x150.jpg" alt="" width="48"> |
| 121 | specialita | Corrispondente | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_corrispondente.jpg" alt="" width="48"> |
| 122 | specialita | Corrispondente radio | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_corrispondenteradio-150x150.jpg" alt="" width="48"> |
| 123 | specialita | Cuoco | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_cuoco.jpg" alt="" width="48"> |
| 124 | specialita | Danzatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_danzatore.jpg" alt="" width="48"> |
| 125 | specialita | Disegnatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_disegnatore.jpg" alt="" width="48"> |
| 126 | specialita | Elettricista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_elettricista.jpg" alt="" width="48"> |
| 127 | specialita | Elettronico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_elettronico-150x150.jpg" alt="" width="48"> |
| 128 | specialita | Esperto del computer | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_esperto_del_computer.jpg" alt="" width="48"> |
| 129 | specialita | Europeista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_europeista.jpg" alt="" width="48"> |
| 130 | specialita | Falegname | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_falegname.jpg" alt="" width="48"> |
| 131 | specialita | Fa tutto | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_fatutto.jpg" alt="" width="48"> |
| 132 | specialita | Folclorista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_folclorista.jpg" alt="" width="48"> |
| 133 | specialita | Fotografo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_fotografo-150x150.jpg" alt="" width="48"> |
| 134 | specialita | Geologo | — |
| 135 | specialita | Giardiniere | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_giardiniere.jpg" alt="" width="48"> |
| 136 | specialita | Giocattolaio | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_giocattolaio.jpg" alt="" width="48"> |
| 137 | specialita | Grafico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_grafico-150x150.jpg" alt="" width="48"> |
| 138 | specialita | Guida | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_Guida.jpg" alt="" width="48"> |
| 139 | specialita | Guida marina | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_guida_marina.jpg" alt="" width="48"> |
| 140 | specialita | Hebertista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_hebertista.jpg" alt="" width="48"> |
| 141 | specialita | Idraulico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_idraulico-150x150.jpg" alt="" width="48"> |
| 142 | specialita | Infermiere | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_Infermiere.jpg" alt="" width="48"> |
| 143 | specialita | Interprete | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_interprete.jpg" alt="" width="48"> |
| 144 | specialita | Lavoratore/ce in cuoio | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_lavoratore_cuoio.jpg" alt="" width="48"> |
| 145 | specialita | Maestro dei giochi | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_maestro_giochi.jpg" alt="" width="48"> |
| 146 | specialita | Maestro dei nodi | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_maestro_nodi-150x150.jpg" alt="" width="48"> |
| 147 | specialita | Meccanico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_meccanico.jpg" alt="" width="48"> |
| 148 | specialita | Modellista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_modellista-150x150.jpg" alt="" width="48"> |
| 149 | specialita | Muratore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_muratore.jpg" alt="" width="48"> |
| 150 | specialita | Musicista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_musicista-150x150.jpg" alt="" width="48"> |
| 151 | specialita | Nuotatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_nuotatore.jpg" alt="" width="48"> |
| 152 | specialita | Osservatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_osservatore.jpg" alt="" width="48"> |
| 153 | specialita | Osservatore meteo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_osservatore-meteo.jpg" alt="" width="48"> |
| 154 | specialita | Pescatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_pescatore-150x150.jpg" alt="" width="48"> |
| 155 | specialita | Pompiere | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_pompiere.jpg" alt="" width="48"> |
| 156 | specialita | Redattore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_redattore.jpg" alt="" width="48"> |
| 157 | specialita | Regista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_regista.jpg" alt="" width="48"> |
| 158 | specialita | Sarto | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_sarto.jpg" alt="" width="48"> |
| 159 | specialita | Scenografo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_scenografo-150x150.jpg" alt="" width="48"> |
| 160 | specialita | Segnalatore | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_segnalatore-150x150.jpg" alt="" width="48"> |
| 161 | specialita | Servizio della Parola | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_servizio_della_parola.jpg" alt="" width="48"> |
| 162 | specialita | Servizio liturgico | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_servizio_liturgico.jpg" alt="" width="48"> |
| 163 | specialita | Servizio missionario | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/spec_servizio_missionario-150x150.jpg" alt="" width="48"> |
| 164 | specialita | Topografo | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2018/05/topografo-e1525515313664.jpg" alt="" width="48"> |
| 165 | specialita | Velista | <img src="https://avventura.agesci.it/wp-content/uploads/sites/17/2015/08/velista.jpg" alt="" width="48"> |

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
- **Immagini E/G:** il sito non ha l'immagine di Geologo. Sul sito c'è anche
  Naturalista, che nel regolamento in vigore è un brevetto e non una specialità:
  non è abbinato. Il regolamento scrive «Batteliere», il sito «Battelliere».
- **R/S:** per ora i soli momenti nel catalogo sono la salita in clan/fuoco
  (fine del noviziato) e la Partenza. Promessa (per chi
  arriva dall'esterno), passi di scoperta, competenza e responsabilità e firma
  della Carta di clan restano fuori finché non si decide come registrarli.
  Tra gli eventi a partecipazione individuale ci sono solo ROSS ed Evento per
  partenti, più una voce generica EPPPI per tutti gli altri (laboratori,
  campi di specializzazione, Ora et Labora, Route dello spirito, cantieri).
- **Date:** da decidere se la data di una tappa, fase o passo è l'inizio
  (quando si consegna il distintivo) o il riconoscimento della conclusione.
