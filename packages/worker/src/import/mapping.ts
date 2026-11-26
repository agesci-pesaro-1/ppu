// Mapping from the sheet's columns to PPU fields.
//
// It is a JSON object (serialisable, versioned) that each group writes for its
// own sheet: for each field it names the column. Its keys follow the database
// schema, like the group configuration file. Value transformations depend on
// the field (dates, yes/no, phone numbers, ...), not on the column.
// Messages are shown to the user, so they are in Italian.

import { guardians } from '../db/schema.ts';
import { MEMBER_FIELDS, type MemberField } from '../domain/fields.ts';
import { AppError } from '../errors.ts';

/** `associati` fields importable from a column. The unit has its own section. */
export type ImportableMemberField = Exclude<MemberField, 'unita_id'>;

export const IMPORTABLE_GUARDIAN_FIELDS = [
  'cognome',
  'nome',
  'data_nascita',
  'luogo_nascita',
  'codice_fiscale',
  'cellulare',
  'email',
] as const;
export type ImportableGuardianField = (typeof IMPORTABLE_GUARDIAN_FIELDS)[number];

/** Values allowed in `tutori.ruolo` (CHECK in the migration). */
export const GUARDIAN_ROLES = guardians.role.enumValues;
export type GuardianRole = (typeof GUARDIAN_ROLES)[number];

export type DateFormat = 'gg/mm/aaaa' | 'aaaa-mm-gg';

export interface GuardianMapping {
  /** Role towards the member: 'madre', 'padre', 'tutore', ... */
  ruolo: GuardianRole;
  campi: Partial<Record<ImportableGuardianField, string>>;
}

export interface NoteMapping {
  colonna: string;
  /** Type of the free progression entry; default 'nota'. */
  tipo?: string;
}

export interface Mapping {
  versione: 1;
  formatoData?: DateFormat;
  /** `associati` field → column name. */
  associato: Partial<Record<ImportableMemberField, string>>;
  /** Unit column and sheet value → unit id. */
  unita?: { colonna: string; valori: Record<string, string> };
  tutori?: GuardianMapping[];
  /** Note columns: they become free progression entries. */
  note?: NoteMapping[];
  /** Values read as "yes" (besides the defaults). */
  valoriSi?: string[];
  /** Values read as "no" (besides the defaults). */
  valoriNo?: string[];
}

export const MAX_GUARDIANS = 4;

const IMPORTABLE_MEMBER_FIELDS = Object.keys(MEMBER_FIELDS).filter(
  (c) => c !== 'unita_id',
) as ImportableMemberField[];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const fail = (message: string): never => {
  throw new AppError('bad_request', `Mappatura non valida: ${message}`);
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function columns(v: unknown, where: string, allowed: readonly string[]): Record<string, string> {
  if (!isObject(v)) return fail(`"${where}" deve essere un oggetto campo → colonna.`);
  for (const [field, column] of Object.entries(v)) {
    if (!allowed.includes(field)) fail(`campo sconosciuto "${field}" in "${where}".`);
    if (!isText(column)) fail(`la colonna di "${where}.${field}" deve essere un testo.`);
  }
  return v as Record<string, string>;
}

function textList(v: unknown, where: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) {
    return fail(`"${where}" deve essere un elenco di testi.`);
  }
  return v as string[];
}

