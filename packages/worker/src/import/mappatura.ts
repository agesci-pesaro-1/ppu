// Mappatura delle colonne del foglio verso i campi di PPU.
//
// È un oggetto JSON (serializzabile, versionato) che ogni gruppo scrive per il
// proprio foglio: per ogni campo indica il nome della colonna. Le trasformazioni
// dei valori dipendono dal campo (date, sì/no, telefoni, ...), non dalla colonna.

import { CAMPI_ASSOCIATI, type CampoAssociato } from '../dominio/campi.ts';
import { ErrorePpu } from '../errori.ts';

/** Campi di `associati` importabili da una colonna. L'unità ha una sezione sua. */
export type CampoAssociatoImportabile = Exclude<CampoAssociato, 'unita_id'>;

export const CAMPI_TUTORE_IMPORTABILI = [
  'cognome',
  'nome',
  'codice_fiscale',
  'cellulare',
  'email',
  'riceve_comunicazioni',
] as const;
export type CampoTutoreImportabile = (typeof CAMPI_TUTORE_IMPORTABILI)[number];

export type FormatoData = 'gg/mm/aaaa' | 'aaaa-mm-gg';

export interface MappaturaTutore {
  /** Relazione con l'associato: 'madre', 'padre', 'tutore', ... */
  relazione: string;
  campi: Partial<Record<CampoTutoreImportabile, string>>;
}

export interface MappaturaNota {
  colonna: string;
  /** Tipo della voce di progressione libera; predefinito 'nota'. */
  tipo?: string;
}

export interface Mappatura {
  versione: 1;
  formatoData?: FormatoData;
  /** Campo di `associati` → nome della colonna. */
  associato: Partial<Record<CampoAssociatoImportabile, string>>;
  /** Colonna dell'unità e corrispondenza valore del foglio → id dell'unità. */
  unita?: { colonna: string; valori: Record<string, string> };
  tutori?: MappaturaTutore[];
  /** Colonne di note: diventano voci libere di progressione. */
  note?: MappaturaNota[];
  /** Valori letti come "sì" (oltre ai predefiniti). */
  valoriSi?: string[];
  /** Valori letti come "no" (oltre ai predefiniti). */
  valoriNo?: string[];
}

export const MAX_TUTORI = 4;

const CAMPI_IMPORTABILI = Object.keys(CAMPI_ASSOCIATI).filter(
  (c) => c !== 'unita_id',
) as CampoAssociatoImportabile[];

// ---------------------------------------------------------------------------
// Validazione
// ---------------------------------------------------------------------------

const errore = (messaggio: string): never => {
  throw new ErrorePpu('richiesta_non_valida', `Mappatura non valida: ${messaggio}`);
};

const eOggetto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const eTesto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function colonne(v: unknown, dove: string, ammessi: readonly string[]): Record<string, string> {
  if (!eOggetto(v)) return errore(`"${dove}" deve essere un oggetto campo → colonna.`);
  for (const [campo, colonna] of Object.entries(v)) {
    if (!ammessi.includes(campo)) errore(`campo sconosciuto "${campo}" in "${dove}".`);
    if (!eTesto(colonna)) errore(`la colonna di "${dove}.${campo}" deve essere un testo.`);
  }
  return v as Record<string, string>;
}

function elencoTesti(v: unknown, dove: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    return errore(`"${dove}" deve essere un elenco di testi.`);
  }
  return v as string[];
}

