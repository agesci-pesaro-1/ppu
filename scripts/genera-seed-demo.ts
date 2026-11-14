// Genera seed/demo/demo.sql con dati INVENTATI per preview, test E2E e demo.
// Uso: node scripts/genera-seed-demo.ts
//
// Tutto è deterministico: lo stesso script produce sempre lo stesso file.
// Nessun dato reale: email su example.org, codici fiscali con prefisso DEMO,
// comune e provincia inesistenti.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Valore = string | number | null;

const DOMINIO = 'example.org';
const COMUNE = 'Valdifiori';
const PROVINCIA = 'XX';
const CAP = '00000';

const righe: string[] = [];

function sql(v: Valore): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${v.replaceAll("'", "''")}'`;
}

function insert(tabella: string, valori: Record<string, Valore>): void {
  const colonne = Object.keys(valori);
  righe.push(
    `INSERT INTO ${tabella} (${colonne.join(', ')}) VALUES (${colonne.map((c) => sql(valori[c] ?? null)).join(', ')});`,
  );
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '.');
}

// ---------------------------------------------------------------------------
// Anni scout
// ---------------------------------------------------------------------------

const ANNO_PRECEDENTE = 1;
const ANNO_ATTUALE = 2;
insert('anni_scout', {
  id: ANNO_PRECEDENTE,
  nome: '2025/26',
  data_inizio: '2025-10-05',
  attuale: 0,
  creato_da: 'sistema',
});
insert('anni_scout', {
  id: ANNO_ATTUALE,
  nome: '2026/27',
  data_inizio: '2026-10-04',
  attuale: 1,
  creato_da: 'sistema',
});

// ---------------------------------------------------------------------------
// Associati
// ---------------------------------------------------------------------------

interface Persona {
  cognome: string;
  nome: string;
  nascita: string;
  unita: string;
  unitaPrecedente?: string;
  consensi?: [number, number, number];
}

