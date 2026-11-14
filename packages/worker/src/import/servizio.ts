// Import iniziale dal foglio del gruppo, riservato al webmaster.
//
// Flusso senza stato sul server, in due chiamate:
//   1. anteprimaImport(csv, mappatura) → piano completo + hash;
//   2. confermaImport(csv, mappatura, hash) → ricalcola il piano, controlla che
//      l'hash coincida (stesso file, stessa mappatura, stesso stato del
//      database) e applica tutto in un solo db.batch(), registro compreso.
//
// Il contenuto del CSV non viene mai scritto nei log né restituito per intero:
// l'anteprima mostra solo numero di riga, nome, unità ed errori per campo.

import { ErrorePpu } from '../errori.ts';
import type { Utente } from '../identita/index.ts';
import { puoAmministrare, richiedi } from '../servizi/permessi.ts';
import { nuovaOperazione } from '../servizi/registro.ts';
import { ErroreCsv, leggiCsv, type TabellaCsv } from './csv.ts';
import {
  type CampoAssociatoImportabile,
  colonneUsate,
  type Mappatura,
  TIPO_CAMPO_ASSOCIATO,
  TIPO_CAMPO_TUTORE,
  trasforma,
  validaMappatura,
} from './mappatura.ts';

/** Limiti per restare dentro i limiti di D1 su dimensione dei parametri e delle richieste. */
export const MAX_CARATTERI_CSV = 1_000_000;
export const MAX_RIGHE = 1000;

type Valore = string | number | null;

export interface TutorePiano {
  relazione: string;
  cognome: string;
  nome: string;
  codice_fiscale: Valore;
  cellulare: Valore;
  email: Valore;
  riceve_comunicazioni: number;
}

export interface RigaPiano {
  riga: number;
  stato: 'da_creare' | 'gia_presente' | 'errore';
  associato: Record<CampoAssociatoImportabile | 'unita_id', Valore>;
  tutori: TutorePiano[];
  note: { tipo: string; descrizione: string }[];
  errori: string[];
  avvisi: string[];
}

export interface Piano {
  righe: RigaPiano[];
  colonneIgnorate: string[];
}

export interface ContestoPiano {
  censimentiEsistenti: ReadonlySet<string>;
  codiciFiscaliEsistenti: ReadonlySet<string>;
  /** Data di oggi (AAAA-MM-GG), per l'archiviazione dei tutori dei maggiorenni. */
  oggi: string;
}

// ---------------------------------------------------------------------------
// Pianificazione (pura, senza database)
// ---------------------------------------------------------------------------

function indiceColonne(tabella: TabellaCsv): Map<string, number> {
  return new Map(tabella.intestazioni.map((h, i) => [h.toLowerCase(), i]));
}

