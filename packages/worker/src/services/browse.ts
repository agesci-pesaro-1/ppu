// Browsing: member list and card, units.
//
// Every enabled leader reads everything, but answers are minimal: no tax codes
// and no sensitive fields (see src/domain/fields.ts; residence is sensitive and
// stays out of the card). Queries select explicit columns: a sensitive field
// cannot slip out through a SELECT *.

import { and, asc, desc, eq, isNull, ne, or, type SQL, sql } from 'drizzle-orm';
import type { Db } from '../db/index.ts';
import {
  attendance,
  guardians,
  meetings,
  members,
  memberTags,
  progression,
  progressionCatalog,
  relationships,
  scoutYears,
  tags,
  unitHistory,
  units,
  users,
  userUnits,
} from '../db/schema.ts';
import { AppError } from '../errors.ts';
import type { User } from '../identity/index.ts';
import { canEditMember, canRead, ensure } from './permissions.ts';

const READ_DENIED = 'Lettura non consentita.';

export interface UnitWithCount {
  id: string;
  name: string;
  branch: string;
  members: number;
}

export async function listUnits(db: Db, user: User): Promise<UnitWithCount[]> {
  ensure(canRead(user), READ_DENIED);
  return db
    .select({
      id: units.id,
      name: units.name,
      branch: units.branchId,
      members: db.$count(members, and(eq(members.unitId, units.id), eq(members.status, 'attivo'))),
    })
    .from(units)
    .where(eq(units.active, true))
    .orderBy(asc(units.sortOrder), asc(units.name));
}

export type StatusFilter = 'attivo' | 'archiviato' | 'tutti';
const STATUS_FILTERS: readonly StatusFilter[] = ['attivo', 'archiviato', 'tutti'];

export interface ListFilters {
  q?: string | undefined;
  unit?: string | undefined;
  status?: string | undefined;
}

export interface ListEntry {
  id: number;
  lastName: string;
  firstName: string;
  unit: { id: string; name: string } | null;
  birthYear: number | null;
  age: number | null;
  status: 'attivo' | 'archiviato';
  tags: string[];
}

/** Age reached on `today` (YYYY-MM-DD). */
export function ageOn(birthDate: string | null, today: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const currentYearId = sql`(SELECT ${scoutYears.id} FROM ${scoutYears} WHERE ${scoutYears.current} = 1)`;

/** Assignment active in the current scout year (or with no year), on a tag not archived. */
const activeAssignment = and(
  isNull(memberTags.removedAt),
  ne(tags.status, 'archiviato'),
  or(isNull(memberTags.scoutYearId), eq(memberTags.scoutYearId, currentYearId)),
);

const MAX_RESULTS = 500;

export async function searchMembers(
  db: Db,
  user: User,
  filters: ListFilters,
): Promise<ListEntry[]> {
  ensure(canRead(user), READ_DENIED);
  const status = (filters.status ?? 'attivo') as StatusFilter;
  if (!STATUS_FILTERS.includes(status)) {
    throw new AppError('bad_request', 'Filtro di stato non valido.');
  }
  const conditions: SQL[] = [];
  if (status !== 'tutti') conditions.push(eq(members.status, status));
  if (filters.unit) conditions.push(eq(members.unitId, filters.unit));
  const q = filters.q?.trim().replace(/\s+/g, ' ');
  if (q) {
    // Matches "last first" and "first last", case-insensitive.
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      sql`((${members.lastName} || ' ' || ${members.firstName}) LIKE ${like} ESCAPE '\\' OR (${members.firstName} || ' ' || ${members.lastName}) LIKE ${like} ESCAPE '\\')`,
    );
  }
  const currentTags = db
    .select({ names: sql<string | null>`group_concat(${tags.name}, '|')` })
    .from(memberTags)
    .innerJoin(tags, eq(tags.id, memberTags.tagId))
    .where(and(eq(memberTags.memberId, members.id), activeAssignment));
  const rows = await db
    .select({
      id: members.id,
      lastName: members.lastName,
      firstName: members.firstName,
      birthDate: members.birthDate,
      status: members.status,
      unitId: units.id,
      unitName: units.name,
      tags: sql<string | null>`(${currentTags})`,
    })
    .from(members)
    .leftJoin(units, eq(units.id, members.unitId))
    .where(and(...conditions))
    .orderBy(sql`${members.lastName} COLLATE NOCASE`, sql`${members.firstName} COLLATE NOCASE`)
    .limit(MAX_RESULTS);
  const today = todayIso();
  return rows.map((r) => ({
    id: r.id,
    lastName: r.lastName,
    firstName: r.firstName,
    unit: r.unitId ? { id: r.unitId, name: r.unitName ?? r.unitId } : null,
    birthYear: r.birthDate ? Number(r.birthDate.slice(0, 4)) : null,
    age: ageOn(r.birthDate, today),
    status: r.status,
    tags: r.tags ? r.tags.split('|').sort() : [],
  }));
}

