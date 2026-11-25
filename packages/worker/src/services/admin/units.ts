// Management of the units. They are added, renamed, activated or deactivated;
// never deleted. Webmaster only.

import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { branches, members, units, userUnits } from '../../db/schema.ts';
import { AppError } from '../../errors.ts';
import type { ChangeRow } from '../audit-log.ts';
import type { Context } from '../context.ts';
import { registerType } from '../previews.ts';
import { parse } from '../validation.ts';
import { ensureWebmaster } from './users.ts';

export interface UnitEntry {
  id: string;
  name: string;
  branch: string;
  active: boolean;
  sortOrder: number;
  activeMembers: number;
  leaders: number;
}

export async function listUnits(ctx: Context): Promise<UnitEntry[]> {
  ensureWebmaster(ctx);
  const activeMembers = ctx.db
    .select({ unitId: members.unitId, n: count().as('active_members') })
    .from(members)
    .where(eq(members.status, 'attivo'))
    .groupBy(members.unitId)
    .as('m');
  const leaders = ctx.db
    .select({ unitId: userUnits.unitId, n: count().as('leaders') })
    .from(userUnits)
    .groupBy(userUnits.unitId)
    .as('l');
  const rows = await ctx.db
    .select({
      id: units.id,
      name: units.name,
      branch: units.branchId,
      active: units.active,
      sortOrder: units.sortOrder,
      activeMembers: activeMembers.n,
      leaders: leaders.n,
    })
    .from(units)
    .leftJoin(activeMembers, eq(activeMembers.unitId, units.id))
    .leftJoin(leaders, eq(leaders.unitId, units.id))
    .orderBy(units.sortOrder, units.id);
  return rows.map((r) => ({ ...r, activeMembers: r.activeMembers ?? 0, leaders: r.leaders ?? 0 }));
}

const setUnitSchema = z.strictObject({
  id: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/, 'usa lettere minuscole, cifre e trattini bassi'),
  name: z.string().trim().min(1).optional(),
  branchId: z.string().min(1).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type SetUnit = z.infer<typeof setUnitSchema>;

/** Editable fields: API name → column of `unita` (field name in the change log). */
const FIELDS = {
  name: 'nome',
  branchId: 'branca_id',
  active: 'attiva',
  sortOrder: 'ordine',
} as const;
const FIELD_NAMES = Object.keys(FIELDS) as (keyof typeof FIELDS)[];

/** Adds a unit or changes its name, branch, order or active state. */
export const setUnit = registerType<SetUnit>({
  type: 'unit.set',
  validate: (p) => parse(setUnitSchema, p),
  async plan(ctx, p) {
    ensureWebmaster(ctx);
    const current = await ctx.db
      .select({
        name: units.name,
        branchId: units.branchId,
        active: units.active,
        sortOrder: units.sortOrder,
      })
      .from(units)
      .where(eq(units.id, p.id))
      .get();

    if (p.branchId !== undefined) {
      const branch = await ctx.db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.id, p.branchId))
        .get();
      if (!branch) throw new AppError('bad_request', `Branca inesistente: ${p.branchId}.`);
    }

    if (!current) {
      if (!p.name || !p.branchId) {
        throw new AppError('bad_request', 'Per una nuova unità servono nome e branca.');
      }
      const created = {
        name: p.name,
        branchId: p.branchId,
        active: p.active ?? true,
        sortOrder: p.sortOrder ?? 0,
      };
      return {
        description: `Aggiunge l'unità "${created.name}".`,
        rows: [
          {
            entity: 'unita',
            entityId: p.id,
            field: null,
            before: null,
            after: Object.fromEntries(FIELD_NAMES.map((f) => [FIELDS[f], created[f]])),
            buonaStrada: false,
          },
        ],
        statements: [ctx.db.insert(units).values({ id: p.id, ...created })],
        count: 1,
      };
    }

    const after = {
      name: p.name ?? current.name,
      branchId: p.branchId ?? current.branchId,
      active: p.active ?? current.active,
      sortOrder: p.sortOrder ?? current.sortOrder,
    };
    const rows: ChangeRow[] = FIELD_NAMES.filter((f) => current[f] !== after[f]).map((f) => ({
      entity: 'unita',
      entityId: p.id,
      field: FIELDS[f],
      before: current[f],
      after: after[f],
      buonaStrada: false,
    }));

    let description = `Aggiorna l'unità "${current.name}".`;
    if (current.active && !after.active) {
      const active = await ctx.db
        .select({ n: count() })
        .from(members)
        .where(and(eq(members.unitId, p.id), eq(members.status, 'attivo')))
        .get();
      const n = active?.n ?? 0;
      description = `Disattiva l'unità "${current.name}"${n ? ` (ha ancora ${n} associati attivi)` : ''}.`;
    }

    return {
      description,
      rows,
      statements: [ctx.db.update(units).set(after).where(eq(units.id, p.id))],
      count: 1,
    };
  },
});