/** Checks the mapping's shape and that the units it names exist. */
export function validateMapping(value: unknown, existingUnits: readonly string[]): Mapping {
  if (!isObject(value)) return fail('deve essere un oggetto JSON.');
  if (value.versione !== 1) fail('"versione" deve essere 1.');
  const dateFormat = value.formatoData;
  if (dateFormat !== undefined && dateFormat !== 'gg/mm/aaaa' && dateFormat !== 'aaaa-mm-gg') {
    fail('"formatoData" deve essere "gg/mm/aaaa" o "aaaa-mm-gg".');
  }
  const member = columns(value.associato, 'associato', IMPORTABLE_MEMBER_FIELDS);
  if (!member.cognome || !member.nome) {
    fail('"associato" deve indicare almeno le colonne di cognome e nome.');
  }

  const m: Mapping = { versione: 1, associato: member };
  if (dateFormat !== undefined) m.formatoData = dateFormat as DateFormat;

  if (value.unita !== undefined) {
    const u = value.unita;
    if (!isObject(u) || !isText(u.colonna) || !isObject(u.valori)) {
      return fail('"unita" deve avere "colonna" e "valori" (valore del foglio → id unità).');
    }
    for (const [from, to] of Object.entries(u.valori)) {
      if (typeof to !== 'string' || !existingUnits.includes(to)) {
        fail(`l'unità "${String(to)}" (per il valore "${from}") non esiste.`);
      }
    }
    m.unita = { colonna: u.colonna, valori: u.valori as Record<string, string> };
  }

  if (value.tutori !== undefined) {
    if (!Array.isArray(value.tutori)) return fail('"tutori" deve essere un elenco.');
    if (value.tutori.length > MAX_GUARDIANS) fail(`al massimo ${MAX_GUARDIANS} tutori per riga.`);
    m.tutori = value.tutori.map((t, i) => {
      if (!isObject(t) || !isText(t.ruolo)) {
        return fail(`il tutore ${i + 1} deve avere "ruolo" e "campi".`);
      }
      const role = t.ruolo.trim();
      if (!(GUARDIAN_ROLES as readonly string[]).includes(role)) {
        fail(`il ruolo del tutore ${i + 1} deve essere uno tra: ${GUARDIAN_ROLES.join(', ')}.`);
      }
      const fields = columns(t.campi, `tutori[${i}].campi`, IMPORTABLE_GUARDIAN_FIELDS);
      if (!fields.nome) fail(`il tutore ${i + 1} deve indicare almeno la colonna del nome.`);
      return { ruolo: role as GuardianRole, campi: fields };
    });
  }

  if (value.note !== undefined) {
    if (!Array.isArray(value.note)) return fail('"note" deve essere un elenco.');
    m.note = value.note.map((n, i) => {
      if (!isObject(n) || !isText(n.colonna)) return fail(`la nota ${i + 1} deve avere "colonna".`);
      if (n.tipo !== undefined && !isText(n.tipo))
        fail(`il tipo della nota ${i + 1} non è valido.`);
      return n.tipo === undefined
        ? { colonna: n.colonna }
        : { colonna: n.colonna, tipo: n.tipo as string };
    });
  }

  const yesValues = textList(value.valoriSi, 'valoriSi');
  if (yesValues) m.valoriSi = yesValues;
  const noValues = textList(value.valoriNo, 'valoriNo');
  if (noValues) m.valoriNo = noValues;
  return m;
}

/** Every column named by the mapping. */
export function usedColumns(m: Mapping): string[] {
  const list: string[] = Object.values(m.associato);
  if (m.unita) list.push(m.unita.colonna);
  for (const t of m.tutori ?? []) list.push(...Object.values(t.campi));
  for (const n of m.note ?? []) list.push(n.colonna);
  return [...new Set(list)];
}

// ---------------------------------------------------------------------------
// Value transformations
// ---------------------------------------------------------------------------

export type Result<T> = { ok: true; value: T; warning?: string } | { ok: false; error: string };

const YES = ['sì', 'si', 's', 'x', '1', 'true', 'vero', 'yes', 'y'];
const NO = ['no', 'n', '0', 'false', 'falso'];

export function isoDate(text: string, format: DateFormat): Result<string> {
  const t = text.trim();
  let y: number;
  let m: number;
  let d: number;
  if (format === 'gg/mm/aaaa') {
    const r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
    if (!r) return { ok: false, error: 'data non valida (atteso gg/mm/aaaa)' };
    d = Number(r[1]);
    m = Number(r[2]);
    y = Number(r[3]);
  } else {
    const r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
    if (!r) return { ok: false, error: 'data non valida (atteso aaaa-mm-gg)' };
    y = Number(r[1]);
    m = Number(r[2]);
    d = Number(r[3]);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false, error: 'data inesistente' };
  }
  if (y < 1900 || y > 2100) return { ok: false, error: 'anno fuori intervallo' };
  return { ok: true, value: date.toISOString().slice(0, 10) };
}

export function yesNo(
  text: string,
  yesValues: readonly string[] = [],
  noValues: readonly string[] = [],
): Result<0 | 1> {
  const t = text.trim().toLowerCase();
  if ([...YES, ...yesValues.map((v) => v.toLowerCase())].includes(t)) return { ok: true, value: 1 };
  if (t === '' || [...NO, ...noValues.map((v) => v.toLowerCase())].includes(t)) {
    return { ok: true, value: 0 };
  }
  // Ambiguous value: assume "no", the most cautious choice for a consent.
  return { ok: true, value: 0, warning: 'valore sì/no non riconosciuto, considerato "no"' };
}

