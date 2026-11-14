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

- **Ordine:** posizione nell'elenco dentro la branca. Le tappe partono da 1, le
  specialità da 101, i brevetti da 201, gli eventi da 301.
- **Tipo:** il valore della colonna `tipo`: `tappa`, `specialita`, `brevetto`,
  `evento`. Vedi sotto, «Perché un solo tipo `tappa`».
- **Immagine:** il distintivo. Promesse, tappe E/G, fasi L/C e brevetti hanno la foto del
  distintivo su ilcastoroscoutshop.com. Per le specialità E/G è l'immagine pubblicata
  da AGESCI su [avventura.agesci.it/specialita](https://avventura.agesci.it/specialita/)
  (tranne Geologo, che lì manca); per le L/C e per Geologo la foto del distintivo su
  [ilcastoroscoutshop.com](https://ilcastoroscoutshop.com/collections/distintivi-uniforme-agesci/products/copia-del-specialita-eg),
  un rivenditore (Amico degli anziani da
  [scoutshopcampania.it](https://www.scoutshopcampania.it/prodotto/specialita-l-c-amico-degli-anziani/)).
  Nel database c'è solo il collegamento (`immagine_url`): le
  immagini non sono nostre e non stanno nel repository. Alcuni visualizzatori di
  Markdown non mostrano immagini esterne; su GitHub si vedono.
- I nomi si possono declinare al maschile o al femminile, come dice il regolamento:
  nel catalogo compaiono come negli allegati.

### Perché un solo tipo `tappa`

Il tipo `tappa` raccoglie tutti i traguardi del cammino: Promessa, fasi L/C,
tappe E/G, salita in clan/fuoco e Partenza. Il regolamento non usa un termine
unico:

- la parte comune (Art. 30, «Gradualità») parla di tre **fasi**: scoperta,
  competenza, responsabilità;
- in L/C sono i **momenti** della pista e del sentiero (Art. 36), vissuti nelle
  **fasi** del gioco delle prede e dei voli (Art. 38);
- in E/G sono le **tappe** (Art. 34);
- in R/S sono i **passi** (Art. 34–36); la salita in clan/fuoco è un **momento di
  passaggio** (Art. 31) e la Partenza ha un articolo proprio (Art. 37);
- la **Promessa** sta nei fondamenti della proposta scout (Art. 9), ma ogni
  branca la colloca all'inizio del cammino.

Per non avere categorie con una sola voce si usa `tappa` per tutti. Il nome da
mostrare per ogni branca (fase, tappa, passo…) si deciderà con l'interfaccia.

## L/C — Lupetti e Coccinelle (`lc`)

### Tappe

| Ordine | Tipo | Voce | Immagine |
| --- | --- | --- | --- |
| 1 | tappa | Promessa lupetto | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/PromessaLupettoricamata.jpg?v=1605715944" alt="" width="48"> |
| 2 | tappa | Lupo della legge | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Branco_1_momento.jpg?v=1611068606" alt="" width="48"> |
| 3 | tappa | Lupo della rupe | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Branco_2_momento.jpg?v=1611068606" alt="" width="48"> |
| 4 | tappa | Lupo anziano | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Branco_3_momento.jpg?v=1611068606" alt="" width="48"> |
| 5 | tappa | Promessa coccinella | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/PromessaCoccinellaricamata.jpg?v=1605715845" alt="" width="48"> |
| 6 | tappa | Coccinella del prato | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Cerchio_1_momento.jpg?v=1611068606" alt="" width="48"> |
| 7 | tappa | Coccinella del bosco | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Cerchio_2_momento.jpg?v=1611068606" alt="" width="48"> |
| 8 | tappa | Coccinella della montagna | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_Cerchio_3_momento.jpg?v=1611068606" alt="" width="48"> |

### Specialità (Allegato 3)

| Ordine | Tipo | Voce | Immagine |
| --- | --- | --- | --- |
| 101 | specialita | Amico degli animali | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_a_d_animali.jpg?v=1611333610" alt="" width="48"> |
| 102 | specialita | Amico degli anziani | <img src="https://www.scoutshopcampania.it/wp-content/uploads/2025/02/amico_degli_anziani_4.jpg" alt="" width="48"> |
| 103 | specialita | Amico del mare | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_a_mare.jpg?v=1611333610" alt="" width="48"> |
| 104 | specialita | Amico della natura | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_amico_natura.jpg?v=1611333610" alt="" width="48"> |
| 105 | specialita | Amico di Aronne | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_aronne.jpg?v=1611333610" alt="" width="48"> |
| 106 | specialita | Amico di Samuele | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_samuele.jpg?v=1611333602" alt="" width="48"> |
| 107 | specialita | Amico di San Francesco | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_a_d_francesco.jpg?v=1611333602" alt="" width="48"> |
| 108 | specialita | Artigiano | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_artigiano.jpg?v=1611333602" alt="" width="48"> |
| 109 | specialita | Astronomo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_astronomo.jpg?v=1611333602" alt="" width="48"> |
| 110 | specialita | Atleta | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_atleta.jpg?v=1611333602" alt="" width="48"> |
| 111 | specialita | Attore | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_attore.jpg?v=1611333602" alt="" width="48"> |
| 112 | specialita | Botanico | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_botanico.jpg?v=1611333602" alt="" width="48"> |
| 113 | specialita | Canterino | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_canterino.jpg?v=1611333602" alt="" width="48"> |
| 114 | specialita | Cercatore di tracce | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_cercatore_tracce.jpg?v=1611333602" alt="" width="48"> |
| 115 | specialita | Cittadino del mondo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_cittadino_mondo.jpg?v=1611333602" alt="" width="48"> |
| 116 | specialita | Collezionista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_collezionista.jpg?v=1611333602" alt="" width="48"> |
| 117 | specialita | Cuoco | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_cuoco.jpg?v=1611333602" alt="" width="48"> |
| 118 | specialita | Disegnatore | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_disegnatore.jpg?v=1611333602" alt="" width="48"> |
| 119 | specialita | Folclorista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_folclorista.jpg?v=1611333602" alt="" width="48"> |
| 120 | specialita | Fotografo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_fotografo.jpg?v=1611333602" alt="" width="48"> |
| 121 | specialita | Giardiniere | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_giardiniere.jpg?v=1611333602" alt="" width="48"> |
| 122 | specialita | Giocatore di squadra | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_g_d_squadra.jpg?v=1611333602" alt="" width="48"> |
| 123 | specialita | Giocattolaio | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_giocattolaio.jpg?v=1611333602" alt="" width="48"> |
| 124 | specialita | Giornalista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_giornalista.jpg?v=1611333602" alt="" width="48"> |
| 125 | specialita | Guida | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_guida.jpg?v=1611333602" alt="" width="48"> |
| 126 | specialita | Infermiere | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_infermiere.jpg?v=1611333602" alt="" width="48"> |
| 127 | specialita | Kim | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_kim.jpg?v=1611333602" alt="" width="48"> |
| 128 | specialita | Maestro dei giochi | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_m_d_giochi.jpg?v=1611333602" alt="" width="48"> |
| 129 | specialita | Maestro del bosco | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_maestro_bosco.jpg?v=1611333602" alt="" width="48"> |
| 130 | specialita | Maestro della salute | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_m_d_salute.jpg?v=1611333602" alt="" width="48"> |
| 131 | specialita | Maestro di danze | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_m_d_danze.jpg?v=1611333602" alt="" width="48"> |
| 132 | specialita | Mani abili | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_mani_abili.jpg?v=1611333602" alt="" width="48"> |
| 133 | specialita | Massaio | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_massaio.jpg?v=1611333602" alt="" width="48"> |
| 134 | specialita | Meteorologo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/spec_lc_meteorologo.jpg?v=1611333602" alt="" width="48"> |
| 135 | specialita | Montanaro | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_montanaro.jpg?v=1611333602" alt="" width="48"> |
| 136 | specialita | Musicista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_musicista.jpg?v=1611333602" alt="" width="48"> |
| 137 | specialita | Ripara-Ricicla | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_ripararicicla.jpg?v=1611333602" alt="" width="48"> |
| 138 | specialita | Sarto | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_sarto.jpg?v=1611333602" alt="" width="48"> |
| 139 | specialita | Scaccia pericoli | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_scacciapericoli.jpg?v=1611333602" alt="" width="48"> |
| 140 | specialita | Scrittore | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/sp_lc_scrittore.jpg?v=1611333602" alt="" width="48"> |

### Eventi a partecipazione individuale

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Campetto Piccole Orme |

## E/G — Esploratori e Guide (`eg`)

### Tappe

| Ordine | Tipo | Voce | Immagine |
| --- | --- | --- | --- |
| 1 | tappa | Promessa | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/PromessaScoutricamata.jpg?v=1605715991" alt="" width="48"> |
| 2 | tappa | Scoperta | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_E_G-_1_Tappa.jpg?v=1611068124" alt="" width="48"> |
| 3 | tappa | Competenza | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_E_G-_2_Tappa_ok.jpg?v=1611068124" alt="" width="48"> |
| 4 | tappa | Responsabilità | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Progressione_Personale_E_G-_3_Tappa_ok.jpg?v=1611068124" alt="" width="48"> |

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
| 134 | specialita | Geologo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/specialita_eg_geologo_web.jpg?v=1611073528" alt="" width="48"> |
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

| Ordine | Tipo | Voce | Immagine |
| --- | --- | --- | --- |
| 201 | brevetto | Animatore sportivo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_sportiva.jpg?v=1611067883" alt="" width="48"> |
| 202 | brevetto | Artista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_espressiva.jpg?v=1611067883" alt="" width="48"> |
| 203 | brevetto | Cittadino del mondo | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_internazionale.jpg?v=1611067883" alt="" width="48"> |
| 204 | brevetto | Esploratore delle acque | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/files/esploratore-delle-acque.gif?v=1712736580" alt="" width="48"> |
| 205 | brevetto | Giornalista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_giornalistica.jpg?v=1611067883" alt="" width="48"> |
| 206 | brevetto | Grafico multimediale | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_grafica_e_multimediale.jpg?v=1611067883" alt="" width="48"> |
| 207 | brevetto | Guida alpina | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Guida_alpina.jpg?v=1611067883" alt="" width="48"> |
| 208 | brevetto | Liturgista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Animazione_religiosa.jpg?v=1611067883" alt="" width="48"> |
| 209 | brevetto | Maestro delle tecnologie | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/files/maestro-delle-tecnologie.gif?v=1712736579" alt="" width="48"> |
| 210 | brevetto | Mani Abili | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Mani_abili.jpg?v=1611067883" alt="" width="48"> |
| 211 | brevetto | Naturalista | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Amico_della_natura.jpg?v=1611067883" alt="" width="48"> |
| 212 | brevetto | Pioniere | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Pioniere.jpg?v=1611067883" alt="" width="48"> |
| 213 | brevetto | Sherpa | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Sherpa.jpg?v=1611067883" alt="" width="48"> |
| 214 | brevetto | Soccorritore | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Soccorso.jpg?v=1611067883" alt="" width="48"> |
| 215 | brevetto | Trappeur | <img src="https://cdn.shopify.com/s/files/1/0511/9098/8955/products/Trappeur.jpg?v=1611067883" alt="" width="48"> |

### Eventi di approfondimento della competenza (Allegato 5)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Campo di specialità |
| 302 | evento | Campo di competenza |

## R/S — Rover e Scolte (`rs`)

### Tappe

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 1 | tappa | Salita in clan/fuoco |
| 2 | tappa | Partenza |

### Eventi di progressione personale a partecipazione individuale (Allegato 1)

| Ordine | Tipo | Voce |
| --- | --- | --- |
| 301 | evento | Evento di progressione personale a partecipazione individuale (EPPPI) |
| 302 | evento | Route d'orientamento alla scelta di servizio (ROSS) |
| 303 | evento | Evento per partenti |

## Da rivedere

- **L/C:** Promessa e fasi del lupetto (pista) e della coccinella (sentiero) stanno
  nella stessa branca, con distintivi diversi (Allegati 1 e 2); il capo sceglie
  quelle giuste. Non sono incluse le altre
  occasioni a partecipazione individuale (voli, cacce, campetti) perché il
  regolamento non le elenca per nome.
- **E/G:** la conclusione del sentiero (Art. 40) è una cerimonia di reparto, non
  una voce a sé: non è nel catalogo. Le specialità di squadriglia (Allegato 3 E/G)
  per ora non servono e non sono nel catalogo.
- **Immagini L/C:** vengono da due rivenditori, e «Amico degli anziani» ha uno
  stile fotografico diverso dalle altre. Le foto di un rivenditore possono cambiare
  o sparire: meglio sostituirle con immagini ufficiali quando ci sono.
- **Immagini E/G:** avventura.agesci.it non ha l'immagine di Geologo: viene dal
  rivenditore, come le L/C. Sul sito c'è anche
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
