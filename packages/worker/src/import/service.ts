// Initial import in PPU's standard format (see format.ts), reserved to the webmaster.
//
// Stateless on the server, in two calls:
//   1. previewImport(csv) → full plan + hash;
//   2. confirmImport(csv, hash) → plans again, checks that the hash matches
//      (same file, same database state) and applies everything in a single
//      db.batch(), change log included.
//
// The CSV content is never logged nor returned in full: the preview only shows
// line number, name, unit and per-field errors.

import { eq, getTableColumns, is, isNotNull, SQL, sql } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db/index.ts';
import {
  changes,
  guardians,
  members,
  progression,
  scoutYears,
  unitHistory,
  units,
} from '../db/schema.ts';
import { AppError } from '../errors.ts';
import type { User } from '../identity/index.ts';
import { newOperation } from '../services/audit-log.ts';
import { canAdminister, ensure } from '../services/permissions.ts';
import { CsvError, type CsvTable, parseCsv } from './csv.ts';
import {
  GUARDIAN_FIELD_KIND,
  type GuardianRole,
  guardianColumn,
  guardianRole,
  IMPORTABLE_MEMBER_FIELDS,
  type ImportableMemberField,
  MAX_GUARDIANS,
  MEMBER_FIELD_KIND,
  NOTE_COLUMN,
  NOTE_TYPE,
  readHeaders,
  transform,
  UNIT_COLUMN,
} from './format.ts';

/** Limits to stay within D1's limits on parameter and request size. */
export const MAX_CSV_CHARS = 1_000_000;
export const MAX_ROWS = 1000;

type Value = string | number | null;

/** Guardian row as written to `tutori` (column names). */
export interface PlannedGuardian {
  ruolo: GuardianRole;
  cognome: string;
  nome: string;
  codice_fiscale: Value;
  cellulare: Value;
  email: Value;
}

export type RowStatus = 'create' | 'existing' | 'error';

export interface PlannedRow {
  line: number;
  status: RowStatus;
  /** Member row as written to `associati` (column names). */
  member: Partial<Record<ImportableMemberField | 'unita_id', Value>>;
  guardians: PlannedGuardian[];
  notes: { type: string; description: string }[];
  errors: string[];
  warnings: string[];
}

export interface Plan {
  rows: PlannedRow[];
}

export interface PlanContext {
  /** Unit id or name, lowercase → unit id. */
  units: ReadonlyMap<string, string>;
  existingCensusCodes: ReadonlySet<string>;
  existingTaxCodes: ReadonlySet<string>;
  /** Today's date (YYYY-MM-DD), to archive the guardians of adult members. */
  today: string;
}