export function pianifica(tabella: TabellaCsv, m: Mappatura, contesto: ContestoPiano): Piano {
  const indice = indiceColonne(tabella);
  const mancanti = colonneUsate(m).filter((c) => !indice.has(c.trim().toLowerCase()));
  if (mancanti.length > 0) {
    throw new ErrorePpu(
      'richiesta_non_valida',
      `Colonne della mappatura assenti nel file: ${mancanti.map((c) => `"${c}"`).join(', ')}.`,
    );
  }
  const usate = new Set(colonneUsate(m).map((c) => c.trim().toLowerCase()));
  const colonneIgnorate = tabella.intestazioni.filter(
    (h) => h !== '' && !usate.has(h.toLowerCase()),
  );

  const valoriUnita = new Map(
    Object.entries(m.unita?.valori ?? {}).map(([k, v]) => [k.trim().toLowerCase(), v]),
  );
  const censimentiVisti = new Map<string, number>();
  const cfVisti = new Map<string, number>();

  const righe = tabella.righe.map((r): RigaPiano => {
    const cella = (colonna: string): string =>
      r.valori[indice.get(colonna.trim().toLowerCase()) ?? -1] ?? '';
    const errori: string[] = [];
    const avvisi: string[] = [];

    const associato = { unita_id: null } as RigaPiano['associato'];
    for (const [campo, colonna] of Object.entries(m.associato) as [
      CampoAssociatoImportabile,
      string,
    ][]) {
      const esito = trasforma(cella(colonna), TIPO_CAMPO_ASSOCIATO[campo], m);
      if (!esito.ok) {
        errori.push(`${campo}: ${esito.errore}`);
        associato[campo] = null;
      } else {
        associato[campo] = esito.valore;
        if (esito.avviso) avvisi.push(`${campo}: ${esito.avviso}`);
      }
    }
    if (!associato.cognome) errori.push('cognome: obbligatorio');
    if (!associato.nome) errori.push('nome: obbligatorio');

    if (m.unita) {
      const grezzo = cella(m.unita.colonna).trim();
      if (grezzo === '') {
        avvisi.push('unita: mancante');
      } else {
        const id = valoriUnita.get(grezzo.toLowerCase());
        if (id) associato.unita_id = id;
        else errori.push('unita: valore non presente nella mappatura');
      }
    }

    const maggiorenne =
      typeof associato.data_nascita === 'string' &&
      associato.data_nascita <=
        `${Number(contesto.oggi.slice(0, 4)) - 18}${contesto.oggi.slice(4)}`;

    const tutori: TutorePiano[] = [];
    (m.tutori ?? []).forEach((t, i) => {
      const valori: Partial<Record<keyof TutorePiano, Valore>> = {};
      let presente = false;
      for (const [campo, colonna] of Object.entries(t.campi) as [
        keyof typeof TIPO_CAMPO_TUTORE,
        string,
      ][]) {
        const testo = cella(colonna);
        if (campo !== 'riceve_comunicazioni' && testo.trim() !== '') presente = true;
        const esito = trasforma(testo, TIPO_CAMPO_TUTORE[campo], m);
        if (!esito.ok) errori.push(`tutore ${i + 1} ${campo}: ${esito.errore}`);
        else {
          valori[campo] = esito.valore;
          if (esito.avviso) avvisi.push(`tutore ${i + 1} ${campo}: ${esito.avviso}`);
        }
      }
      if (!presente) return;
      if (!valori.nome) {
        avvisi.push(`tutore ${i + 1}: senza nome, non importato`);
        return;
      }
      let cognome = valori.cognome;
      if (!cognome) {
        cognome = associato.cognome;
        avvisi.push(`tutore ${i + 1}: cognome mancante, usato quello dell'associato`);
      }
      tutori.push({
        relazione: t.relazione,
        cognome: String(cognome ?? ''),
        nome: String(valori.nome),
        codice_fiscale: valori.codice_fiscale ?? null,
        cellulare: valori.cellulare ?? null,
        email: valori.email ?? null,
        riceve_comunicazioni: t.campi.riceve_comunicazioni
          ? Number(valori.riceve_comunicazioni ?? 0)
          : 1,
      });
    });
    if (maggiorenne && tutori.length > 0)
      avvisi.push('associato maggiorenne: tutori importati come archiviati');

    const note = (m.note ?? [])
      .map((n) => ({ tipo: n.tipo ?? 'nota', descrizione: cella(n.colonna).trim() }))
      .filter((n) => n.descrizione !== '');

    // Duplicati: nel database e dentro il file.
    const censimento =
      typeof associato.codice_censimento === 'string' ? associato.codice_censimento : null;
    const cf = typeof associato.codice_fiscale === 'string' ? associato.codice_fiscale : null;
    if (censimento && contesto.censimentiEsistenti.has(censimento)) {
      return {
        riga: r.numero,
        stato: 'gia_presente',
        associato,
        tutori,
        note,
        errori: [],
        avvisi: [],
      };
    }
    if (censimento) {
      const prima = censimentiVisti.get(censimento);
      if (prima) errori.push(`codice_censimento: duplicato della riga ${prima}`);
      else censimentiVisti.set(censimento, r.numero);
    }
    if (cf) {
      if (contesto.codiciFiscaliEsistenti.has(cf))
        errori.push('codice_fiscale: già presente in PPU');
      const prima = cfVisti.get(cf);
      if (prima) errori.push(`codice_fiscale: duplicato della riga ${prima}`);
      else cfVisti.set(cf, r.numero);
    }

    return {
      riga: r.numero,
      stato: errori.length > 0 ? 'errore' : 'da_creare',
      associato,
      tutori,
      note,
      errori,
      avvisi,
    };
  });
  return { righe, colonneIgnorate };
}

