// Management of the `utenti` table (leaders' units and roles). Webmaster only.

import { and, count, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { members, units, users, userUnits } from '../../db/schema.ts';
import { AppError } from '../../errors.ts';
import { isInDomain } from '../../identity/index.ts';
import type { ChangeRow } from '../audit-log.ts';
import type { Context } from '../context.ts';
import { canAdminister, ensure } from '../permissions.ts';
import { registerType, type Statement } from '../previews.ts';
import { parse } from '../validation.ts';

export function ensureWebmaster(ctx: Context): void {
  ensure(canAdminister(ctx.user), 'Operazione riservata al webmaster.');
}

/** Roles: API name → column of `utenti` (used as field name in the change log). */
const ROLES = {
  fullAccess: 'accesso_completo',
  buonaStrada: 'buona_strada',
  webmaster: 'webmaster',
  betaTester: 'beta_tester',
  excluded: 'escluso',
} as const;
type Role = keyof typeof ROLES;
const ROLE_NAMES = Object.keys(ROLES) as Role[];
type Roles = Record<Role, boolean>;

export interface UserEntry {
  email: string;
  /** Linked member record, "Last First". */
  member: string | null;
  units: string[];
  roles: Roles;
}

async function loadUsers(ctx: Context, email?: string) {
  const rows = await ctx.db
    .select({
      email: users.email,
      memberId: users.memberId,
      lastName: members.lastName,
      firstName: members.firstName,
      fullAccess: users.fullAccess,
      buonaStrada: users.buonaStrada,
      webmaster: users.webmaster,
      betaTester: users.betaTester,
      excluded: users.excluded,
      units: sql<string | null>`group_concat(${userUnits.unitId})`,
    })
    .from(users)
    .leftJoin(members, eq(members.id, users.memberId))
    .leftJoin(userUnits, eq(userUnits.email, users.email))
    .where(email === undefined ? undefined : eq(users.email, email))
    .groupBy(users.email)
    .orderBy(users.email);
  return rows.map((r) => ({
    email: r.email,
    memberId: r.memberId,
    member: r.lastName === null ? null : `${r.lastName} ${r.firstName}`,
    units: r.units ? r.units.split(',').sort() : [],
    roles: Object.fromEntries(ROLE_NAMES.map((role) => [role, r[role]])) as Roles,
  }));
}

export async function listUsers(ctx: Context): Promise<UserEntry[]> {
  ensureWebmaster(ctx);
  return (await loadUsers(ctx)).map(({ memberId: _, ...entry }) => entry);
}

const setUserSchema = z.strictObject({
  email: z.string().trim().toLowerCase().email(),
  units: z.array(z.string().min(1)).optional(),
  fullAccess: z.boolean().optional(),
  buonaStrada: z.boolean().optional(),
  webmaster: z.boolean().optional(),
  betaTester: z.boolean().optional(),
  excluded: z.boolean().optional(),
  memberId: z.number().int().positive().nullable().optional(),
});
export type SetUser = z.infer<typeof setUserSchema>;

const sameList = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

/** Creates a user or changes their units, roles or linked member record. */
export const setUser = registerType<SetUser>({
  type: 'user.set',
  validate: (p) => parse(setUserSchema, p),
  async plan(ctx, p) {
    ensureWebmaster(ctx);
    if (!isInDomain(p.email, ctx.domain)) {
      throw new AppError('bad_request', "L'email deve appartenere al dominio del gruppo.");
    }
    const [current] = await loadUsers(ctx, p.email);

    const rolesBefore = Object.fromEntries(
      ROLE_NAMES.map((r) => [r, current?.roles[r] ?? false]),
    ) as Roles;
    const rolesAfter = Object.fromEntries(
      ROLE_NAMES.map((r) => [r, p[r] ?? rolesBefore[r]]),
    ) as Roles;
    const unitsBefore = current?.units ?? [];
    const unitsAfter = p.units ? [...new Set(p.units)].sort() : unitsBefore;
    const memberBefore = current?.memberId ?? null;
    const memberAfter = p.memberId === undefined ? memberBefore : p.memberId;

    if (p.units && unitsAfter.length > 0) {
      const found = await ctx.db
        .select({ id: units.id })
        .from(units)
        .where(and(inArray(units.id, unitsAfter), eq(units.active, true)));
      const missing = unitsAfter.filter((u) => !found.some((f) => f.id === u));
      if (missing.length > 0) {
        throw new AppError('bad_request', `Unità inesistente o non attiva: ${missing.join(', ')}.`);
      }
    }
    if (memberAfter !== null && memberAfter !== memberBefore) {
      const member = await ctx.db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.id, memberAfter), eq(members.status, 'attivo')))
        .get();
      if (!member) throw new AppError('bad_request', 'Scheda associato inesistente.');
    }

    // At least one active webmaster must remain.
    const wasWebmaster = rolesBefore.webmaster && !rolesBefore.excluded;
    const willBeWebmaster = rolesAfter.webmaster && !rolesAfter.excluded;
    if (wasWebmaster && !willBeWebmaster) {
      const others = await ctx.db
        .select({ n: count() })
        .from(users)
        .where(and(eq(users.webmaster, true), eq(users.excluded, false), ne(users.email, p.email)))
        .get();
      if (!others?.n) throw new AppError('conflict', 'Deve restare almeno un webmaster.');
    }

    const row = (field: string | null, before: unknown, after: unknown): ChangeRow => ({
      entity: 'utenti',
      entityId: p.email,
      field,
      before,
      after,
      buonaStrada: false,
    });
    const rows: ChangeRow[] = [];
    if (!current) {
      const after = Object.fromEntries(ROLE_NAMES.map((r) => [ROLES[r], rolesAfter[r]]));
      rows.push(row(null, null, { ...after, unita: unitsAfter, associato_id: memberAfter }));
    } else {
      for (const r of ROLE_NAMES) {
        if (rolesBefore[r] !== rolesAfter[r])
          rows.push(row(ROLES[r], rolesBefore[r], rolesAfter[r]));
      }
      if (!sameList(unitsBefore, unitsAfter)) rows.push(row('unita', unitsBefore, unitsAfter));
      if (memberBefore !== memberAfter) rows.push(row('associato_id', memberBefore, memberAfter));
    }

    const values = { memberId: memberAfter, ...rolesAfter };
    const statements: Statement[] = [
      ctx.db
        .insert(users)
        .values({ email: p.email, ...values })
        .onConflictDoUpdate({
          target: users.email,
          set: { ...values, updatedAt: sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))` },
        }),
    ];
    if (!sameList(unitsBefore, unitsAfter)) {
      // The user-unit links are rewritten in full; before and after stay in the log.
      statements.push(ctx.db.delete(userUnits).where(eq(userUnits.email, p.email)));
      for (const unitId of unitsAfter) {
        statements.push(ctx.db.insert(userUnits).values({ email: p.email, unitId }));
      }
    }

    return {
      description: current ? `Aggiorna l'utente ${p.email}.` : `Crea l'utente ${p.email}.`,
      rows,
      statements,
      count: 1,
    };
  },
});