/** Date 18 years before `today`: whoever was born on or before it is an adult. */
const adultThreshold = (today: string): string =>
  `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;

// ---------------------------------------------------------------------------
// Planning (pure, no database)
// ---------------------------------------------------------------------------

export function plan(table: CsvTable, context: PlanContext): Plan {
  const index = readHeaders(table.headers);
  const seenCensusCodes = new Map<string, number>();
  const seenTaxCodes = new Map<string, number>();
  const threshold = adultThreshold(context.today);

  const rows = table.rows.map((r): PlannedRow => {
    const cell = (column: string): string => {
      const i = index.get(column);
      return i === undefined ? '' : (r.values[i] ?? '');
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    // Only the columns present in the file: a missing column takes the schema's default.
    const member: PlannedRow['member'] = { unita_id: null };
    for (const field of IMPORTABLE_MEMBER_FIELDS) {
      if (!index.has(field)) continue;
      const result = transform(cell(field), MEMBER_FIELD_KIND[field]);
      if (!result.ok) {
        errors.push(`${field}: ${result.error}`);
        member[field] = null;
      } else {
        member[field] = result.value;
        if (result.warning) warnings.push(`${field}: ${result.warning}`);
      }
    }
    if (!member.cognome) errors.push('cognome: obbligatorio');
    if (!member.nome) errors.push('nome: obbligatorio');

    if (index.has(UNIT_COLUMN)) {
      const raw = cell(UNIT_COLUMN).trim();
      if (raw === '') {
        warnings.push('unita: mancante');
      } else {
        const id = context.units.get(raw.toLowerCase());
        if (id) member.unita_id = id;
        else errors.push('unita: unità sconosciuta in PPU');
      }
    }

    const adult = typeof member.data_nascita === 'string' && member.data_nascita <= threshold;

    const plannedGuardians: PlannedGuardian[] = [];
    for (let n = 1; n <= MAX_GUARDIANS; n += 1) {
      const where = `tutore${n}`;
      const text = (f: Parameters<typeof guardianColumn>[1]) => cell(guardianColumn(n, f));
      const values: Partial<Record<keyof typeof GUARDIAN_FIELD_KIND, Value>> = {};
      let present = text('ruolo').trim() !== '';
      for (const field of Object.keys(
        GUARDIAN_FIELD_KIND,
      ) as (keyof typeof GUARDIAN_FIELD_KIND)[]) {
        const raw = text(field);
        if (raw.trim() !== '') present = true;
        const result = transform(raw, GUARDIAN_FIELD_KIND[field]);
        if (!result.ok) errors.push(`${where}_${field}: ${result.error}`);
        else {
          values[field] = result.value;
          if (result.warning) warnings.push(`${where}_${field}: ${result.warning}`);
        }
      }
      if (!present) continue;
      const role = guardianRole(text('ruolo'));
      if (!role.ok) errors.push(`${where}_ruolo: ${role.error}`);
      if (!values.nome) errors.push(`${where}_nome: obbligatorio se il tutore è presente`);
      if (!role.ok || !values.nome) continue;
      let lastName = values.cognome;
      if (!lastName) {
        lastName = member.cognome;
        warnings.push(`${where}: cognome mancante, usato quello dell'associato`);
      }
      plannedGuardians.push({
        ruolo: role.value,
        cognome: String(lastName ?? ''),
        nome: String(values.nome),
        codice_fiscale: values.codice_fiscale ?? null,
        cellulare: values.cellulare ?? null,
        email: values.email ?? null,
      });
    }
    if (adult && plannedGuardians.length > 0)
      warnings.push('associato maggiorenne: tutori importati come archiviati');

    const note = cell(NOTE_COLUMN).trim();
    const notes = note === '' ? [] : [{ type: NOTE_TYPE, description: note }];

    // Duplicates: in the database and within the file.
    const censusCode =
      typeof member.codice_censimento === 'string' ? member.codice_censimento : null;
    const taxCode = typeof member.codice_fiscale === 'string' ? member.codice_fiscale : null;
    if (censusCode && context.existingCensusCodes.has(censusCode)) {
      return {
        line: r.line,
        status: 'existing',
        member,
        guardians: plannedGuardians,
        notes,
        errors: [],
        warnings: [],
      };
    }
    if (censusCode) {
      const first = seenCensusCodes.get(censusCode);
      if (first) errors.push(`codice_censimento: duplicato della riga ${first}`);
      else seenCensusCodes.set(censusCode, r.line);
    }
    if (taxCode) {
      if (context.existingTaxCodes.has(taxCode)) errors.push('codice_fiscale: già presente in PPU');
      const first = seenTaxCodes.get(taxCode);
      if (first) errors.push(`codice_fiscale: duplicato della riga ${first}`);
      else seenTaxCodes.set(taxCode, r.line);
    }

    return {
      line: r.line,
      status: errors.length > 0 ? 'error' : 'create',
      member,
      guardians: plannedGuardians,
      notes,
      errors,
      warnings,
    };
  });
  return { rows };
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function planHash(p: Plan): Promise<string> {
  return sha256(JSON.stringify({ version: 1, rows: p.rows }));
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface ImportRequest {
  csv: unknown;
}

export interface ImportPreview {
  hash: string;
  counts: {
    rows: number;
    toCreate: number;
    existing: number;
    withErrors: number;
    guardians: number;
    notes: number;
  };
  /** Only what is needed to check the plan: no contacts nor tax codes. */
  rows: {
    line: number;
    status: RowStatus;
    lastName: Value;
    firstName: Value;
    unit: Value;
    guardians: number;
    notes: number;
    errors: string[];
    warnings: string[];
  }[];
}

export interface ImportOutcome {
  operation: string;
  members: number;
  guardians: number;
  notes: number;
  existing: number;
}

async function preparePlan(db: Db, request: ImportRequest): Promise<Plan> {
  if (typeof request.csv !== 'string') {
    throw new AppError('bad_request', 'Il campo "csv" deve contenere il testo del file.');
  }
  if (request.csv.length > MAX_CSV_CHARS) {
    throw new AppError('bad_request', 'File troppo grande: dividilo in più import.');
  }
  let table: CsvTable;
  try {
    table = parseCsv(request.csv);
  } catch (e) {
    if (e instanceof CsvError) throw new AppError('bad_request', e.message);
    throw e;
  }
  if (table.rows.length > MAX_ROWS) {
    throw new AppError('bad_request', `Al massimo ${MAX_ROWS} righe per import.`);
  }
  const [unitRows, censusCodes, taxCodes] = await db.batch([
    db.select({ id: units.id, name: units.name }).from(units),
    db.select({ v: members.censusCode }).from(members).where(isNotNull(members.censusCode)),
    db.select({ v: members.taxCode }).from(members).where(isNotNull(members.taxCode)),
  ]);
  const values = (rows: { v: string | null }[]) =>
    new Set(rows.flatMap((r) => (r.v === null ? [] : [r.v])));
  const unitKeys = new Map<string, string>();
  for (const u of unitRows) {
    unitKeys.set(u.name.trim().toLowerCase(), u.id);
    unitKeys.set(u.id.toLowerCase(), u.id); // the id wins over a name equal to another id
  }
  return plan(table, {
    units: unitKeys,
    existingCensusCodes: values(censusCodes),
    existingTaxCodes: values(taxCodes),
    today: new Date().toISOString().slice(0, 10),
  });
}

const ADMIN_ONLY = "L'import è riservato al webmaster.";

export async function previewImport(
  db: Db,
  user: User,
  request: ImportRequest,
): Promise<ImportPreview> {
  ensure(canAdminister(user), ADMIN_ONLY);
  const p = await preparePlan(db, request);
  const toCreate = p.rows.filter((r) => r.status === 'create');
  return {
    hash: await planHash(p),
    counts: {
      rows: p.rows.length,
      toCreate: toCreate.length,
      existing: p.rows.filter((r) => r.status === 'existing').length,
      withErrors: p.rows.filter((r) => r.status === 'error').length,
      guardians: toCreate.reduce((n, r) => n + r.guardians.length, 0),
      notes: toCreate.reduce((n, r) => n + r.notes.length, 0),
    },
    rows: p.rows.map((r) => ({
      line: r.line,
      status: r.status,
      lastName: r.member.cognome ?? null,
      firstName: r.member.nome ?? null,
      unit: r.member.unita_id ?? null,
      guardians: r.guardians.length,
      notes: r.notes.length,
      errors: r.errors,
      warnings: r.warnings,
    })),
  };
}

const MEMBER_COLUMNS = [
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
  'email',
  'riceve_comunicazioni',
  'informativa',
  'informativa_data',
  'consenso_attivita',
  'consenso_immagini',
  'consenso_commerciale',
  'note_privacy',
] as const;

/** Flags and their value when the file has no column for them (the schema's default). */
const FLAG_DEFAULTS: Partial<Record<(typeof MEMBER_COLUMNS)[number], 0 | 1>> = {
  riceve_comunicazioni: 1,
  informativa: 0,
  consenso_attivita: 0,
  consenso_immagini: 0,
  consenso_commerciale: 0,
};

/**
 * INSERT ... SELECT from a JSON array: one statement and one bound parameter per
 * table, whatever the number of rows (D1 allows at most 100 parameters per
 * query). Every column of the table is selected, in the table's order: from the
 * JSON when the rows have it, from `extra` (bound values), or the column's
 * default. Column names come from the Drizzle schema, never from input.
 */
function insertFromJson(
  db: Db,
  table: SQLiteTable,
  rows: readonly Record<string, Value>[],
  extra: Record<string, SQL> = {},
) {
  const keys = new Set(Object.keys(rows[0] ?? {}));
  const values = Object.values(getTableColumns(table)).map((col) => {
    const given = extra[col.name];
    if (given) return given;
    if (keys.has(col.name)) return sql.raw(`json_extract(value, '$.${col.name}')`);
    const d: unknown = col.default;
    if (is(d, SQL)) return d;
    if (typeof d === 'boolean') return sql.raw(d ? '1' : '0');
    if (d !== undefined) return sql`${d}`;
    return sql.raw('NULL');
  });
  return db
    .insert(table)
    .select(sql`SELECT ${sql.join(values, sql`, `)} FROM json_each(${JSON.stringify(rows)})`);
}

export async function confirmImport(
  db: Db,
  user: User,
  request: ImportRequest & { hash: unknown },
): Promise<ImportOutcome> {
  ensure(canAdminister(user), ADMIN_ONLY);
  if (typeof request.hash !== 'string' || request.hash === '') {
    throw new AppError('bad_request', "Manca l'hash dell'anteprima.");
  }
  const p = await preparePlan(db, request);
  if ((await planHash(p)) !== request.hash) {
    throw new AppError(
      'conflict',
      "Il file o i dati sono cambiati dopo l'anteprima: ripeti l'anteprima.",
    );
  }
  const withErrors = p.rows.filter((r) => r.status === 'error').length;
  if (withErrors > 0) {
    throw new AppError(
      'bad_request',
      `${withErrors} righe hanno errori: correggi il file e ripeti l'anteprima.`,
    );
  }
  const toCreate = p.rows.filter((r) => r.status === 'create');
  const existing = p.rows.length - toCreate.length;
  const operation = newOperation(user.email, 'import');
  if (toCreate.length === 0) {
    return { operation: operation.id, members: 0, guardians: 0, notes: 0, existing };
  }

  const maxId = (column: SQLiteColumn) => sql<number>`coalesce(max(${column}), 0)`;
  const [maxMember, maxGuardian, maxNote, currentYear] = await db.batch([
    db.select({ v: maxId(members.id) }).from(members),
    db.select({ v: maxId(guardians.id) }).from(guardians),
    db.select({ v: maxId(progression.id) }).from(progression),
    db.select({ id: scoutYears.id }).from(scoutYears).where(eq(scoutYears.current, true)),
  ]);
  const yearId = currentYear[0]?.id ?? null;
  const now = new Date().toISOString();
  const threshold = adultThreshold(now.slice(0, 10));

  // Explicit ids: guardians and notes must point to the members created in the
  // same batch. If someone inserts a row meanwhile, the batch fails on a
  // duplicate key and writes nothing.
  let memberId = maxMember[0]?.v ?? 0;
  let guardianId = maxGuardian[0]?.v ?? 0;
  let noteId = maxNote[0]?.v ?? 0;
  const memberRows: Record<string, Value>[] = [];
  const historyRows: Record<string, Value>[] = [];
  const guardianRows: Record<string, Value>[] = [];
  const noteRows: Record<string, Value>[] = [];
  const log: Record<string, Value>[] = [];

  for (const r of toCreate) {
    memberId += 1;
    const a: Record<string, Value> = { id: memberId };
    for (const c of MEMBER_COLUMNS) a[c] = r.member[c] ?? FLAG_DEFAULTS[c] ?? null;
    memberRows.push(a);
    log.push({ entita: 'associati', entita_id: String(memberId), valore_dopo: JSON.stringify(a) });
    if (a.unita_id && yearId !== null) {
      historyRows.push({ associato_id: memberId, unita_id: a.unita_id, anno_scout_id: yearId });
    }
    const adult = typeof a.data_nascita === 'string' && a.data_nascita <= threshold;
    for (const g of r.guardians) {
      guardianId += 1;
      const row: Record<string, Value> = {
        id: guardianId,
        associato_id: memberId,
        ...g,
        archiviato: adult ? 1 : 0,
        archiviato_il: adult ? now : null,
      };
      guardianRows.push(row);
      log.push({
        entita: 'tutori',
        entita_id: String(guardianId),
        valore_dopo: JSON.stringify(row),
      });
    }
    for (const n of r.notes) {
      noteId += 1;
      const row: Record<string, Value> = {
        id: noteId,
        associato_id: memberId,
        tipo: n.type,
        descrizione: n.description,
        anno_scout_id: yearId,
      };
      noteRows.push(row);
      log.push({
        entita: 'progressione',
        entita_id: String(noteId),
        valore_dopo: JSON.stringify(row),
      });
    }
  }

  const statements = [insertFromJson(db, members, memberRows)];
  if (historyRows.length > 0) {
    statements.push(insertFromJson(db, unitHistory, historyRows));
  }
  if (guardianRows.length > 0) {
    statements.push(insertFromJson(db, guardians, guardianRows));
  }
  if (noteRows.length > 0) {
    statements.push(insertFromJson(db, progression, noteRows, { creato_da: sql`${user.email}` }));
  }
  // Change log: one row per created entity (NULL field = whole row created).
  // The rows are NOT marked "da_riportare": the file is prepared from data
  // aligned with Buona Strada (the official source). Marking them would
  // create hundreds of fake changes to report for data Buona Strada already has.
  statements.push(
    insertFromJson(db, changes, log, {
      operazione: sql`${operation.id}`,
      autore_email: sql`${operation.authorEmail}`,
      canale: sql`${operation.channel}`,
    }),
  );

  try {
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
  } catch (e) {
    if (e instanceof Error && /UNIQUE|PRIMARY KEY/i.test(`${e.message} ${String(e.cause)}`)) {
      throw new AppError('conflict', "I dati sono cambiati durante l'import: ripeti l'anteprima.");
    }
    throw e;
  }
  return {
    operation: operation.id,
    members: memberRows.length,
    guardians: guardianRows.length,
    notes: noteRows.length,
    existing,
  };
}