export interface MemberCard {
  id: number;
  censusCode: string | null;
  lastName: string;
  firstName: string;
  birthDate: string | null;
  birthPlace: string | null;
  age: number | null;
  unit: { id: string; name: string } | null;
  status: 'attivo' | 'archiviato';
  isLeader: boolean;
  contacts: { mobile: string | null; email: string | null; receivesCommunications: boolean };
  privacy: {
    privacyNotice: boolean;
    privacyNoticeDate: string | null;
    consent2a: boolean;
    consent2b: boolean;
    consent2c: boolean;
    notes: string | null;
  };
  guardians: {
    id: number;
    role: string;
    lastName: string;
    firstName: string;
    mobile: string | null;
    email: string | null;
    linkedMemberId: number | null;
  }[];
  relationships: { type: string; memberId: number; lastName: string; firstName: string }[];
  tags: { name: string; type: string }[];
  progression: { date: string | null; type: string | null; description: string | null }[];
  attendance: {
    counts: { presente: number; assente: number; giustificato: number };
    latest: {
      date: string;
      type: string;
      unit: string;
      status: string;
      reason: string | null;
    }[];
  };
  unitHistory: { year: string; unit: string }[];
  /** Only a hint for the UI: the real check is in the editing services. */
  canEdit: boolean;
}

export async function memberCard(db: Db, user: User, id: number): Promise<MemberCard> {
  ensure(canRead(user), READ_DENIED);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('bad_request', 'Identificativo non valido.');
  }
  const a = await db
    .select({
      id: members.id,
      censusCode: members.censusCode,
      lastName: members.lastName,
      firstName: members.firstName,
      birthDate: members.birthDate,
      birthPlace: members.birthPlace,
      unitId: members.unitId,
      unitName: units.name,
      status: members.status,
      mobile: members.mobile,
      email: members.email,
      receivesCommunications: members.receivesCommunications,
      privacyNotice: members.privacyNotice,
      privacyNoticeDate: members.privacyNoticeDate,
      consent2a: members.consent2a,
      consent2b: members.consent2b,
      consent2c: members.consent2c,
      privacyNotes: members.privacyNotes,
      isLeader: sql<number>`EXISTS (SELECT 1 FROM ${users} WHERE ${users.memberId} = ${members.id})`,
    })
    .from(members)
    .leftJoin(units, eq(units.id, members.unitId))
    .where(eq(members.id, id))
    .get();
  if (!a) throw new AppError('not_found', 'Associato non trovato.');

  const other = db
    .select({ id: members.id, lastName: members.lastName, firstName: members.firstName })
    .from(members)
    .as('other');

  // db.batch() on D1 returns rows as objects keyed by column name: two selected
  // columns with the same SQL name (e.g. `nome` from two joined tables) collapse
  // into one. Joined columns that clash are aliased with `.as()`.
  const [guardianRows, relationshipRows, tagRows, progressionRows, counts, latest, history] =
    await db.batch([
      db
        .select({
          id: guardians.id,
          role: guardians.role,
          lastName: guardians.lastName,
          firstName: guardians.firstName,
          mobile: guardians.mobile,
          email: guardians.email,
          linkedMemberId: guardians.linkedMemberId,
        })
        .from(guardians)
        .where(and(eq(guardians.memberId, id), eq(guardians.archived, false)))
        .orderBy(asc(guardians.id)),
      db
        .select({
          type: relationships.type,
          memberId: relationships.otherMemberId,
          lastName: other.lastName,
          firstName: other.firstName,
        })
        .from(relationships)
        .innerJoin(other, eq(other.id, relationships.otherMemberId))
        .where(and(eq(relationships.memberId, id), eq(relationships.archived, false)))
        .orderBy(asc(relationships.type), asc(other.lastName), asc(other.firstName)),
      db
        .select({ name: tags.name, type: tags.typeId })
        .from(memberTags)
        .innerJoin(tags, eq(tags.id, memberTags.tagId))
        .where(and(eq(memberTags.memberId, id), activeAssignment))
        .orderBy(asc(tags.typeId), asc(tags.name)),
      db
        .select({
          date: progression.date,
          type: sql<string | null>`coalesce(${progressionCatalog.type}, ${progression.type})`,
          description: sql<
            string | null
          >`coalesce(${progressionCatalog.name}, ${progression.description})`,
        })
        .from(progression)
        .leftJoin(progressionCatalog, eq(progressionCatalog.id, progression.catalogId))
        .where(and(eq(progression.memberId, id), eq(progression.archived, false)))
        .orderBy(desc(progression.date), desc(progression.id)),
      db
        .select({ status: attendance.status, n: sql<number>`count(*)` })
        .from(attendance)
        .innerJoin(meetings, eq(meetings.id, attendance.meetingId))
        .where(
          and(
            eq(attendance.memberId, id),
            eq(meetings.archived, false),
            eq(meetings.scoutYearId, currentYearId),
          ),
        )
        .groupBy(attendance.status),
      db
        .select({
          date: meetings.date,
          type: meetings.type,
          unit: sql<string>`${units.name}`.as('unit'),
          status: attendance.status,
          reason: attendance.reason,
        })
        .from(attendance)
        .innerJoin(meetings, eq(meetings.id, attendance.meetingId))
        .innerJoin(units, eq(units.id, meetings.unitId))
        .where(and(eq(attendance.memberId, id), eq(meetings.archived, false)))
        .orderBy(desc(meetings.date))
        .limit(10),
      db
        .select({
          year: sql<string>`${scoutYears.name}`.as('year'),
          unit: sql<string>`${units.name}`.as('unit'),
        })
        .from(unitHistory)
        .innerJoin(scoutYears, eq(scoutYears.id, unitHistory.scoutYearId))
        .innerJoin(units, eq(units.id, unitHistory.unitId))
        .where(eq(unitHistory.memberId, id))
        .orderBy(desc(scoutYears.startDate), asc(units.sortOrder)),
    ]);

  const attendanceCounts = { presente: 0, assente: 0, giustificato: 0 };
  for (const r of counts) attendanceCounts[r.status] = Number(r.n);
  const isLeader = Number(a.isLeader) === 1;

  return {
    id: a.id,
    censusCode: a.censusCode,
    lastName: a.lastName,
    firstName: a.firstName,
    birthDate: a.birthDate,
    birthPlace: a.birthPlace,
    age: ageOn(a.birthDate, todayIso()),
    unit: a.unitId ? { id: a.unitId, name: a.unitName ?? a.unitId } : null,
    status: a.status,
    isLeader,
    contacts: {
      mobile: a.mobile,
      email: a.email,
      receivesCommunications: a.receivesCommunications,
    },
    privacy: {
      privacyNotice: a.privacyNotice,
      privacyNoticeDate: a.privacyNoticeDate,
      consent2a: a.consent2a,
      consent2b: a.consent2b,
      consent2c: a.consent2c,
      notes: a.privacyNotes,
    },
    guardians: guardianRows,
    relationships: relationshipRows,
    tags: tagRows,
    progression: progressionRows,
    attendance: { counts: attendanceCounts, latest },
    unitHistory: history,
    canEdit: canEditMember(user, { id: a.id, unitId: a.unitId, isLeader }),
  };
}

