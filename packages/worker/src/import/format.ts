// PPU's standard import format.
//
// One CSV file, one row per member, with fixed headers: the schema's column
// names (like the group configuration file). Guardians sit on the same row in
// numbered columns (`tutore1_nome`, `tutore2_ruolo`, ...). Every group converts
// its own sheet to this format once: PPU never reads a group-specific layout.
// The template with every column is docs/installazione/import-modello.csv.
// Messages are shown to the user, so they are in Italian.

import { guardians } from '../db/schema.ts';
import { MEMBER_FIELDS, type MemberField } from '../domain/fields.ts';
import { AppError } from '../errors.ts';

/** `associati` fields read from a column with the same name. The unit has its own column. */
export type ImportableMemberField = Exclude<MemberField, 'unita_id'>;

export const IMPORTABLE_MEMBER_FIELDS = Object.keys(MEMBER_FIELDS).filter(
  (c) => c !== 'unita_id',
) as ImportableMemberField[];

/** Unit column: the unit's id ('lupetti') or name ('Branco Seeonee'). */
export const UNIT_COLUMN = 'unita';
/** General notes: they become a free progression entry of type 'nota'. */
export const NOTE_COLUMN = 'note';
export const NOTE_TYPE = 'nota';

export const IMPORTABLE_GUARDIAN_FIELDS = [
  'ruolo',
  'cognome',
  'nome',
  'codice_fiscale',
  'cellulare',
  'email',
] as const;
export type ImportableGuardianField = (typeof IMPORTABLE_GUARDIAN_FIELDS)[number];

/** Values allowed in `tutori.ruolo` (CHECK in the migration). */
export const GUARDIAN_ROLES = guardians.role.enumValues;
export type GuardianRole = (typeof GUARDIAN_ROLES)[number];

export const MAX_GUARDIANS = 4;

export const guardianColumn = (n: number, field: ImportableGuardianField): string =>
  `tutore${n}_${field}`;

/** Every column of the format, in the template's order. */
export const STANDARD_COLUMNS: readonly string[] = [
  ...IMPORTABLE_MEMBER_FIELDS.slice(0, 6), // census code, names, birth, tax code
  UNIT_COLUMN,
  ...IMPORTABLE_MEMBER_FIELDS.slice(6),
  NOTE_COLUMN,
  ...Array.from({ length: MAX_GUARDIANS }, (_, i) =>
    IMPORTABLE_GUARDIAN_FIELDS.map((f) => guardianColumn(i + 1, f)),
  ).flat(),
];

export const REQUIRED_COLUMNS = ['cognome', 'nome'] as const;

/**
 * Checks the header row: every column must belong to the format (a typo would
 * otherwise silently drop data), cognome and nome are required, the others can
 * be left out. Returns the position of each column, by its standard name.
 */
export function readHeaders(headers: readonly string[]): Map<string, number> {
  const index = new Map<string, number>();
  const unknown: string[] = [];
  headers.forEach((h, i) => {
    const name = h.trim().toLowerCase();
    if (name === '') return;
    if (STANDARD_COLUMNS.includes(name)) index.set(name, i);
    else unknown.push(h);
  });
  if (unknown.length > 0) {
    throw new AppError(
      'bad_request',
      `Colonne non previste dal formato di import: ${unknown.map((c) => `"${c}"`).join(', ')}. Usa i nomi del modello (docs/installazione/import-modello.csv).`,
    );
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !index.has(c));
  if (missing.length > 0) {
    throw new AppError('bad_request', `Colonne obbligatorie assenti: ${missing.join(', ')}.`);
  }
  return index;
}

// ---------------------------------------------------------------------------
// Value transformations
// ---------------------------------------------------------------------------

export type Result<T> = { ok: true; value: T; warning?: string } | { ok: false; error: string };

const YES = ['sì', 'si', 'x', '1'];
const NO = ['no', '0'];

/** Accepts gg/mm/aaaa (Italian spreadsheets) and aaaa-mm-gg (ISO): they never overlap. */
export function isoDate(text: string): Result<string> {
  const t = text.trim();
  let y: number;
  let m: number;
  let d: number;
  const italian = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (italian) {
    d = Number(italian[1]);
    m = Number(italian[2]);
    y = Number(italian[3]);
  } else if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    return { ok: false, error: 'data non valida (atteso gg/mm/aaaa o aaaa-mm-gg)' };
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { ok: false, error: 'data inesistente' };
  }
  if (y < 1900 || y > 2100) return { ok: false, error: 'anno fuori intervallo' };
  return { ok: true, value: date.toISOString().slice(0, 10) };
}

/**
 * sì/si/x/1 → yes, empty/no/0 → no. Anything else is an error: the file is
 * prepared for PPU, so an unexpected value means a conversion mistake, and
 * guessing would be wrong for a consent either way.
 */
export function yesNo(text: string): Result<0 | 1> {
  const t = text.trim().toLowerCase();
  if (YES.includes(t)) return { ok: true, value: 1 };
  if (t === '' || NO.includes(t)) return { ok: true, value: 0 };
  return { ok: false, error: 'valore sì/no non valido (usa "si" o "no")' };
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

export function postcode(text: string): Result<string> {
  const t = text.trim();
  // A spreadsheet may have dropped the leading zero.
  if (/^\d{4}$/.test(t))
    return { ok: true, value: t.padStart(5, '0'), warning: 'CAP completato con lo zero iniziale' };
  if (!/^\d{5}$/.test(t)) return { ok: true, value: t, warning: 'CAP dal formato sospetto' };
  return { ok: true, value: t };
}

export function guardianRole(text: string): Result<GuardianRole> {
  const t = text.trim().toLowerCase();
  if ((GUARDIAN_ROLES as readonly string[]).includes(t)) {
    return { ok: true, value: t as GuardianRole };
  }
  return { ok: false, error: `ruolo non valido (uno tra: ${GUARDIAN_ROLES.join(', ')})` };
}

export type FieldKind =
  | 'text'
  | 'date'
  | 'yes_no'
  | 'phone'
  | 'email'
  | 'tax_code'
  | 'postcode'
  | 'uppercase';

export const MEMBER_FIELD_KIND: Record<ImportableMemberField, FieldKind> = {
  codice_censimento: 'text',
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

export const GUARDIAN_FIELD_KIND: Record<Exclude<ImportableGuardianField, 'ruolo'>, FieldKind> = {
  cognome: 'text',
  nome: 'text',
  codice_fiscale: 'tax_code',
  cellulare: 'phone',
  email: 'email',
};

/** Applies the field kind's transformation. An empty value becomes null (0 for yes/no). */
export function transform(text: string, kind: FieldKind): Result<string | number | null> {
  const t = text.trim();
  if (kind === 'yes_no') return yesNo(t);
  if (t === '') return { ok: true, value: null };
  switch (kind) {
    case 'date':
      return isoDate(t);
    case 'phone':
      return phone(t);
    case 'email':
      return email(t);
    case 'tax_code':
      return taxCode(t);
    case 'postcode':
      return postcode(t);
    case 'uppercase':
      return { ok: true, value: t.toUpperCase() };
    default:
      return { ok: true, value: t.replace(/\s+/g, ' ') };
  }
}
