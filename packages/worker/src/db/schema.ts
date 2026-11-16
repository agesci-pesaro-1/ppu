// Drizzle mirror of the database schema (ADR 0010).
//
// The source of truth is migrations/*.sql: this file only describes tables,
// columns, types, defaults, primary and foreign keys so that queries are typed.
// CHECK constraints, indexes, STRICT and triggers live only in the migrations.
// test/schema.test.ts compares this file with the migrated database: a
// migration that changes tables or columns must update this file too.
//
// Column names stay Italian (the schema's language); property names are English.

import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

/** Default of the *_il / data columns: current instant, ISO 8601 UTC. */
const NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const createdAt = () => text('creato_il').notNull().default(NOW);
const updatedAt = () => text('aggiornato_il').notNull().default(NOW);
const flag = (name: string, value: boolean) =>
  integer(name, { mode: 'boolean' }).notNull().default(value);

// ---------------------------------------------------------------------------
// Values of the CHECK constraints, shared with the code.
// ---------------------------------------------------------------------------

export const CHANGE_CHANNELS = ['mcp', 'pwa', 'admin', 'import', 'sistema'] as const;
export const ACCESS_CHANNELS = ['mcp', 'pwa', 'admin', 'sistema'] as const;

/** Tables tracked in `modifiche`. */
export const CHANGE_ENTITIES = [
  'associati',
  'storico_unita',
  'tutori',
  'relazioni',
  'anni_scout',
  'progressione',
  'catalogo_progressione',
  'tag',
  'associati_tag',
  'riunioni',
  'presenze',
  'utenti',
  'utenti_unita',
  'unita',
] as const;

/** Tables holding sensitive data whose reads are logged in `accessi`. */
export const ACCESS_ENTITIES = ['associati', 'tutori'] as const;

// ---------------------------------------------------------------------------
// Group structure
// ---------------------------------------------------------------------------

export const branches = sqliteTable('branche', {
  id: text('id').primaryKey(),
  name: text('nome').notNull(),
  sortOrder: integer('ordine').notNull().default(0),
});

export const units = sqliteTable('unita', {
  id: text('id').primaryKey(),
  name: text('nome').notNull(),
  branchId: text('branca_id')
    .notNull()
    .references(() => branches.id),
  active: flag('attiva', true),
  sortOrder: integer('ordine').notNull().default(0),
});

