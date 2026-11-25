// FAKE data for previews, E2E tests and the public demo. No SQL file is kept in
// the repository: tests import `demoSeed`, the pipeline generates the SQL on demand.
// Usage: node scripts/demo-seed.ts > demo.sql
//
// Assumes the units of config/gruppo.esempio.json.
// Fully deterministic: the script always produces the same SQL.
// No real data: emails on example.org, tax codes prefixed with DEMO,
// made-up town and province.

type Value = string | number | null;

const DOMAIN = 'example.org';
const TOWN = 'Valdifiori';
const PROVINCE = 'XX';
const POSTCODE = '00000';

const statements: string[] = [];

function sql(v: Value): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${v.replaceAll("'", "''")}'`;
}

function insert(table: string, values: Record<string, Value>): void {
  const columns = Object.keys(values);
  statements.push(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => sql(values[c] ?? null)).join(', ')});`,
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
// Scout years
// ---------------------------------------------------------------------------

const PREVIOUS_YEAR = 1;
const CURRENT_YEAR = 2;
const CURRENT_YEAR_START = '2026-10-04';
insert('anni_scout', {
  id: PREVIOUS_YEAR,
  nome: '2025/26',
  data_inizio: '2025-10-05',
  attuale: 0,
  creato_da: 'sistema',
});
insert('anni_scout', {
  id: CURRENT_YEAR,
  nome: '2026/27',
  data_inizio: CURRENT_YEAR_START,
  attuale: 1,
  creato_da: 'sistema',
});

const yearOf = (date: string): number =>
  date >= CURRENT_YEAR_START ? CURRENT_YEAR : PREVIOUS_YEAR;

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

interface Person {
  lastName: string;
  firstName: string;
  birthDate: string;
  unit: string;
  previousUnit?: string;
  consents?: [number, number, number];
}

const people: Person[] = [
  // Lupetti
  { lastName: 'Arcangeli', firstName: 'Tommaso', birthDate: '2017-03-14', unit: 'lupetti' },
  {
    lastName: 'Bellandi',
    firstName: 'Leonardo',
    birthDate: '2016-07-02',
    unit: 'lupetti',
    previousUnit: 'lupetti',
  },
  { lastName: 'Cardelli', firstName: 'Matteo', birthDate: '2018-01-21', unit: 'lupetti' },
  {
    lastName: 'Donati',
    firstName: 'Pietro',
    birthDate: '2016-11-09',
    unit: 'lupetti',
    previousUnit: 'lupetti',
    consents: [1, 0, 1],
  },
  {
    lastName: 'Ercolani',
    firstName: 'Samuele',
    birthDate: '2017-05-30',
    unit: 'lupetti',
    previousUnit: 'lupetti',
  },
  {
    lastName: 'Fabbrini',
    firstName: 'Davide',
    birthDate: '2015-12-12',
    unit: 'lupetti',
    previousUnit: 'lupetti',
  },
  // Coccinelle
  { lastName: 'Galassi', firstName: 'Sofia', birthDate: '2017-02-18', unit: 'coccinelle' },
  {
    lastName: 'Ioli',
    firstName: 'Aurora',
    birthDate: '2016-09-25',
    unit: 'coccinelle',
    previousUnit: 'coccinelle',
  },
  { lastName: 'Lancisi', firstName: 'Giulia', birthDate: '2018-04-03', unit: 'coccinelle' },
  {
    lastName: 'Mariotti',
    firstName: 'Ginevra',
    birthDate: '2016-06-14',
    unit: 'coccinelle',
    previousUnit: 'coccinelle',
    consents: [0, 0, 0],
  },
  {
    lastName: 'Arcangeli',
    firstName: 'Emma',
    birthDate: '2015-10-27',
    unit: 'coccinelle',
    previousUnit: 'coccinelle',
  },
  { lastName: 'Nardini', firstName: 'Beatrice', birthDate: '2017-08-08', unit: 'coccinelle' },
  // Esploratori
  {
    lastName: 'Orsolini',
    firstName: 'Lorenzo',
    birthDate: '2013-01-15',
    unit: 'esploratori',
    previousUnit: 'esploratori',
  },
  {
    lastName: 'Pacini',
    firstName: 'Marco',
    birthDate: '2012-04-22',
    unit: 'esploratori',
    previousUnit: 'esploratori',
  },
  {
    lastName: 'Quercioli',
    firstName: 'Andrea',
    birthDate: '2014-09-03',
    unit: 'esploratori',
    previousUnit: 'lupetti',
  },
  {
    lastName: 'Rinaldi',
    firstName: 'Giacomo',
    birthDate: '2011-06-30',
    unit: 'esploratori',
    previousUnit: 'esploratori',
  },
  {
    lastName: 'Bellandi',
    firstName: 'Filippo',
    birthDate: '2013-12-01',
    unit: 'esploratori',
    previousUnit: 'esploratori',
  },
  {
    lastName: 'Santucci',
    firstName: 'Riccardo',
    birthDate: '2014-03-19',
    unit: 'esploratori',
    previousUnit: 'lupetti',
  },
  // Guide
  {
    lastName: 'Tarducci',
    firstName: 'Giulia',
    birthDate: '2012-02-11',
    unit: 'guide',
    previousUnit: 'guide',
  },
  {
    lastName: 'Ugolini',
    firstName: 'Chiara',
    birthDate: '2013-07-07',
    unit: 'guide',
    previousUnit: 'guide',
    consents: [1, 1, 0],
  },
  {
    lastName: 'Vannucci',
    firstName: 'Martina',
    birthDate: '2014-05-16',
    unit: 'guide',
    previousUnit: 'coccinelle',
  },
  {
    lastName: 'Zanetti',
    firstName: 'Alice',
    birthDate: '2011-10-29',
    unit: 'guide',
    previousUnit: 'guide',
  },
  {
    lastName: 'Galassi',
    firstName: 'Elena',
    birthDate: '2012-12-24',
    unit: 'guide',
    previousUnit: 'guide',
  },
  {
    lastName: 'Benvenuti',
    firstName: 'Anna',
    birthDate: '2014-01-08',
    unit: 'guide',
    previousUnit: 'coccinelle',
  },
  // Noviziato
  {
    lastName: 'Calvelli',
    firstName: 'Nicola',
    birthDate: '2010-03-02',
    unit: 'noviziato',
    previousUnit: 'esploratori',
  },
  {
    lastName: 'Dini',
    firstName: 'Sara',
    birthDate: '2010-08-19',
    unit: 'noviziato',
    previousUnit: 'guide',
  },
  {
    lastName: 'Orsolini',
    firstName: 'Irene',
    birthDate: '2009-11-30',
    unit: 'noviziato',
    previousUnit: 'guide',
  },
  // Clan
  {
    lastName: 'Ferretti',
    firstName: 'Gabriele',
    birthDate: '2008-05-05',
    unit: 'clan',
    previousUnit: 'clan',
  },
  {
    lastName: 'Giorgini',
    firstName: 'Francesca',
    birthDate: '2007-09-12',
    unit: 'clan',
    previousUnit: 'clan',
  },
  {
    lastName: 'Lombardi',
    firstName: 'Edoardo',
    birthDate: '2009-02-27',
    unit: 'clan',
    previousUnit: 'noviziato',
  },
  {
    lastName: 'Morandi',
    firstName: 'Camilla',
    birthDate: '2006-12-03',
    unit: 'clan',
    previousUnit: 'clan',
  },
  {
    lastName: 'Paoletti',
    firstName: 'Luca',
    birthDate: '2008-10-15',
    unit: 'clan',
    previousUnit: 'clan',
  },
  // Co.Ca. (leaders)
  {
    lastName: 'Rossetti',
    firstName: 'Paola',
    birthDate: '1985-04-10',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Arcangeli',
    firstName: 'Stefano',
    birthDate: '1982-06-21',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Bianconi',
    firstName: 'Laura',
    birthDate: '1990-01-30',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Cecchini',
    firstName: 'Michele',
    birthDate: '1995-09-09',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Del Bianco',
    firstName: 'Valentina',
    birthDate: '1998-03-17',
    unit: 'coca',
    previousUnit: 'clan',
  },
  {
    lastName: 'Esposti',
    firstName: 'Federico',
    birthDate: '1993-11-11',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Fiorani',
    firstName: 'Elisa',
    birthDate: '1988-07-25',
    unit: 'coca',
    previousUnit: 'coca',
  },
  {
    lastName: 'Gentili',
    firstName: 'Roberto',
    birthDate: '1979-02-14',
    unit: 'coca',
    previousUnit: 'coca',
  },
];

const STREETS = [
  'Via dei Pini',
  'Via delle Rose',
  'Viale dei Tigli',
  'Piazza del Sole',
  'Via del Bosco',
];
const ids = new Map<string, number>();
const keyOf = (p: Person): string => `${p.lastName} ${p.firstName}`;

people.forEach((p, i) => {
  const n = i + 1;
  ids.set(keyOf(p), n);
  const adult = p.birthDate < '2008-11-12';
  const [c2a, c2b, c2c] = p.consents ?? [1, 1, 1];
  insert('associati', {
    id: n,
    codice_censimento: String(900000 + n),
    cognome: p.lastName,
    nome: p.firstName,
    data_nascita: p.birthDate,
    luogo_nascita: TOWN,
    codice_fiscale: `DEMO${String(n).padStart(12, '0')}`,
    unita_id: p.unit,
    indirizzo: `${STREETS[n % STREETS.length]} ${n}`,
    cap: POSTCODE,
    comune: TOWN,
    provincia: PROVINCE,
    cellulare: adult ? `+39 300 000 ${String(n).padStart(4, '0')}` : null,
    email: adult ? `${slug(p.firstName)}.${slug(p.lastName)}@${DOMAIN}` : null,
    riceve_comunicazioni: n % 11 === 0 ? 0 : 1,
    informativa: 1,
    informativa_data: '2025-10-05',
    consenso_2a: c2a,
    consenso_2b: c2b,
    consenso_2c: c2c,
    note_privacy: null,
  });
  insert('storico_unita', { associato_id: n, unita_id: p.unit, anno_scout_id: CURRENT_YEAR });
  if (p.previousUnit) {
    insert('storico_unita', {
      associato_id: n,
      unita_id: p.previousUnit,
      anno_scout_id: PREVIOUS_YEAR,
    });
  }
});

// A former member, archived.
const archivedId = people.length + 1;
insert('associati', {
  id: archivedId,
  cognome: 'Ricci',
  nome: 'Alessio',
  data_nascita: '2005-04-04',
  luogo_nascita: TOWN,
  unita_id: 'clan',
  comune: TOWN,
  provincia: PROVINCE,
  informativa: 1,
  stato: 'archiviato',
  archiviato_il: '2026-10-04T00:00:00.000Z',
});
insert('storico_unita', {
  associato_id: archivedId,
  unita_id: 'clan',
  anno_scout_id: PREVIOUS_YEAR,
});

const idOf = (key: string): number => {
  const n = ids.get(key);
  if (n === undefined) throw new Error(`Unknown demo member: ${key}`);
  return n;
};

// ---------------------------------------------------------------------------
// Guardians
// ---------------------------------------------------------------------------

let guardianId = 0;
for (const p of people) {
  if (p.unit === 'coca') continue;
  const n = idOf(keyOf(p));
  const ofAge = p.birthDate <= '2008-11-12';
  const archivedAt = ofAge
    ? `${String(Number(p.birthDate.slice(0, 4)) + 18)}${p.birthDate.slice(4)}T00:00:00.000Z`
    : null;
  const parents: [string, string][] = [
    ['madre', ['Maria', 'Giovanna', 'Silvia', 'Monica', 'Cristina'][n % 5] ?? 'Maria'],
    ['padre', ['Giuseppe', 'Alberto', 'Massimo', 'Paolo', 'Fabio'][n % 5] ?? 'Paolo'],
  ];
  // One family with a single registered guardian.
  const list = n % 7 === 0 ? parents.slice(0, 1) : parents;
  for (const [role, firstName] of list) {
    guardianId += 1;
    // The Arcangeli father is also a leader (Stefano Arcangeli).
    const linked =
      p.lastName === 'Arcangeli' && role === 'padre' ? idOf('Arcangeli Stefano') : null;
    insert('tutori', {
      id: guardianId,
      associato_id: n,
      ruolo: role,
      cognome: linked ? 'Arcangeli' : p.lastName,
      nome: linked ? 'Stefano' : firstName,
      codice_fiscale: `DEMOT${String(guardianId).padStart(11, '0')}`,
      cellulare: `+39 301 000 ${String(guardianId).padStart(4, '0')}`,
      email: `${slug(firstName)}.${slug(p.lastName)}.${guardianId}@${DOMAIN}`,
      associato_collegato_id: linked,
      archiviato: ofAge ? 1 : 0,
      archiviato_il: archivedAt,
    });
  }
}

// ---------------------------------------------------------------------------
// Relationships (always with the inverse)
// ---------------------------------------------------------------------------

const INVERSE: Record<string, string> = {
  genitore: 'figlio',
  figlio: 'genitore',
  zio: 'nipote',
  nipote: 'zio',
};
function relationship(a: string, b: string, type: string): void {
  insert('relazioni', { associato_id: idOf(a), altro_associato_id: idOf(b), tipo: type });
  insert('relazioni', {
    associato_id: idOf(b),
    altro_associato_id: idOf(a),
    tipo: INVERSE[type] ?? type,
  });
}
relationship('Arcangeli Stefano', 'Arcangeli Tommaso', 'genitore');
relationship('Arcangeli Stefano', 'Arcangeli Emma', 'genitore');
relationship('Arcangeli Tommaso', 'Arcangeli Emma', 'fratello');
relationship('Bellandi Leonardo', 'Bellandi Filippo', 'fratello');
relationship('Galassi Sofia', 'Galassi Elena', 'fratello');
relationship('Orsolini Lorenzo', 'Orsolini Irene', 'fratello');
relationship('Rossetti Paola', 'Morandi Camilla', 'zio');

// ---------------------------------------------------------------------------
// Users: one per role, linked to the leaders' member records
// ---------------------------------------------------------------------------

interface User {
  email: string;
  member?: string;
  units?: string[];
  fullAccess?: number;
  buonaStrada?: number;
  webmaster?: number;
  betaTester?: number;
  excluded?: number;
}
const users: User[] = [
  { email: 'capo.lupetti', member: 'Cecchini Michele', units: ['lupetti'] },
  { email: 'capo.coccinelle', member: 'Del Bianco Valentina', units: ['coccinelle'] },
  {
    email: 'capo.eg',
    member: 'Esposti Federico',
    units: ['esploratori', 'guide'],
    betaTester: 1,
  },
  { email: 'capo.rs', member: 'Fiorani Elisa', units: ['noviziato', 'clan'], buonaStrada: 1 },
  { email: 'capogruppo', member: 'Rossetti Paola', fullAccess: 1, buonaStrada: 1 },
  { email: 'genitore.capo', member: 'Arcangeli Stefano', units: ['esploratori'] },
  { email: 'webmaster', member: 'Gentili Roberto', webmaster: 1, betaTester: 1 },
  // Read-only leader: a row without units or roles.
  { email: 'capo.coca', member: 'Bianconi Laura' },
  { email: 'segreteria', excluded: 1 },
];
for (const u of users) {
  const email = `${u.email}@${DOMAIN}`;
  insert('utenti', {
    email,
    associato_id: u.member ? idOf(u.member) : null,
    accesso_completo: u.fullAccess ?? 0,
    buona_strada: u.buonaStrada ?? 0,
    webmaster: u.webmaster ?? 0,
    beta_tester: u.betaTester ?? 0,
    escluso: u.excluded ?? 0,
  });
  for (const unit of u.units ?? []) insert('utenti_unita', { email, unita_id: unit });
}
// nuovo.capo@example.org has no row in utenti: a domain account not enabled yet.

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const tags: [number, string, string, string, number | null, number][] = [
  // id, name, type, status, year, exclusive
  [1, 'Aquile', 'squadriglia', 'ufficiale', CURRENT_YEAR, 1],
  [2, 'Volpi', 'squadriglia', 'ufficiale', CURRENT_YEAR, 1],
  [3, 'Pantere', 'squadriglia', 'ufficiale', CURRENT_YEAR, 1],
  [4, 'Gazzelle', 'squadriglia', 'ufficiale', CURRENT_YEAR, 1],
  [5, 'Sestiglia dei Grigi', 'sestiglia', 'ufficiale', CURRENT_YEAR, 1],
  [6, 'Sestiglia dei Neri', 'sestiglia', 'ufficiale', CURRENT_YEAR, 1],
  [7, 'Consiglio degli Anziani', 'varie', 'ufficiale', CURRENT_YEAR, 0],
  [8, 'Campo invernale 2026', 'varie', 'libero', CURRENT_YEAR, 0],
  [9, 'campo invernale', 'varie', 'libero', CURRENT_YEAR, 0], // duplicate to merge (webmaster review demo)
  [10, 'Capo squadriglia', 'varie', 'ufficiale', CURRENT_YEAR, 0],
  [11, 'Servizio mensa', 'varie', 'libero', null, 0],
];
for (const [tagId, name, type, status, year, exclusive] of tags) {
  insert('tag', {
    id: tagId,
    nome: name,
    tipo_id: type,
    stato: status,
    anno_scout_id: year,
    esclusivo: exclusive,
    creato_da: `capo.eg@${DOMAIN}`,
  });
}
const assignments: [string, number][] = [
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
for (const [who, tagId] of assignments) {
  insert('associati_tag', {
    associato_id: idOf(who),
    tag_id: tagId,
    anno_scout_id: tagId === 11 ? null : CURRENT_YEAR,
    creato_da: `capo.eg@${DOMAIN}`,
  });
}

// ---------------------------------------------------------------------------
// Personal progression
// ---------------------------------------------------------------------------

// Catalogue ids depend on the base seed: they are resolved by name, in the
// most recent version of the Regolamento.
function catalogueEntry(
  who: string,
  branch: string,
  type: string,
  name: string,
  date: string,
): void {
  statements.push(
    `INSERT INTO progressione (associato_id, catalogo_id, data, anno_scout_id, creato_da) SELECT ${idOf(who)}, id, ${sql(date)}, ${yearOf(date)}, ${sql(`capo.eg@${DOMAIN}`)} FROM catalogo_progressione WHERE versione = (SELECT max(data) FROM versioni_regolamento) AND branca_id = ${sql(branch)} AND tipo = ${sql(type)} AND nome = ${sql(name)};`,
  );
}
catalogueEntry('Orsolini Lorenzo', 'eg', 'tappa', 'Promessa', '2025-02-23');
catalogueEntry('Orsolini Lorenzo', 'eg', 'tappa', 'Scoperta', '2025-06-15');
catalogueEntry('Pacini Marco', 'eg', 'tappa', 'Promessa', '2024-04-21');
catalogueEntry('Pacini Marco', 'eg', 'tappa', 'Competenza', '2026-05-10');
catalogueEntry('Tarducci Giulia', 'eg', 'tappa', 'Promessa', '2024-03-17');
catalogueEntry('Zanetti Alice', 'eg', 'tappa', 'Responsabilità', '2026-10-25');
catalogueEntry('Fabbrini Davide', 'lc', 'tappa', 'Promessa lupetto', '2024-12-08');
catalogueEntry('Morandi Camilla', 'rs', 'tappa', 'Salita in clan/fuoco', '2025-10-05');
catalogueEntry('Rinaldi Giacomo', 'eg', 'specialita', 'Topografo', '2026-03-01');
catalogueEntry('Fabbrini Davide', 'lc', 'tappa', 'Lupo della legge', '2025-05-18');
const freeEntries: [string, string, string, string][] = [
  ['Ugolini Chiara', 'specialita', 'Specialità di cuciniera', '2026-04-12'],
  ['Arcangeli Emma', 'nota', 'Ha guidato il gioco della festa di Natale', '2025-12-20'],
];
for (const [who, type, description, date] of freeEntries) {
  insert('progressione', {
    associato_id: idOf(who),
    tipo: type,
    descrizione: description,
    data: date,
    anno_scout_id: yearOf(date),
    creato_da: `capo.eg@${DOMAIN}`,
  });
}

// ---------------------------------------------------------------------------
// Meetings and attendance
// ---------------------------------------------------------------------------

let meetingId = 0;
const meetings: [string, string, string][] = [
  ['lupetti', '2026-10-10', 'riunione'],
  ['lupetti', '2026-10-17', 'riunione'],
  ['esploratori', '2026-10-11', 'riunione'],
  ['guide', '2026-10-11', 'riunione'],
  ['esploratori', '2026-10-24', 'uscita'],
  ['clan', '2026-11-21', 'riunione'], // in the future: absences reported in advance
];
for (const [unit, date, type] of meetings) {
  meetingId += 1;
  insert('riunioni', {
    id: meetingId,
    unita_id: unit,
    anno_scout_id: CURRENT_YEAR,
    data: date,
    tipo: type,
    creato_da: `capo.eg@${DOMAIN}`,
  });
  const members = people.filter((p) => p.unit === unit);
  members.forEach((p, i) => {
    const future = date > '2026-11-12';
    if (future && i > 0) return; // a single absence reported in advance
    const status = future
      ? 'giustificato'
      : (meetingId + i) % 5 === 0
        ? 'assente'
        : (meetingId + i) % 7 === 0
          ? 'giustificato'
          : 'presente';
    insert('presenze', {
      riunione_id: meetingId,
      associato_id: idOf(keyOf(p)),
      stato: status,
      motivazione: status === 'giustificato' ? 'Impegno di famiglia' : null,
      registrato_da: `capo.eg@${DOMAIN}`,
    });
  });
}

// ---------------------------------------------------------------------------
// Change log: personal data changes to copy to Buona Strada
// ---------------------------------------------------------------------------

const changes: [string, string, string, string, string, string, string | null][] = [
  // operation, author, member, field, before, after, confirmed by
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
  ['demo-op-3', 'capo.lupetti', 'Cardelli Matteo', 'luogo_nascita', TOWN, 'Altrove', 'capo.rs'],
];
for (const [operation, author, who, field, before, after, confirmedBy] of changes) {
  insert('modifiche', {
    operazione: operation,
    autore_email: `${author}@${DOMAIN}`,
    data: '2026-11-02T18:30:00.000Z',
    canale: 'pwa',
    entita: 'associati',
    entita_id: String(idOf(who)),
    campo: field,
    valore_prima: JSON.stringify(before),
    valore_dopo: JSON.stringify(after),
    stato_buona_strada: confirmedBy ? 'riportata' : 'da_riportare',
    confermata_da: confirmedBy ? `${confirmedBy}@${DOMAIN}` : null,
    confermata_il: confirmedBy ? '2026-11-04T09:00:00.000Z' : null,
  });
}

// ---------------------------------------------------------------------------

const header = `-- FAKE data for previews, E2E tests and the demo. Never in production.
-- Generated by scripts/demo-seed.ts.
-- Requires the migrations, the example configuration and seed/base.
`;
export const demoSeed = `${header}\n${statements.join('\n')}\n`;

if (import.meta.main) process.stdout.write(demoSeed);