export interface DemoUser {
  email: string;
  label: string;
  description: string;
}

/**
 * Users to pick on the "Scegli un ruolo" screen of test mode. Descriptions are
 * shown to the user (Italian). The caller must check that test mode is on.
 */
export async function demoUsers(db: Db, domain: string): Promise<DemoUser[]> {
  const rows = await db
    .select({
      email: users.email,
      fullAccess: users.fullAccess,
      buonaStrada: users.buonaStrada,
      webmaster: users.webmaster,
      excluded: users.excluded,
      units: sql<
        string | null
      >`(SELECT group_concat(${units.name}, ', ') FROM ${userUnits} JOIN ${units} ON ${units.id} = ${userUnits.unitId} WHERE ${userUnits.email} = ${users.email})`,
      person: sql<string | null>`${members.firstName} || ' ' || ${members.lastName}`,
    })
    .from(users)
    .leftJoin(members, eq(members.id, users.memberId))
    .orderBy(asc(users.excluded), asc(users.webmaster), desc(users.fullAccess), asc(users.email));
  const list = rows.map((u) => {
    const roles: string[] = [];
    if (u.fullAccess) roles.push('accesso completo');
    if (u.units) roles.push(`modifica: ${u.units}`);
    if (u.buonaStrada) roles.push('referente Buona Strada');
    if (u.webmaster) roles.push('webmaster');
    if (u.excluded) roles.push('account escluso');
    return {
      email: u.email,
      label: u.person ?? u.email.split('@')[0] ?? u.email,
      description: roles.join(' · ') || 'sola lettura',
    };
  });
  // A domain account without a row in `utenti`: not enabled (ADR 0011).
  list.push({
    email: `nuovo.capo@${domain}`,
    label: 'Capo non ancora abilitato',
    description: 'account del dominio senza riga in utenti',
  });
  return list;
}
