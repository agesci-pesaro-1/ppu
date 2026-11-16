// Change log (`modifiche`) and sensitive-read log (`accessi`).
//
// `changeLogStatements` returns prepared statements, so whoever changes the
// data runs them in the same db.batch() as the change: data and log are saved
// together or not at all.

/** Values of the `canale` column. */
export type Channel = 'mcp' | 'pwa' | 'admin' | 'import' | 'sistema';

/** Tables tracked in `modifiche` (CHECK in the migration: adding one needs a migration). */
export type ChangeEntity =
  | 'associati'
  | 'storico_unita'
  | 'tutori'
  | 'relazioni'
  | 'anni_scout'
  | 'progressione'
  | 'catalogo_progressione'
  | 'tag'
  | 'associati_tag'
  | 'riunioni'
  | 'presenze'
  | 'utenti'
  | 'utenti_unita'
  | 'unita';

/** Tables holding sensitive data whose reads are logged in `accessi`. */
export type AccessEntity = 'associati' | 'tutori';

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

export function changeLogStatements(
  db: D1Database,
  operation: Operation,
  rows: readonly ChangeRow[],
): D1PreparedStatement[] {
  const stmt = db.prepare(
    `INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
                            valore_prima, valore_dopo, stato_buona_strada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  return rows.map((r) =>
    stmt.bind(
      operation.id,
      operation.authorEmail,
      operation.channel,
      r.entity,
      String(r.entityId),
      r.field,
      json(r.before),
      json(r.after),
      r.buonaStrada ? 'da_riportare' : null,
    ),
  );
}

export interface SensitiveRead {
  email: string;
  channel: Exclude<Channel, 'import'>;
  entity: AccessEntity;
  entityId?: string | number;
  fields: readonly string[];
  reason?: string;
}

export function accessLogStatement(db: D1Database, r: SensitiveRead): D1PreparedStatement {
  return db
    .prepare(
      'INSERT INTO accessi (email, canale, entita, entita_id, campi, motivo) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      r.email,
      r.channel,
      r.entity,
      r.entityId === undefined ? null : String(r.entityId),
      JSON.stringify(r.fields),
      r.reason ?? null,
    );
}

export async function logAccess(db: D1Database, r: SensitiveRead): Promise<void> {
  await accessLogStatement(db, r).run();
}