/** Controlla la forma della mappatura e che le unità indicate esistano. */
export function validaMappatura(valore: unknown, unitaEsistenti: readonly string[]): Mappatura {
  if (!eOggetto(valore)) return errore('deve essere un oggetto JSON.');
  if (valore.versione !== 1) errore('"versione" deve essere 1.');
  const formatoData = valore.formatoData;
  if (formatoData !== undefined && formatoData !== 'gg/mm/aaaa' && formatoData !== 'aaaa-mm-gg') {
    errore('"formatoData" deve essere "gg/mm/aaaa" o "aaaa-mm-gg".');
  }
  const associato = colonne(valore.associato, 'associato', CAMPI_IMPORTABILI);
  if (!associato.cognome || !associato.nome) {
    errore('"associato" deve indicare almeno le colonne di cognome e nome.');
  }

  const m: Mappatura = { versione: 1, associato };
  if (formatoData !== undefined) m.formatoData = formatoData as FormatoData;

  if (valore.unita !== undefined) {
    const u = valore.unita;
    if (!eOggetto(u) || !eTesto(u.colonna) || !eOggetto(u.valori)) {
      return errore('"unita" deve avere "colonna" e "valori" (valore del foglio → id unità).');
    }
    for (const [da, a] of Object.entries(u.valori)) {
      if (typeof a !== 'string' || !unitaEsistenti.includes(a)) {
        errore(`l'unità "${String(a)}" (per il valore "${da}") non esiste.`);
      }
    }
    m.unita = { colonna: u.colonna, valori: u.valori as Record<string, string> };
  }

  if (valore.tutori !== undefined) {
    if (!Array.isArray(valore.tutori)) return errore('"tutori" deve essere un elenco.');
    if (valore.tutori.length > MAX_TUTORI) errore(`al massimo ${MAX_TUTORI} tutori per riga.`);
    m.tutori = valore.tutori.map((t, i) => {
      if (!eOggetto(t) || !eTesto(t.relazione)) {
        return errore(`il tutore ${i + 1} deve avere "relazione" e "campi".`);
      }
      const campi = colonne(t.campi, `tutori[${i}].campi`, CAMPI_TUTORE_IMPORTABILI);
      if (!campi.nome) errore(`il tutore ${i + 1} deve indicare almeno la colonna del nome.`);
      return { relazione: t.relazione.trim(), campi };
    });
  }

  if (valore.note !== undefined) {
    if (!Array.isArray(valore.note)) return errore('"note" deve essere un elenco.');
    m.note = valore.note.map((n, i) => {
      if (!eOggetto(n) || !eTesto(n.colonna))
        return errore(`la nota ${i + 1} deve avere "colonna".`);
      if (n.tipo !== undefined && !eTesto(n.tipo))
        errore(`il tipo della nota ${i + 1} non è valido.`);
      return n.tipo === undefined
        ? { colonna: n.colonna }
        : { colonna: n.colonna, tipo: n.tipo as string };
    });
  }

  const valoriSi = elencoTesti(valore.valoriSi, 'valoriSi');
  if (valoriSi) m.valoriSi = valoriSi;
  const valoriNo = elencoTesti(valore.valoriNo, 'valoriNo');
  if (valoriNo) m.valoriNo = valoriNo;
  return m;
}

/** Tutte le colonne citate dalla mappatura. */
export function colonneUsate(m: Mappatura): string[] {
  const elenco: string[] = Object.values(m.associato);
  if (m.unita) elenco.push(m.unita.colonna);
  for (const t of m.tutori ?? []) elenco.push(...Object.values(t.campi));
  for (const n of m.note ?? []) elenco.push(n.colonna);
  return [...new Set(elenco)];
}

// ---------------------------------------------------------------------------
// Trasformazioni dei valori
// ---------------------------------------------------------------------------

export type Esito<T> = { ok: true; valore: T; avviso?: string } | { ok: false; errore: string };

const SI = ['sì', 'si', 's', 'x', '1', 'true', 'vero', 'yes', 'y'];
const NO = ['no', 'n', '0', 'false', 'falso'];

export function dataIso(testo: string, formato: FormatoData): Esito<string> {
  const t = testo.trim();
  let a: number;
  let m: number;
  let g: number;
  if (formato === 'gg/mm/aaaa') {
    const r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
    if (!r) return { ok: false, errore: 'data non valida (atteso gg/mm/aaaa)' };
    g = Number(r[1]);
    m = Number(r[2]);
    a = Number(r[3]);
  } else {
    const r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    if (!r) return { ok: false, errore: 'data non valida (atteso aaaa-mm-gg)' };
    a = Number(r[1]);
    m = Number(r[2]);
    g = Number(r[3]);
  }
  const d = new Date(Date.UTC(a, m - 1, g));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== g) {
    return { ok: false, errore: 'data inesistente' };
  }
  if (a < 1900 || a > 2100) return { ok: false, errore: 'anno fuori intervallo' };
  return { ok: true, valore: d.toISOString().slice(0, 10) };
}