/** Normalises a phone number: digits only, with international prefix. */
export function phone(text: string): Result<string> {
  let t = text.trim().replace(/[\s.\-/()]/g, '');
  if (t.startsWith('00')) t = `+${t.slice(2)}`;
  if (!/^\+?\d+$/.test(t)) return { ok: false, error: 'numero di telefono non valido' };
  if (!t.startsWith('+')) t = `+39${t}`;
  const digits = t.length - 1;
  if (digits < 8 || digits > 15)
    return { ok: true, value: t, warning: 'numero di telefono sospetto' };
  return { ok: true, value: t };
}

export function email(text: string): Result<string> {
  const t = text.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
    return { ok: true, value: t, warning: 'email dal formato sospetto' };
  }
  return { ok: true, value: t };
}

export function taxCode(text: string): Result<string> {
  const t = text.trim().toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z0-9]{16}$/.test(t)) {
    return { ok: true, value: t, warning: 'codice fiscale dal formato sospetto' };
  }
  return { ok: true, value: t };
}

/** AGESCI census code: digits only; a very short value is probably a placeholder. */
export function censusCode(text: string): Result<string> {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return { ok: false, error: 'codice censimento non numerico' };
  if (t.length < 5)
    return { ok: true, value: t, warning: 'codice censimento sospetto (troppo corto)' };
  return { ok: true, value: t };
}

export function postcode(text: string): Result<string> {
  const t = text.trim();
  // A spreadsheet may have dropped the leading zero.
  if (/^\d{4}$/.test(t))
    return { ok: true, value: t.padStart(5, '0'), warning: 'CAP completato con lo zero iniziale' };
  if (!/^\d{5}$/.test(t)) return { ok: true, value: t, warning: 'CAP dal formato sospetto' };
  return { ok: true, value: t };
}

export type FieldKind =
  | 'text'
  | 'date'
  | 'yes_no'
  | 'phone'
  | 'email'
  | 'tax_code'
  | 'postcode'
  | 'census_code'
  | 'uppercase';

export const MEMBER_FIELD_KIND: Record<ImportableMemberField, FieldKind> = {
  codice_censimento: 'census_code',
  cognome: 'text',
  nome: 'text',
  data_nascita: 'date',
  luogo_nascita: 'text',
  codice_fiscale: 'tax_code',
  indirizzo: 'text',
  cap: 'postcode',
  comune: 'text',
  provincia: 'uppercase',
  cellulare: 'phone',
  email: 'email',
  riceve_comunicazioni: 'yes_no',
  informativa: 'yes_no',
  informativa_data: 'date',
  consenso_attivita: 'yes_no',
  consenso_immagini: 'yes_no',
  consenso_commerciale: 'yes_no',
  note_privacy: 'text',
};

export const GUARDIAN_FIELD_KIND: Record<ImportableGuardianField, FieldKind> = {
  cognome: 'text',
  nome: 'text',
  data_nascita: 'date',
  luogo_nascita: 'text',
  codice_fiscale: 'tax_code',
  cellulare: 'phone',
  email: 'email',
};

/** Applies the field kind's transformation. An empty value becomes null (0 for yes/no). */
export function transform(
  text: string,
  kind: FieldKind,
  m: Pick<Mapping, 'formatoData' | 'valoriSi' | 'valoriNo'>,
): Result<string | number | null> {
  // A leading apostrophe is the spreadsheets' "text" marker, not data.
  const t = text.trim().replace(/^'/, '').trim();
  if (kind === 'yes_no') return yesNo(t, m.valoriSi, m.valoriNo);
  if (t === '') return { ok: true, value: null };
  switch (kind) {
    case 'date':
      return isoDate(t, m.formatoData ?? 'gg/mm/aaaa');
    case 'phone':
      return phone(t);
    case 'email':
      return email(t);
    case 'tax_code':
      return taxCode(t);
    case 'postcode':
      return postcode(t);
    case 'census_code':
      return censusCode(t);
    case 'uppercase':
      return { ok: true, value: t.toUpperCase() };
    default:
      return { ok: true, value: t.replace(/\s+/g, ' ') };
  }
}