async function sha256(testo: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(testo));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hashPiano(piano: Piano): Promise<string> {
  return sha256(JSON.stringify({ versione: 1, righe: piano.righe }));
}

// ---------------------------------------------------------------------------
// Servizio
// ---------------------------------------------------------------------------

export interface RichiestaImport {
  csv: unknown;
  mappatura: unknown;
}

export interface Anteprima {
  hash: string;
  conteggi: {
    righe: number;
    daCreare: number;
    giaPresenti: number;
    conErrori: number;
    tutori: number;
    note: number;
  };
  colonneIgnorate: string[];
  /** Solo ciò che serve a controllare il piano: niente contatti né codici fiscali. */
  righe: {
    riga: number;
    stato: RigaPiano['stato'];
    cognome: Valore;
    nome: Valore;
    unita: Valore;
    tutori: number;
    note: number;
    errori: string[];
    avvisi: string[];
  }[];
}

export interface EsitoImport {
  operazione: string;
  associati: number;
  tutori: number;
  note: number;
  giaPresenti: number;
}

async function preparaPiano(db: D1Database, richiesta: RichiestaImport): Promise<Piano> {
  if (typeof richiesta.csv !== 'string') {
    throw new ErrorePpu('richiesta_non_valida', 'Il campo "csv" deve contenere il testo del file.');
  }
  if (richiesta.csv.length > MAX_CARATTERI_CSV) {
    throw new ErrorePpu('richiesta_non_valida', 'File troppo grande: dividilo in più import.');
  }
  const unita = await db.prepare('SELECT id FROM unita').all<{ id: string }>();
  const mappatura = validaMappatura(
    richiesta.mappatura,
    unita.results.map((u) => u.id),
  );
  let tabella: TabellaCsv;
  try {
    tabella = leggiCsv(richiesta.csv);
  } catch (e) {
    if (e instanceof ErroreCsv) throw new ErrorePpu('richiesta_non_valida', e.message);
    throw e;
  }
  if (tabella.righe.length > MAX_RIGHE) {
    throw new ErrorePpu('richiesta_non_valida', `Al massimo ${MAX_RIGHE} righe per import.`);
  }
  const [censimenti, cf] = await db.batch<{ v: string }>([
    db.prepare('SELECT codice_censimento AS v FROM associati WHERE codice_censimento IS NOT NULL'),
    db.prepare('SELECT codice_fiscale AS v FROM associati WHERE codice_fiscale IS NOT NULL'),
  ]);
  return pianifica(tabella, mappatura, {
    censimentiEsistenti: new Set((censimenti?.results ?? []).map((r) => r.v)),
    codiciFiscaliEsistenti: new Set((cf?.results ?? []).map((r) => r.v)),
    oggi: new Date().toISOString().slice(0, 10),
  });
}

export async function anteprimaImport(
  db: D1Database,
  utente: Utente,
  richiesta: RichiestaImport,
): Promise<Anteprima> {
  richiedi(puoAmministrare(utente), "L'import è riservato al webmaster.");
  const piano = await preparaPiano(db, richiesta);
  const daCreare = piano.righe.filter((r) => r.stato === 'da_creare');
  return {
    hash: await hashPiano(piano),
    conteggi: {
      righe: piano.righe.length,
      daCreare: daCreare.length,
      giaPresenti: piano.righe.filter((r) => r.stato === 'gia_presente').length,
      conErrori: piano.righe.filter((r) => r.stato === 'errore').length,
      tutori: daCreare.reduce((n, r) => n + r.tutori.length, 0),
      note: daCreare.reduce((n, r) => n + r.note.length, 0),
    },
    colonneIgnorate: piano.colonneIgnorate,
    righe: piano.righe.map((r) => ({
      riga: r.riga,
      stato: r.stato,
      cognome: r.associato.cognome,
      nome: r.associato.nome,
      unita: r.associato.unita_id,
      tutori: r.tutori.length,
      note: r.note.length,
      errori: r.errori,
      avvisi: r.avvisi,
    })),
  };
}