export function siNo(
  testo: string,
  valoriSi: readonly string[] = [],
  valoriNo: readonly string[] = [],
): Esito<0 | 1> {
  const t = testo.trim().toLowerCase();
  if ([...SI, ...valoriSi.map((v) => v.toLowerCase())].includes(t)) return { ok: true, valore: 1 };
  if (t === '' || [...NO, ...valoriNo.map((v) => v.toLowerCase())].includes(t)) {
    return { ok: true, valore: 0 };
  }
  // Valore ambiguo: si assume "no", la scelta più prudente per un consenso.
  return { ok: true, valore: 0, avviso: 'valore sì/no non riconosciuto, considerato "no"' };
}

/** Normalizza un numero di telefono: solo cifre, prefisso internazionale. */
export function telefono(testo: string): Esito<string> {
  let t = testo.trim().replace(/[\s.\-/()]/g, '');
  if (t.startsWith('00')) t = `+${t.slice(2)}`;
  if (!/^\+?\d+$/.test(t)) return { ok: false, errore: 'numero di telefono non valido' };
  if (!t.startsWith('+')) t = `+39${t}`;
  const cifre = t.length - 1;
  if (cifre < 8 || cifre > 15)
    return { ok: true, valore: t, avviso: 'numero di telefono sospetto' };
  return { ok: true, valore: t };
}

export function email(testo: string): Esito<string> {
  const t = testo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return { ok: true, valore: t, avviso: 'email dal formato sospetto' };
  }
  return { ok: true, valore: t };
}

export function codiceFiscale(testo: string): Esito<string> {
  const t = testo.trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{16}$/.test(t)) {
    return { ok: true, valore: t, avviso: 'codice fiscale dal formato sospetto' };
  }
  return { ok: true, valore: t };
}

export function cap(testo: string): Esito<string> {
  const t = testo.trim();
  // Un foglio di calcolo può aver tolto lo zero iniziale.
  if (/^\d{4}$/.test(t))
    return { ok: true, valore: t.padStart(5, '0'), avviso: 'CAP completato con lo zero iniziale' };
  if (!/^\d{5}$/.test(t)) return { ok: true, valore: t, avviso: 'CAP dal formato sospetto' };
  return { ok: true, valore: t };
}

export type TipoCampo =
  | 'testo'
  | 'data'
  | 'si_no'
  | 'telefono'
  | 'email'
  | 'codice_fiscale'
  | 'cap'
  | 'maiuscolo';

export const TIPO_CAMPO_ASSOCIATO: Record<CampoAssociatoImportabile, TipoCampo> = {
  codice_censimento: 'testo',
  cognome: 'testo',
  nome: 'testo',
  data_nascita: 'data',
  luogo_nascita: 'testo',
  codice_fiscale: 'codice_fiscale',
  indirizzo: 'testo',
  cap: 'cap',
  comune: 'testo',
  provincia: 'maiuscolo',
  cellulare: 'telefono',
  telefono_casa: 'telefono',
  email: 'email',
  informativa: 'si_no',
  informativa_data: 'data',
  consenso_2a: 'si_no',
  consenso_2b: 'si_no',
  consenso_2c: 'si_no',
  note_privacy: 'testo',
};

export const TIPO_CAMPO_TUTORE: Record<CampoTutoreImportabile, TipoCampo> = {
  cognome: 'testo',
  nome: 'testo',
  codice_fiscale: 'codice_fiscale',
  cellulare: 'telefono',
  email: 'email',
  riceve_comunicazioni: 'si_no',
};

/** Applica la trasformazione del tipo di campo. Un valore vuoto diventa null (o 0 per sì/no). */
export function trasforma(
  testo: string,
  tipo: TipoCampo,
  m: Pick<Mappatura, 'formatoData' | 'valoriSi' | 'valoriNo'>,
): Esito<string | number | null> {
  const t = testo.trim();
  if (tipo === 'si_no') return siNo(t, m.valoriSi, m.valoriNo);
  if (t === '') return { ok: true, valore: null };
  switch (tipo) {
    case 'data':
      return dataIso(t, m.formatoData ?? 'gg/mm/aaaa');
    case 'telefono':
      return telefono(t);
    case 'email':
      return email(t);
    case 'codice_fiscale':
      return codiceFiscale(t);
    case 'cap':
      return cap(t);
    case 'maiuscolo':
      return { ok: true, valore: t.toUpperCase() };
    default:
      return { ok: true, valore: t.replace(/\s+/g, ' ') };
  }
}
