// Before/after preview → explicit confirmation, for every change.
//
// Each operation type declares how to validate the request and how to plan it
// (permissions, before/after rows, queries). `propose` stores the request and
// returns the preview; `confirm` checks permissions again, plans again on the
// current data (if the data changed, the preview is no longer valid) and
// applies data + change log + preview closing in a single db.batch().

import { and, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { previews } from '../db/schema.ts';
import { AppError } from '../errors.ts';
import { type ChangeRow, changeLogInserts } from './audit-log.ts';
import { type Context, now } from './context.ts';

/** How long a preview stays valid. */
export const PREVIEW_TTL_MS = 15 * 60 * 1000;

export type Statement = BatchItem<'sqlite'>;

export interface Plan {
  /** Short sentence in Italian, shown to the user: what confirming does. */
  description: string;
  /** Before/after rows, also written to the `modifiche` log. */
  rows: ChangeRow[];
  /** Queries that apply the change (without the log). */
  statements: Statement[];
  /** How many items the operation touches (> 1 = mass operation). */
  count: number;
}

export interface OperationType<P> {
  type: string;
  /** Validates the payload; throws bad_request. */
  validate(payload: unknown): P;
  /** Checks permissions and computes the plan on the current data. */
  plan(ctx: Context, payload: P): Promise<Plan>;
}

export interface PreviewEntry {
  entity: string;
  entityId: string;
  field: string | null;
  before: unknown;
  after: unknown;
}

export interface Preview {
  id: string;
  type: string;
  description: string;
  changes: PreviewEntry[];
  count: number;
  /** true if it touches more than one item: the confirmation must repeat the count. */
  mass: boolean;
  expiresAt: string;
}

export interface Outcome {
  id: string;
  description: string;
  count: number;
}

const types = new Map<string, OperationType<unknown>>();

export function registerType<P>(t: OperationType<P>): OperationType<P> {
  types.set(t.type, t as OperationType<unknown>);
  return t;
}

function typeOf(name: string): OperationType<unknown> {
  const t = types.get(name);
  if (!t) throw new AppError('bad_request', `Tipo di operazione sconosciuto: ${name}.`);
  return t;
}

const entries = (rows: ChangeRow[]): PreviewEntry[] =>
  rows.map((r) => ({
    entity: r.entity,
    entityId: String(r.entityId),
    field: r.field,
    before: r.before ?? null,
    after: r.after ?? null,
  }));

export async function propose(ctx: Context, type: string, payload: unknown): Promise<Preview> {
  const t = typeOf(type);
  const valid = t.validate(payload);
  const plan = await t.plan(ctx, valid);
  if (plan.rows.length === 0) {
    throw new AppError('bad_request', 'Nessuna modifica da fare: i valori sono già questi.');
  }
  const id = crypto.randomUUID();
  const expiresAt = new Date(now(ctx).getTime() + PREVIEW_TTL_MS).toISOString();
  const changes = entries(plan.rows);
  await ctx.db
    .insert(previews)
    .values({
      id,
      authorEmail: ctx.user.email,
      channel: ctx.channel,
      type,
      payload: JSON.stringify(valid),
      preview: JSON.stringify(changes),
      count: plan.count,
      expiresAt,
    })
    .run();
  return {
    id,
    type,
    description: plan.description,
    changes,
    count: plan.count,
    mass: plan.count > 1,
    expiresAt,
  };
}

async function load(ctx: Context, id: string) {
  const row = await ctx.db.select().from(previews).where(eq(previews.id, id)).get();
  // Another author's preview cannot be confirmed and is not revealed.
  if (!row || row.authorEmail !== ctx.user.email) {
    throw new AppError('not_found', 'Operazione non trovata.');
  }
  return row;
}

async function close(ctx: Context, id: string, status: 'annullata' | 'scaduta'): Promise<void> {
  await ctx.db
    .update(previews)
    .set({ status, closedAt: now(ctx).toISOString() })
    .where(and(eq(previews.id, id), eq(previews.status, 'in_attesa')))
    .run();
}

export async function confirm(
  ctx: Context,
  id: string,
  options: { count?: number | undefined } = {},
): Promise<Outcome> {
  const row = await load(ctx, id);
  if (row.status !== 'in_attesa') {
    throw new AppError('invalid_preview', `Operazione già ${row.status}.`);
  }
  if (row.expiresAt <= now(ctx).toISOString()) {
    await close(ctx, id, 'scaduta');
    throw new AppError('invalid_preview', 'Anteprima scaduta: proponi di nuovo la modifica.');
  }
  if (row.count > 1 && options.count !== row.count) {
    throw new AppError(
      'bad_request',
      `Operazione di massa su ${row.count} elementi: per confermare ripeti il numero.`,
    );
  }

  const t = typeOf(row.type);
  const payload = t.validate(JSON.parse(row.payload));
  // Permissions and data are checked now, not when the preview was made.
  const plan = await t.plan(ctx, payload);
  if (JSON.stringify(entries(plan.rows)) !== row.preview) {
    await close(ctx, id, 'scaduta');
    throw new AppError(
      'invalid_preview',
      "I dati sono cambiati dopo l'anteprima: proponi di nuovo la modifica.",
    );
  }

  const operation = { id, authorEmail: ctx.user.email, channel: ctx.channel };
  await ctx.db.batch([
    // The trigger makes the whole batch fail if the preview was already closed.
    ctx.db
      .update(previews)
      .set({ status: 'confermata', closedAt: now(ctx).toISOString() })
      .where(eq(previews.id, id)),
    ...plan.statements,
    ...changeLogInserts(ctx.db, operation, plan.rows),
  ]);
  return { id, description: plan.description, count: plan.count };
}

export async function cancel(ctx: Context, id: string): Promise<void> {
  const row = await load(ctx, id);
  if (row.status !== 'in_attesa') {
    throw new AppError('invalid_preview', `Operazione già ${row.status}.`);
  }
  await close(ctx, id, 'annullata');
}