const persone: Persona[] = [
  // Lupetti
  { cognome: 'Arcangeli', nome: 'Tommaso', nascita: '2017-03-14', unita: 'lupetti' },
  {
    cognome: 'Bellandi',
    nome: 'Leonardo',
    nascita: '2016-07-02',
    unita: 'lupetti',
    unitaPrecedente: 'lupetti',
  },
  { cognome: 'Cardelli', nome: 'Matteo', nascita: '2018-01-21', unita: 'lupetti' },
  {
    cognome: 'Donati',
    nome: 'Pietro',
    nascita: '2016-11-09',
    unita: 'lupetti',
    unitaPrecedente: 'lupetti',
    consensi: [1, 0, 1],
  },
  {
    cognome: 'Ercolani',
    nome: 'Samuele',
    nascita: '2017-05-30',
    unita: 'lupetti',
    unitaPrecedente: 'lupetti',
  },
  {
    cognome: 'Fabbrini',
    nome: 'Davide',
    nascita: '2015-12-12',
    unita: 'lupetti',
    unitaPrecedente: 'lupetti',
  },
  // Coccinelle
  { cognome: 'Galassi', nome: 'Sofia', nascita: '2017-02-18', unita: 'coccinelle' },
  {
    cognome: 'Ioli',
    nome: 'Aurora',
    nascita: '2016-09-25',
    unita: 'coccinelle',
    unitaPrecedente: 'coccinelle',
  },
  { cognome: 'Lancisi', nome: 'Giulia', nascita: '2018-04-03', unita: 'coccinelle' },
  {
    cognome: 'Mariotti',
    nome: 'Ginevra',
    nascita: '2016-06-14',
    unita: 'coccinelle',
    unitaPrecedente: 'coccinelle',
    consensi: [0, 0, 0],
  },
  {
    cognome: 'Arcangeli',
    nome: 'Emma',
    nascita: '2015-10-27',
    unita: 'coccinelle',
    unitaPrecedente: 'coccinelle',
  },
  { cognome: 'Nardini', nome: 'Beatrice', nascita: '2017-08-08', unita: 'coccinelle' },
  // Esploratori
  {
    cognome: 'Orsolini',
    nome: 'Lorenzo',
    nascita: '2013-01-15',
    unita: 'esploratori',
    unitaPrecedente: 'esploratori',
  },
  {
    cognome: 'Pacini',
    nome: 'Marco',
    nascita: '2012-04-22',
    unita: 'esploratori',
    unitaPrecedente: 'esploratori',
  },
  {
    cognome: 'Quercioli',
    nome: 'Andrea',
    nascita: '2014-09-03',
    unita: 'esploratori',
    unitaPrecedente: 'lupetti',
  },
  {
    cognome: 'Rinaldi',
    nome: 'Giacomo',
    nascita: '2011-06-30',
    unita: 'esploratori',
    unitaPrecedente: 'esploratori',
  },
  {
    cognome: 'Bellandi',
    nome: 'Filippo',
    nascita: '2013-12-01',
    unita: 'esploratori',
    unitaPrecedente: 'esploratori',
  },
  {
    cognome: 'Santucci',
    nome: 'Riccardo',
    nascita: '2014-03-19',
    unita: 'esploratori',
    unitaPrecedente: 'lupetti',
  },
  // Guide
  {
    cognome: 'Tarducci',
    nome: 'Giulia',
    nascita: '2012-02-11',
    unita: 'guide',
    unitaPrecedente: 'guide',
  },
  {
    cognome: 'Ugolini',
    nome: 'Chiara',
    nascita: '2013-07-07',
    unita: 'guide',
    unitaPrecedente: 'guide',
    consensi: [1, 1, 0],
  },
  {
    cognome: 'Vannucci',
    nome: 'Martina',
    nascita: '2014-05-16',
    unita: 'guide',
    unitaPrecedente: 'coccinelle',
  },
  {
    cognome: 'Zanetti',
    nome: 'Alice',
    nascita: '2011-10-29',
    unita: 'guide',
    unitaPrecedente: 'guide',
  },
  {
    cognome: 'Galassi',
    nome: 'Elena',
    nascita: '2012-12-24',
    unita: 'guide',
    unitaPrecedente: 'guide',
  },
  {
    cognome: 'Benvenuti',
    nome: 'Anna',
    nascita: '2014-01-08',
    unita: 'guide',
    unitaPrecedente: 'coccinelle',
  },
  // Noviziato
  {
    cognome: 'Calvelli',
    nome: 'Nicola',
    nascita: '2010-03-02',
    unita: 'noviziato',
    unitaPrecedente: 'esploratori',
  },
  {
    cognome: 'Dini',
    nome: 'Sara',
    nascita: '2010-08-19',
    unita: 'noviziato',
    unitaPrecedente: 'guide',
  },
  {
    cognome: 'Orsolini',
    nome: 'Irene',
    nascita: '2009-11-30',
    unita: 'noviziato',
    unitaPrecedente: 'guide',
  },
  // Clan
  {
    cognome: 'Ferretti',
    nome: 'Gabriele',
    nascita: '2008-05-05',
    unita: 'clan',
    unitaPrecedente: 'clan',
  },
  {
    cognome: 'Giorgini',
    nome: 'Francesca',
    nascita: '2007-09-12',
    unita: 'clan',
    unitaPrecedente: 'clan',
  },
  {
    cognome: 'Lombardi',
    nome: 'Edoardo',
    nascita: '2009-02-27',
    unita: 'clan',
    unitaPrecedente: 'noviziato',
  },
  {
    cognome: 'Morandi',
    nome: 'Camilla',
    nascita: '2006-12-03',
    unita: 'clan',
    unitaPrecedente: 'clan',
  },
  {
    cognome: 'Paoletti',
    nome: 'Luca',
    nascita: '2008-10-15',
    unita: 'clan',
    unitaPrecedente: 'clan',
  },
  // Co.Ca. (capi)
  {
    cognome: 'Rossetti',
    nome: 'Paola',
    nascita: '1985-04-10',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Arcangeli',
    nome: 'Stefano',
    nascita: '1982-06-21',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Bianconi',
    nome: 'Laura',
    nascita: '1990-01-30',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Cecchini',
    nome: 'Michele',
    nascita: '1995-09-09',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Del Bianco',
    nome: 'Valentina',
    nascita: '1998-03-17',
    unita: 'coca',
    unitaPrecedente: 'clan',
  },
  {
    cognome: 'Esposti',
    nome: 'Federico',
    nascita: '1993-11-11',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Fiorani',
    nome: 'Elisa',
    nascita: '1988-07-25',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
  {
    cognome: 'Gentili',
    nome: 'Roberto',
    nascita: '1979-02-14',
    unita: 'coca',
    unitaPrecedente: 'coca',
  },
];

const VIE = [
  'Via dei Pini',
  'Via delle Rose',
  'Viale dei Tigli',
  'Piazza del Sole',
  'Via del Bosco',
];
const id = new Map<string, number>();

persone.forEach((p, i) => {
  const n = i + 1;
  const chiave = `${p.cognome} ${p.nome}`;
  id.set(chiave, n);
  const adulto = p.nascita < '2008-11-12';
  const [c2a, c2b, c2c] = p.consensi ?? [1, 1, 1];
  insert('associati', {
    id: n,
    codice_censimento: String(900000 + n),
    cognome: p.cognome,
    nome: p.nome,
    data_nascita: p.nascita,
    luogo_nascita: COMUNE,
    codice_fiscale: `DEMO${String(n).padStart(12, '0')}`,
    unita_id: p.unita,
    indirizzo: `${VIE[n % VIE.length]} ${n}`,
    cap: CAP,
    comune: COMUNE,
    provincia: PROVINCIA,
    cellulare: adulto ? `+39 300 000 ${String(n).padStart(4, '0')}` : null,
    email: adulto ? `${slug(p.nome)}.${slug(p.cognome)}@${DOMINIO}` : null,
    riceve_comunicazioni: n % 11 === 0 ? 0 : 1,
    informativa: 1,
    informativa_data: '2025-10-05',
    consenso_2a: c2a,
    consenso_2b: c2b,
    consenso_2c: c2c,
    note_privacy: null,
  });
  insert('storico_unita', { associato_id: n, unita_id: p.unita, anno_scout_id: ANNO_ATTUALE });
  if (p.unitaPrecedente) {
    insert('storico_unita', {
      associato_id: n,
      unita_id: p.unitaPrecedente,
      anno_scout_id: ANNO_PRECEDENTE,
    });
  }
});

// Un ex associato archiviato.
const archiviato = persone.length + 1;
insert('associati', {
  id: archiviato,
  cognome: 'Ricci',
  nome: 'Alessio',
  data_nascita: '2005-04-04',
  luogo_nascita: COMUNE,
  unita_id: 'clan',
  comune: COMUNE,
  provincia: PROVINCIA,
  informativa: 1,
  stato: 'archiviato',
  archiviato_il: '2026-10-04T00:00:00.000Z',
});
insert('storico_unita', {
  associato_id: archiviato,
  unita_id: 'clan',
  anno_scout_id: ANNO_PRECEDENTE,
});

const idDi = (chiave: string): number => {
  const n = id.get(chiave);
  if (n === undefined) throw new Error(`Associato demo sconosciuto: ${chiave}`);
  return n;
};

// ---------------------------------------------------------------------------
// Tutori
// ---------------------------------------------------------------------------

let tutore = 0;
const famiglie = new Map<string, number[]>(); // cognome -> tutori della famiglia (per i fratelli)
persone.forEach((p) => {
  if (p.unita === 'coca') return;
  const n = idDi(`${p.cognome} ${p.nome}`);
  const maggiorenne = p.nascita <= '2008-11-12';
  const archiviato_il = maggiorenne
    ? `${String(Number(p.nascita.slice(0, 4)) + 18)}${p.nascita.slice(4)}T00:00:00.000Z`
    : null;
  const genitori: [string, string][] = [
    ['madre', ['Maria', 'Giovanna', 'Silvia', 'Monica', 'Cristina'][n % 5] ?? 'Maria'],
    ['padre', ['Giuseppe', 'Alberto', 'Massimo', 'Paolo', 'Fabio'][n % 5] ?? 'Paolo'],
  ];
  // Una famiglia con un solo tutore registrato.
  const elenco = n % 7 === 0 ? genitori.slice(0, 1) : genitori;
  for (const [ruolo, nome] of elenco) {
    tutore += 1;
    // Il padre degli Arcangeli è anche capo (Stefano Arcangeli).
    const collegato =
      p.cognome === 'Arcangeli' && ruolo === 'padre' ? idDi('Arcangeli Stefano') : null;
    insert('tutori', {
      id: tutore,
      associato_id: n,
      ruolo,
      cognome: collegato ? 'Arcangeli' : p.cognome,
      nome: collegato ? 'Stefano' : nome,
      codice_fiscale: `DEMOT${String(tutore).padStart(11, '0')}`,
      cellulare: `+39 301 000 ${String(tutore).padStart(4, '0')}`,
      email: `${slug(nome)}.${slug(p.cognome)}.${tutore}@${DOMINIO}`,
      associato_collegato_id: collegato,
      archiviato: maggiorenne ? 1 : 0,
      archiviato_il,
    });
    famiglie.set(p.cognome, [...(famiglie.get(p.cognome) ?? []), tutore]);
  }
});

// ---------------------------------------------------------------------------
// Relazioni (sempre con l'inversa)
// ---------------------------------------------------------------------------

const INVERSA: Record<string, string> = {
  genitore: 'figlio',
  figlio: 'genitore',
  zio: 'nipote',
  nipote: 'zio',
};
function relazione(a: string, b: string, tipo: string): void {
  insert('relazioni', { associato_id: idDi(a), altro_associato_id: idDi(b), tipo });
  insert('relazioni', {
    associato_id: idDi(b),
    altro_associato_id: idDi(a),
    tipo: INVERSA[tipo] ?? tipo,
  });
}
relazione('Arcangeli Stefano', 'Arcangeli Tommaso', 'genitore');
relazione('Arcangeli Stefano', 'Arcangeli Emma', 'genitore');
relazione('Arcangeli Tommaso', 'Arcangeli Emma', 'fratello');
relazione('Bellandi Leonardo', 'Bellandi Filippo', 'fratello');
relazione('Galassi Sofia', 'Galassi Elena', 'fratello');
relazione('Orsolini Lorenzo', 'Orsolini Irene', 'fratello');
relazione('Rossetti Paola', 'Morandi Camilla', 'zio');

// ---------------------------------------------------------------------------
// Utenti: uno per ruolo, collegati alle schede dei capi
// ---------------------------------------------------------------------------

interface Utente {
  email: string;
  associato?: string;
  unita?: string[];
  accesso_completo?: number;
  buona_strada?: number;
  webmaster?: number;
  beta_tester?: number;
  escluso?: number;
}
const utenti: Utente[] = [
  { email: 'capo.lupetti', associato: 'Cecchini Michele', unita: ['lupetti'] },
  { email: 'capo.coccinelle', associato: 'Del Bianco Valentina', unita: ['coccinelle'] },
  {
    email: 'capo.eg',
    associato: 'Esposti Federico',
    unita: ['esploratori', 'guide'],
    beta_tester: 1,
  },
  { email: 'capo.rs', associato: 'Fiorani Elisa', unita: ['noviziato', 'clan'], buona_strada: 1 },
  { email: 'capogruppo', associato: 'Rossetti Paola', accesso_completo: 1, buona_strada: 1 },
  { email: 'genitore.capo', associato: 'Arcangeli Stefano', unita: ['esploratori'] },
  { email: 'webmaster', associato: 'Gentili Roberto', webmaster: 1, beta_tester: 1 },
  { email: 'segreteria', escluso: 1 },
];
for (const u of utenti) {
  const email = `${u.email}@${DOMINIO}`;
  insert('utenti', {
    email,
    associato_id: u.associato ? idDi(u.associato) : null,
    accesso_completo: u.accesso_completo ?? 0,
    buona_strada: u.buona_strada ?? 0,
    webmaster: u.webmaster ?? 0,
    beta_tester: u.beta_tester ?? 0,
    escluso: u.escluso ?? 0,
  });
  for (const unita of u.unita ?? []) insert('utenti_unita', { email, unita_id: unita });
}
// Bianconi Laura (Co.Ca.) non ha una riga in utenti: capo in sola lettura.

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

const tag: [number, string, string, string, number | null, number][] = [
  // id, nome, tipo, stato, anno, esclusivo
  [1, 'Aquile', 'squadriglia', 'ufficiale', ANNO_ATTUALE, 1],
  [2, 'Volpi', 'squadriglia', 'ufficiale', ANNO_ATTUALE, 1],
  [3, 'Pantere', 'squadriglia', 'ufficiale', ANNO_ATTUALE, 1],
  [4, 'Gazzelle', 'squadriglia', 'ufficiale', ANNO_ATTUALE, 1],
  [5, 'Sestiglia dei Grigi', 'sestiglia', 'ufficiale', ANNO_ATTUALE, 1],
  [6, 'Sestiglia dei Neri', 'sestiglia', 'ufficiale', ANNO_ATTUALE, 1],
  [7, 'Consiglio degli Anziani', 'consiglio', 'ufficiale', ANNO_ATTUALE, 0],
  [8, 'Campo invernale 2026', 'evento', 'libero', ANNO_ATTUALE, 0],
  [9, 'campo invernale', 'evento', 'libero', ANNO_ATTUALE, 0], // doppione da unire (demo revisione webmaster)
  [10, 'Capo squadriglia', 'incarico', 'ufficiale', ANNO_ATTUALE, 0],
  [11, 'Servizio mensa', 'esperienza', 'libero', null, 0],
];
for (const [tid, nome, tipo, stato, anno, esclusivo] of tag) {
  insert('tag', {
    id: tid,
    nome,
    tipo_id: tipo,
    stato,
    anno_scout_id: anno,
    esclusivo,
    creato_da: `capo.eg@${DOMINIO}`,
  });
}
const assegnazioni: [string, number][] = [
  ['Orsolini Lorenzo', 1],
  ['Pacini Marco', 1],
  ['Quercioli Andrea', 1],
  ['Rinaldi Giacomo', 2],
  ['Bellandi Filippo', 2],
  ['Santucci Riccardo', 2],
  ['Tarducci Giulia', 3],
  ['Ugolini Chiara', 3],
  ['Vannucci Martina', 3],
  ['Zanetti Alice', 4],
  ['Galassi Elena', 4],
  ['Benvenuti Anna', 4],
  ['Arcangeli Tommaso', 5],
  ['Bellandi Leonardo', 5],
  ['Cardelli Matteo', 5],
  ['Donati Pietro', 6],
  ['Ercolani Samuele', 6],
  ['Fabbrini Davide', 6],
  ['Fabbrini Davide', 7],
  ['Arcangeli Emma', 7],
  ['Rinaldi Giacomo', 10],
  ['Zanetti Alice', 10],
  ['Orsolini Lorenzo', 8],
  ['Rinaldi Giacomo', 8],
  ['Tarducci Giulia', 9],
  ['Ferretti Gabriele', 11],
  ['Giorgini Francesca', 11],
];
for (const [chi, tid] of assegnazioni) {
  insert('associati_tag', {
    associato_id: idDi(chi),
    tag_id: tid,
    anno_scout_id: tid === 11 ? null : ANNO_ATTUALE,
    creato_da: `capo.eg@${DOMINIO}`,
  });
}

// ---------------------------------------------------------------------------
// Progressione
// ---------------------------------------------------------------------------

// Gli id del catalogo dipendono dal seed base: si risolvono per nome.
function voceCatalogo(chi: string, branca: string, tipo: string, nome: string, data: string): void {
  righe.push(
    `INSERT INTO progressione (associato_id, catalogo_id, data, anno_scout_id, creato_da) SELECT ${idDi(chi)}, id, ${sql(data)}, ${data >= '2026-10-04' ? ANNO_ATTUALE : ANNO_PRECEDENTE}, ${sql(`capo.eg@${DOMINIO}`)} FROM catalogo_progressione WHERE versione = (SELECT max(data) FROM versioni_regolamento) AND branca_id = ${sql(branca)} AND tipo = ${sql(tipo)} AND nome = ${sql(nome)};`,
  );
}
voceCatalogo('Orsolini Lorenzo', 'eg', 'promessa', 'Promessa', '2025-02-23');
voceCatalogo('Orsolini Lorenzo', 'eg', 'tappa', 'Scoperta', '2025-06-15');
voceCatalogo('Pacini Marco', 'eg', 'promessa', 'Promessa', '2024-04-21');
voceCatalogo('Pacini Marco', 'eg', 'tappa', 'Competenza', '2026-05-10');
voceCatalogo('Tarducci Giulia', 'eg', 'promessa', 'Promessa', '2024-03-17');
voceCatalogo('Zanetti Alice', 'eg', 'tappa', 'Responsabilità', '2026-10-25');
voceCatalogo('Fabbrini Davide', 'lc', 'promessa', 'Promessa', '2024-12-08');
voceCatalogo('Morandi Camilla', 'rs', 'passaggio', 'Salita in clan/fuoco', '2025-10-05');
voceCatalogo('Rinaldi Giacomo', 'eg', 'specialita', 'Topografo', '2026-03-01');
voceCatalogo('Fabbrini Davide', 'lc', 'fase', 'Lupo della legge', '2025-05-18');
const libere: [string, string, string, string][] = [
  ['Ugolini Chiara', 'specialita', 'Specialità di cuciniera', '2026-04-12'],
  ['Arcangeli Emma', 'nota', 'Ha guidato il gioco della festa di Natale', '2025-12-20'],
];
for (const [chi, tipo, descrizione, data] of libere) {
  insert('progressione', {
    associato_id: idDi(chi),
    tipo,
    descrizione,
    data,
    anno_scout_id: data >= '2026-10-04' ? ANNO_ATTUALE : ANNO_PRECEDENTE,
    creato_da: `capo.eg@${DOMINIO}`,
  });
}

// ---------------------------------------------------------------------------
// Riunioni e presenze
// ---------------------------------------------------------------------------

let riunione = 0;
const riunioni: [string, string, string][] = [
  ['lupetti', '2026-10-10', 'riunione'],
  ['lupetti', '2026-10-17', 'riunione'],
  ['esploratori', '2026-10-11', 'riunione'],
  ['guide', '2026-10-11', 'riunione'],
  ['esploratori', '2026-10-24', 'uscita'],
  ['clan', '2026-11-21', 'riunione'], // futura: assenze comunicate in anticipo
];
for (const [unita, data, tipo] of riunioni) {
  riunione += 1;
  insert('riunioni', {
    id: riunione,
    unita_id: unita,
    anno_scout_id: ANNO_ATTUALE,
    data,
    tipo,
    creato_da: `capo.eg@${DOMINIO}`,
  });
  const membri = persone.filter((p) => p.unita === unita);
  membri.forEach((p, i) => {
    const futura = data > '2026-11-12';
    if (futura && i > 0) return; // solo un'assenza comunicata
    const stato = futura
      ? 'giustificato'
      : (riunione + i) % 5 === 0
        ? 'assente'
        : (riunione + i) % 7 === 0
          ? 'giustificato'
          : 'presente';
    insert('presenze', {
      riunione_id: riunione,
      associato_id: idDi(`${p.cognome} ${p.nome}`),
      stato,
      motivazione: stato === 'giustificato' ? 'Impegno di famiglia' : null,
      registrato_da: `capo.eg@${DOMINIO}`,
    });
  });
}

// ---------------------------------------------------------------------------
// Registro: modifiche anagrafiche da riportare su Buona Strada
// ---------------------------------------------------------------------------

const modifiche: [string, string, string, string, string, string, string | null][] = [
  // operazione, autore, associato, campo, prima, dopo, confermata_da
  [
    'demo-op-1',
    'capo.eg',
    'Pacini Marco',
    'indirizzo',
    'Via del Bosco 13',
    'Via delle Rose 40',
    null,
  ],
  ['demo-op-2', 'capogruppo', 'Dini Sara', 'cellulare', '', '+39 300 000 9999', null],
  ['demo-op-3', 'capo.lupetti', 'Cardelli Matteo', 'luogo_nascita', COMUNE, 'Altrove', 'capo.rs'],
];
for (const [operazione, autore, chi, campo, prima, dopo, confermata] of modifiche) {
  insert('modifiche', {
    operazione,
    autore_email: `${autore}@${DOMINIO}`,
    data: '2026-11-02T18:30:00.000Z',
    canale: 'pwa',
    entita: 'associati',
    entita_id: String(idDi(chi)),
    campo,
    valore_prima: JSON.stringify(prima),
    valore_dopo: JSON.stringify(dopo),
    stato_buona_strada: confermata ? 'riportata' : 'da_riportare',
    confermata_da: confermata ? `${confermata}@${DOMINIO}` : null,
    confermata_il: confermata ? '2026-11-04T09:00:00.000Z' : null,
  });
}

// ---------------------------------------------------------------------------

const intestazione = `-- Dati INVENTATI per preview, test E2E e demo. Mai in produzione.
-- Generato da scripts/genera-seed-demo.ts: non modificare a mano.
-- Richiede le migrazioni e seed/base già applicati.
`;
const destinazione = fileURLToPath(new URL('../seed/demo/demo.sql', import.meta.url));
writeFileSync(destinazione, `${intestazione}\n${righe.join('\n')}\n`);
console.log(`Scritte ${righe.length} istruzioni in ${destinazione}`);