export const scoutYears = sqliteTable('anni_scout', {
  id: integer('id').primaryKey(),
  name: text('nome').notNull(),
  startDate: text('data_inizio').notNull(),
  current: flag('attuale', false),
  createdBy: text('creato_da'),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const members = sqliteTable('associati', {
  id: integer('id').primaryKey(),
  censusCode: text('codice_censimento'),
  lastName: text('cognome').notNull(),
  firstName: text('nome').notNull(),
  birthDate: text('data_nascita'),
  birthPlace: text('luogo_nascita'),
  taxCode: text('codice_fiscale'),
  unitId: text('unita_id').references(() => units.id),
  address: text('indirizzo'),
  postcode: text('cap'),
  town: text('comune'),
  province: text('provincia'),
  mobile: text('cellulare'),
  email: text('email'),
  receivesCommunications: flag('riceve_comunicazioni', true),
  privacyNotice: flag('informativa', false),
  privacyNoticeDate: text('informativa_data'),
  consent2a: flag('consenso_2a', false),
  consent2b: flag('consenso_2b', false),
  consent2c: flag('consenso_2c', false),
  privacyNotes: text('note_privacy'),
  status: text('stato', { enum: ['attivo', 'archiviato'] })
    .notNull()
    .default('attivo'),
  archivedAt: text('archiviato_il'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const unitHistory = sqliteTable(
  'storico_unita',
  {
    memberId: integer('associato_id')
      .notNull()
      .references(() => members.id),
    unitId: text('unita_id')
      .notNull()
      .references(() => units.id),
    scoutYearId: integer('anno_scout_id')
      .notNull()
      .references(() => scoutYears.id),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.scoutYearId, t.unitId] })],
);

export const guardians = sqliteTable('tutori', {
  id: integer('id').primaryKey(),
  memberId: integer('associato_id')
    .notNull()
    .references(() => members.id),
  role: text('ruolo', { enum: ['madre', 'padre', 'tutore', 'affidatario', 'altro'] }).notNull(),
  lastName: text('cognome').notNull(),
  firstName: text('nome').notNull(),
  taxCode: text('codice_fiscale'),
  mobile: text('cellulare'),
  email: text('email'),
  linkedMemberId: integer('associato_collegato_id').references(() => members.id),
  archived: flag('archiviato', false),
  archivedAt: text('archiviato_il'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const relationships = sqliteTable('relazioni', {
  id: integer('id').primaryKey(),
  memberId: integer('associato_id')
    .notNull()
    .references(() => members.id),
  otherMemberId: integer('altro_associato_id')
    .notNull()
    .references(() => members.id),
  type: text('tipo', {
    enum: ['genitore', 'figlio', 'fratello', 'zio', 'nipote', 'cugino', 'altro'],
  }).notNull(),
  archived: flag('archiviata', false),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Personal progression
// ---------------------------------------------------------------------------

export const rulebookVersions = sqliteTable('versioni_regolamento', {
  date: text('data').primaryKey(),
  name: text('nome').notNull(),
  notes: text('note'),
});

export const progressionCatalog = sqliteTable('catalogo_progressione', {
  id: integer('id').primaryKey(),
  version: text('versione').references(() => rulebookVersions.date),
  branchId: text('branca_id')
    .notNull()
    .references(() => branches.id),
  type: text('tipo').notNull(),
  name: text('nome').notNull(),
  sortOrder: integer('ordine').notNull().default(0),
  active: flag('attivo', true),
  imageUrl: text('immagine_url'),
});

export const progression = sqliteTable('progressione', {
  id: integer('id').primaryKey(),
  memberId: integer('associato_id')
    .notNull()
    .references(() => members.id),
  catalogId: integer('catalogo_id').references(() => progressionCatalog.id),
  type: text('tipo'),
  description: text('descrizione'),
  date: text('data'),
  scoutYearId: integer('anno_scout_id').references(() => scoutYears.id),
  archived: flag('archiviata', false),
  createdBy: text('creato_da').notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export const tagTypes = sqliteTable('tipi_tag', {
  id: text('id').primaryKey(),
  name: text('nome').notNull(),
  exclusiveByDefault: flag('esclusivo_predefinito', false),
  sortOrder: integer('ordine').notNull().default(0),
});

export const tags = sqliteTable('tag', {
  id: integer('id').primaryKey(),
  name: text('nome').notNull(),
  typeId: text('tipo_id')
    .notNull()
    .default('varie')
    .references(() => tagTypes.id),
  status: text('stato', { enum: ['libero', 'ufficiale', 'archiviato'] })
    .notNull()
    .default('libero'),
  scoutYearId: integer('anno_scout_id').references(() => scoutYears.id),
  exclusive: flag('esclusivo', false),
  mergedIntoId: integer('unito_in_id').references((): AnySQLiteColumn => tags.id),
  createdBy: text('creato_da').notNull(),
  createdAt: createdAt(),
});

export const memberTags = sqliteTable('associati_tag', {
  id: integer('id').primaryKey(),
  memberId: integer('associato_id')
    .notNull()
    .references(() => members.id),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id),
  scoutYearId: integer('anno_scout_id').references(() => scoutYears.id),
  note: text('nota'),
  createdBy: text('creato_da').notNull(),
  createdAt: createdAt(),
  removedBy: text('rimosso_da'),
  removedAt: text('rimosso_il'),
});

// ---------------------------------------------------------------------------
// Meetings and attendance
// ---------------------------------------------------------------------------

export const meetings = sqliteTable('riunioni', {
  id: integer('id').primaryKey(),
  unitId: text('unita_id')
    .notNull()
    .references(() => units.id),
  scoutYearId: integer('anno_scout_id').references(() => scoutYears.id),
  date: text('data').notNull(),
  type: text('tipo').notNull().default('riunione'),
  notes: text('note'),
  archived: flag('archiviata', false),
  createdBy: text('creato_da').notNull(),
  createdAt: createdAt(),
});

export const attendance = sqliteTable(
  'presenze',
  {
    meetingId: integer('riunione_id')
      .notNull()
      .references(() => meetings.id),
    memberId: integer('associato_id')
      .notNull()
      .references(() => members.id),
    status: text('stato', { enum: ['presente', 'assente', 'giustificato'] }).notNull(),
    reason: text('motivazione'),
    recordedBy: text('registrato_da').notNull(),
    recordedAt: text('registrato_il').notNull().default(NOW),
  },
  (t) => [primaryKey({ columns: [t.meetingId, t.memberId] })],
);

// ---------------------------------------------------------------------------
// Users (leaders) and roles
// ---------------------------------------------------------------------------

export const users = sqliteTable('utenti', {
  email: text('email').primaryKey(),
  memberId: integer('associato_id').references(() => members.id),
  fullAccess: flag('accesso_completo', false),
  buonaStrada: flag('buona_strada', false),
  webmaster: flag('webmaster', false),
  betaTester: flag('beta_tester', false),
  excluded: flag('escluso', false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const userUnits = sqliteTable(
  'utenti_unita',
  {
    email: text('email')
      .notNull()
      .references(() => users.email),
    unitId: text('unita_id')
      .notNull()
      .references(() => units.id),
  },
  (t) => [primaryKey({ columns: [t.email, t.unitId] })],
);

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export const changes = sqliteTable('modifiche', {
  id: integer('id').primaryKey(),
  operation: text('operazione').notNull(),
  authorEmail: text('autore_email').notNull(),
  at: text('data').notNull().default(NOW),
  channel: text('canale', { enum: CHANGE_CHANNELS }).notNull(),
  entity: text('entita', { enum: CHANGE_ENTITIES }).notNull(),
  entityId: text('entita_id').notNull(),
  field: text('campo'),
  valueBefore: text('valore_prima'),
  valueAfter: text('valore_dopo'),
  buonaStradaStatus: text('stato_buona_strada', { enum: ['da_riportare', 'riportata'] }),
  confirmedBy: text('confermata_da'),
  confirmedAt: text('confermata_il'),
});

export const accessLog = sqliteTable('accessi', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  at: text('data').notNull().default(NOW),
  channel: text('canale', { enum: ACCESS_CHANNELS }).notNull(),
  entity: text('entita', { enum: ACCESS_ENTITIES }).notNull(),
  entityId: text('entita_id'),
  fields: text('campi'),
  reason: text('motivo'),
});