const CAMPI_ASSOCIATO_SQL = [
  'codice_censimento',
  'cognome',
  'nome',
  'data_nascita',
  'luogo_nascita',
  'codice_fiscale',
  'unita_id',
  'indirizzo',
  'cap',
  'comune',
  'provincia',
  'cellulare',
  'telefono_casa',
  'email',
  'informativa',
  'informativa_data',
  'consenso_2a',
  'consenso_2b',
  'consenso_2c',
  'note_privacy',
] as const;

const BOOLEANI = new Set(['informativa', 'consenso_2a', 'consenso_2b', 'consenso_2c']);

/** INSERT ... SELECT da un array JSON: una sola istruzione per tabella, qualunque sia il numero di righe. */
function insertDaJson(
  tabella: string,
  colonne: readonly string[],
  fisse: Record<string, string> = {},
): string {
  const tutte = [...colonne, ...Object.keys(fisse)];
  const valori = [...colonne.map((c) => `json_extract(value, '$.${c}')`), ...Object.values(fisse)];
  return `INSERT INTO ${tabella} (${tutte.join(', ')}) SELECT ${valori.join(', ')} FROM json_each(?1)`;
}

export async function confermaImport(
  db: D1Database,
  utente: Utente,
  richiesta: RichiestaImport & { hash: unknown },
): Promise<EsitoImport> {
  richiedi(puoAmministrare(utente), "L'import è riservato al webmaster.");
  if (typeof richiesta.hash !== 'string' || richiesta.hash === '') {
    throw new ErrorePpu('richiesta_non_valida', "Manca l'hash dell'anteprima.");
  }
  const piano = await preparaPiano(db, richiesta);
  if ((await hashPiano(piano)) !== richiesta.hash) {
    throw new ErrorePpu(
      'conflitto',
      "Il file, la mappatura o i dati sono cambiati dopo l'anteprima: ripeti l'anteprima.",
    );
  }
  const conErrori = piano.righe.filter((r) => r.stato === 'errore').length;
  if (conErrori > 0) {
    throw new ErrorePpu(
      'richiesta_non_valida',
      `${conErrori} righe hanno errori: correggi il file o la mappatura e ripeti l'anteprima.`,
    );
  }
  const daCreare = piano.righe.filter((r) => r.stato === 'da_creare');
  const giaPresenti = piano.righe.length - daCreare.length;
  const operazione = nuovaOperazione(utente.email, 'import');
  if (daCreare.length === 0) {
    return { operazione: operazione.id, associati: 0, tutori: 0, note: 0, giaPresenti };
  }

  const [massimi, anno] = await db.batch<
    { associati: number; tutori: number; progressione: number } & { id: number }
  >([
    db.prepare(
      `SELECT (SELECT coalesce(max(id), 0) FROM associati) AS associati,
              (SELECT coalesce(max(id), 0) FROM tutori) AS tutori,
              (SELECT coalesce(max(id), 0) FROM progressione) AS progressione`,
    ),
    db.prepare('SELECT id FROM anni_scout WHERE attuale = 1'),
  ]);
  const base = massimi?.results[0] ?? { associati: 0, tutori: 0, progressione: 0 };
  const annoAttuale = anno?.results[0]?.id ?? null;
  const adesso = new Date().toISOString();

  // Id espliciti: tutori e note devono puntare agli associati appena creati
  // nello stesso batch. Se nel frattempo qualcuno inserisce una riga, il batch
  // fallisce per chiave duplicata e non scrive nulla.
  let idAssociato = base.associati;
  let idTutore = base.tutori;
  let idNota = base.progressione;
  const associati: Record<string, Valore>[] = [];
  const storico: Record<string, Valore>[] = [];
  const tutori: Record<string, Valore>[] = [];
  const note: Record<string, Valore>[] = [];
  const registro: { entita: string; id: number; dopo: string }[] = [];
  const oggi = adesso.slice(0, 10);
  const soglia18 = `${Number(oggi.slice(0, 4)) - 18}${oggi.slice(4)}`;

  for (const r of daCreare) {
    idAssociato += 1;
    const a: Record<string, Valore> = { id: idAssociato };
    for (const c of CAMPI_ASSOCIATO_SQL) {
      a[c] = r.associato[c] ?? (BOOLEANI.has(c) ? 0 : null);
    }
    associati.push(a);
    registro.push({ entita: 'associati', id: idAssociato, dopo: JSON.stringify(a) });
    if (a.unita_id && annoAttuale !== null) {
      storico.push({ associato_id: idAssociato, unita_id: a.unita_id, anno_scout_id: annoAttuale });
    }
    const maggiorenne = typeof a.data_nascita === 'string' && a.data_nascita <= soglia18;
    for (const t of r.tutori) {
      idTutore += 1;
      const riga: Record<string, Valore> = {
        id: idTutore,
        associato_id: idAssociato,
        ...t,
        archiviato: maggiorenne ? 1 : 0,
        archiviato_il: maggiorenne ? adesso : null,
      };
      tutori.push(riga);
      registro.push({ entita: 'tutori', id: idTutore, dopo: JSON.stringify(riga) });
    }
    for (const n of r.note) {
      idNota += 1;
      const riga: Record<string, Valore> = {
        id: idNota,
        associato_id: idAssociato,
        tipo: n.tipo,
        descrizione: n.descrizione,
        anno_scout_id: annoAttuale,
      };
      note.push(riga);
      registro.push({ entita: 'progressione', id: idNota, dopo: JSON.stringify(riga) });
    }
  }

  const istruzioni: D1PreparedStatement[] = [
    db
      .prepare(insertDaJson('associati', ['id', ...CAMPI_ASSOCIATO_SQL]))
      .bind(JSON.stringify(associati)),
  ];
  if (storico.length > 0) {
    istruzioni.push(
      db
        .prepare(insertDaJson('storico_unita', ['associato_id', 'unita_id', 'anno_scout_id']))
        .bind(JSON.stringify(storico)),
    );
  }
  if (tutori.length > 0) {
    istruzioni.push(
      db
        .prepare(
          insertDaJson('tutori', [
            'id',
            'associato_id',
            'relazione',
            'cognome',
            'nome',
            'codice_fiscale',
            'cellulare',
            'email',
            'riceve_comunicazioni',
            'archiviato',
            'archiviato_il',
          ]),
        )
        .bind(JSON.stringify(tutori)),
    );
  }
  if (note.length > 0) {
    istruzioni.push(
      db
        .prepare(
          insertDaJson(
            'progressione',
            ['id', 'associato_id', 'tipo', 'descrizione', 'anno_scout_id'],
            {
              creato_da: '?2',
            },
          ),
        )
        .bind(JSON.stringify(note), utente.email),
    );
  }
  // Registro: una riga per entità creata (campo NULL = creazione dell'intera riga).
  // Le righe NON sono marcate "da_riportare": i dati arrivano dal foglio, che è
  // allineato a Buona Strada (la fonte ufficiale). Marcarle creerebbe centinaia
  // di finte modifiche da riportare per dati che Buona Strada ha già.
  istruzioni.push(
    db
      .prepare(
        `INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo, valore_prima, valore_dopo)
         SELECT ?2, ?3, 'import', json_extract(value, '$.entita'), CAST(json_extract(value, '$.id') AS TEXT),
                NULL, NULL, json_extract(value, '$.dopo')
           FROM json_each(?1)`,
      )
      .bind(JSON.stringify(registro), operazione.id, operazione.autoreEmail),
  );

  try {
    await db.batch(istruzioni);
  } catch (e) {
    if (e instanceof Error && /UNIQUE|PRIMARY KEY/i.test(e.message)) {
      throw new ErrorePpu(
        'conflitto',
        "I dati sono cambiati durante l'import: ripeti l'anteprima.",
      );
    }
    throw e;
  }
  return {
    operazione: operazione.id,
    associati: associati.length,
    tutori: tutori.length,
    note: note.length,
    giaPresenti,
  };
}
