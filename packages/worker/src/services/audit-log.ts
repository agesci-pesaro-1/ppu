// Change log (`modifiche`) and sensitive-read log (`accessi`).
//
// `changeLogInserts` returns Drizzle queries, so whoever changes the data runs
// them in the same db.batch() as the change: data and log are saved together
// or not at all.

import type { Db } from '../db/index.ts';
import {
  type ACCESS_CHANNELS,
  type ACCESS_ENTITIES,
  accessLog,
  type CHANGE_CHANNELS,
  type CHANGE_ENTITIES,
  changes,
} from '../db/schema.ts';

/** Values of the `canale` column. */
export type Channel = (typeof CHANGE_CHANNELS)[number];
export type AccessChannel = (typeof ACCESS_CHANNELS)[number];
/** Tables tracked in `modifiche` (CHECK in the migration: adding one needs a migration). */
export type ChangeEntity = (typeof CHANGE_ENTITIES)[number];
/** Tables holding sensitive data whose reads are logged in `accessi`. */
export type AccessEntity = (typeof ACCESS_ENTITIES)[number];

export interface ChangeRow {
  entity: ChangeEntity;
  entityId: string | number;
  /** null when the whole row is created or archived. */
  field: string | null;
  before: unknown;
  after: unknown;
  /** true if the field has to be reported on Buona Strada. */
  buonaStrada: boolean;
}

export interface Operation {
  id: string;
  authorEmail: string;
  channel: Channel;
}

export function newOperation(authorEmail: string, channel: Channel): Operation {
  return { id: crypto.randomUUID(), authorEmail, channel };
}

const json = (v: unknown): string | null => (v === undefined ? null : JSON.stringify(v));

/**
 * One INSERT per row, to put in the same db.batch() as the change. Not a single
 * multi-row INSERT: D1 allows at most 100 bound parameters per query, and a
 * mass operation would exceed it.
 */
export function changeLogInserts(db: Db, operation: Operation, rows: readonly ChangeRow[]) {
  return rows.map((r) =>
    db.insert(changes).values({
      operation: operation.id,
      authorEmail: operation.authorEmail,
      channel: operation.channel,
      entity: r.entity,
      entityId: String(r.entityId),
      field: r.field,
      valueBefore: json(r.before),
      valueAfter: json(r.after),
      buonaStradaStatus: r.buonaStrada ? 'da_riportare' : null,
    }),
  );
}

export interface SensitiveRead {
  email: string;
  channel: AccessChannel;
  entity: AccessEntity;
  entityId?: string | number;
  fields: readonly string[];
  reason?: string;
}

/** INSERT into `accessi`, to batch with the read when convenient. */
export function accessLogInsert(db: Db, r: SensitiveRead) {
  return db.insert(accessLog).values({
    email: r.email,
    channel: r.channel,
    entity: r.entity,
    entityId: r.entityId === undefined ? null : String(r.entityId),
    fields: JSON.stringify(r.fields),
    reason: r.reason ?? null,
  });
}

export async function logAccess(db: Db, r: SensitiveRead): Promise<void> {
  await accessLogInsert(db, r).run();
}
