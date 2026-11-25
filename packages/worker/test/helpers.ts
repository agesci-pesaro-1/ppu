import { env } from 'cloudflare:workers';
import { and, eq, isNull } from 'drizzle-orm';
import { createDb } from '../src/db/index.ts';
import { members, memberTags } from '../src/db/schema.ts';
import type { User } from '../src/identity/index.ts';
import type { Context } from '../src/services/context.ts';
// Operation types register themselves on import.
import '../src/services/admin/tags.ts';
import '../src/services/admin/units.ts';
import '../src/services/admin/users.ts';

export const db = createDb(env.DB);

export const user = (u: Partial<User> = {}): User => ({
  email: 'webmaster@example.org',
  memberId: null,
  units: [],
  fullAccess: false,
  buonaStrada: false,
  webmaster: true,
  betaTester: false,
  ...u,
});

export const context = (u: Partial<User> = {}, now?: Date): Context => ({
  db,
  user: user(u),
  channel: 'admin',
  domain: 'example.org',
  ...(now ? { now: () => now } : {}),
});

/** Id of a demo member, from "Last First" (ids are assigned by the demo seed). */
export async function memberId(name: string): Promise<number> {
  const [lastName, firstName] = name.split(' ');
  const row = await db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.lastName, lastName ?? ''), eq(members.firstName, firstName ?? '')))
    .get();
  if (!row) throw new Error(`demo member not found: ${name}`);
  return row.id;
}

export const memberIds = async (...names: string[]) =>
  (await Promise.all(names.map(memberId))).sort((a, b) => a - b);

/** Members with an active assignment of the tag, sorted by id. */
export async function activeMembersOf(tagId: number): Promise<number[]> {
  const rows = await db
    .select({ memberId: memberTags.memberId })
    .from(memberTags)
    .where(and(eq(memberTags.tagId, tagId), isNull(memberTags.removedAt)))
    .orderBy(memberTags.memberId);
  return rows.map((r) => r.memberId);
}
