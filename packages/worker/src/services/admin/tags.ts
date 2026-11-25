// Webmaster review of the tags: list with uses, status change (libero,
// ufficiale, archiviato) and merge of two tags.

import { and, asc, count, eq, isNull, ne, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { memberTags, scoutYears, tags } from '../../db/schema.ts';
import { AppError } from '../../errors.ts';
import type { ChangeRow } from '../audit-log.ts';
import type { Context } from '../context.ts';
import { registerType, type Statement } from '../previews.ts';
import { parse } from '../validation.ts';
import { ensureWebmaster } from './users.ts';

const TAG_STATUSES = ['libero', 'ufficiale', 'archiviato'] as const;
type TagStatus = (typeof TAG_STATUSES)[number];

const NOW = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export interface TagEntry {
  id: number;
  name: string;
  type: string;
  status: TagStatus;
  /** Scout year name, if the tag belongs to one. */
  year: string | null;
  exclusive: boolean;
  /** Active assignments. */
  uses: number;
  mergedInto: number | null;
}

async function loadTags(
  ctx: Context,
  filter: { id?: number; status?: TagStatus | undefined; type?: string | undefined },
) {
  const uses = ctx.db
    .select({ tagId: memberTags.tagId, n: count().as('uses') })
    .from(memberTags)
    .where(isNull(memberTags.removedAt))
    .groupBy(memberTags.tagId)
    .as('u');
  const rows = await ctx.db
    .select({
      id: tags.id,
      name: tags.name,
      type: tags.typeId,
      status: tags.status,
      scoutYearId: tags.scoutYearId,
      year: scoutYears.name,
      exclusive: tags.exclusive,
      uses: uses.n,
      mergedInto: tags.mergedIntoId,
    })
    .from(tags)
    .leftJoin(scoutYears, eq(scoutYears.id, tags.scoutYearId))
    .leftJoin(uses, eq(uses.tagId, tags.id))
    .where(
      and(
        filter.id === undefined ? undefined : eq(tags.id, filter.id),
        filter.status === undefined ? undefined : eq(tags.status, filter.status),
        filter.type === undefined ? undefined : eq(tags.typeId, filter.type),
      ),
    )
    .orderBy(asc(tags.typeId), sql`lower(${tags.name})`);
  return rows.map((r) => ({ ...r, uses: r.uses ?? 0 }));
}

export async function listTags(
  ctx: Context,
  filter: { status?: TagStatus | undefined; type?: string | undefined } = {},
): Promise<TagEntry[]> {
  ensureWebmaster(ctx);
  return (await loadTags(ctx, filter)).map(({ scoutYearId: _, ...entry }) => entry);
}

async function loadTag(ctx: Context, id: number) {
  const [t] = await loadTags(ctx, { id });
  if (!t) throw new AppError('not_found', `Tag ${id} inesistente.`);
  return t;
}

const statusSchema = z.strictObject({
  tagId: z.number().int().positive(),
  status: z.enum(TAG_STATUSES),
});

/** Makes a tag official, archives it or sets it back to free. */
export const setTagStatus = registerType<z.infer<typeof statusSchema>>({
  type: 'tag.status',
  validate: (p) => parse(statusSchema, p),
  async plan(ctx, p) {
    ensureWebmaster(ctx);
    const t = await loadTag(ctx, p.tagId);
    if (t.mergedInto !== null) {
      throw new AppError(
        'conflict',
        `Il tag "${t.name}" è stato unito a un altro e resta archiviato.`,
      );
    }
    if (t.status === 'archiviato' && p.status !== 'archiviato') {
      // Reactivating it must not create a duplicate among the active tags.
      const duplicate = await ctx.db
        .select({ id: tags.id })
        .from(tags)
        .where(
          and(
            ne(tags.id, t.id),
            ne(tags.status, 'archiviato'),
            sql`lower(${tags.name}) = lower(${t.name})`,
            eq(tags.typeId, t.type),
            sql`coalesce(${tags.scoutYearId}, 0) = coalesce(${t.scoutYearId}, 0)`,
          ),
        )
        .get();
      if (duplicate) {
        throw new AppError('conflict', `Esiste già un tag attivo "${t.name}" dello stesso tipo.`);
      }
    }
    const rows: ChangeRow[] =
      t.status === p.status
        ? []
        : [
            {
              entity: 'tag',
              entityId: t.id,
              field: 'stato',
              before: t.status,
              after: p.status,
              buonaStrada: false,
            },
          ];
    return {
      description: `Tag "${t.name}": ${t.status} → ${p.status}${t.uses ? ` (${t.uses} utilizzi restano nello storico)` : ''}.`,
      rows,
      statements: [ctx.db.update(tags).set({ status: p.status }).where(eq(tags.id, t.id))],
      count: 1,
    };
  },
});

const mergeSchema = z
  .strictObject({
    fromId: z.number().int().positive(),
    toId: z.number().int().positive(),
  })
  .refine((p) => p.fromId !== p.toId, 'un tag non si unisce a se stesso');

/** Active assignments of a tag, or of every tag of a type except some. */
function activeAssignments(ctx: Context, where: ReturnType<typeof and>) {
  return ctx.db
    .select({
      id: memberTags.id,
      memberId: memberTags.memberId,
      scoutYearId: memberTags.scoutYearId,
      note: memberTags.note,
    })
    .from(memberTags)
    .innerJoin(tags, eq(tags.id, memberTags.tagId))
    .where(and(isNull(memberTags.removedAt), where))
    .orderBy(memberTags.id);
}

const key = (a: { memberId: number; scoutYearId: number | null }) =>
  `${a.memberId}:${a.scoutYearId ?? 0}`;

/**
 * Merges tag `from` into tag `to`: the active assignments move to `to`
 * (closing the old ones, which stay in the history), `from` is archived with a
 * reference to `to`. If `to` is exclusive, nobody may end up with two tags of
 * that type in the same year.
 */
export const mergeTags = registerType<z.infer<typeof mergeSchema>>({
  type: 'tag.merge',
  validate: (p) => parse(mergeSchema, p),
  async plan(ctx, p) {
    ensureWebmaster(ctx);
    const from = await loadTag(ctx, p.fromId);
    const to = await loadTag(ctx, p.toId);
    if (from.status === 'archiviato') {
      throw new AppError('conflict', `Il tag "${from.name}" è già archiviato.`);
    }
    if (to.status === 'archiviato')
      throw new AppError('conflict', `Il tag "${to.name}" è archiviato.`);

    const moving = await activeAssignments(ctx, and(eq(memberTags.tagId, from.id)));
    const inTarget = new Set(
      (await activeAssignments(ctx, and(eq(memberTags.tagId, to.id)))).map(key),
    );
    if (to.exclusive) {
      // Other tags of the same type held by the same member in the same year.
      const sameType = new Set(
        (
          await activeAssignments(
            ctx,
            and(eq(tags.typeId, to.type), notInArray(memberTags.tagId, [from.id, to.id])),
          )
        ).map(key),
      );
      const conflicts = moving.filter((a) => sameType.has(key(a)));
      if (conflicts.length > 0) {
        throw new AppError(
          'conflict',
          `Unione impossibile: ${conflicts.length} associati avrebbero due tag esclusivi di tipo "${to.type}" nello stesso anno.`,
        );
      }
    }

    const rows: ChangeRow[] = [];
    const statements: Statement[] = [];
    for (const a of moving) {
      statements.push(
        ctx.db
          .update(memberTags)
          .set({ removedAt: NOW, removedBy: ctx.user.email })
          .where(and(eq(memberTags.id, a.id), isNull(memberTags.removedAt))),
      );
      if (!inTarget.has(key(a))) {
        statements.push(
          ctx.db.insert(memberTags).values({
            memberId: a.memberId,
            tagId: to.id,
            scoutYearId: a.scoutYearId,
            note: a.note,
            createdBy: ctx.user.email,
          }),
        );
      }
      rows.push({
        entity: 'associati_tag',
        entityId: a.memberId,
        field: 'tag_id',
        before: from.id,
        after: to.id,
        buonaStrada: false,
      });
    }
    statements.push(
      ctx.db
        .update(tags)
        .set({ status: 'archiviato', mergedIntoId: to.id })
        .where(eq(tags.id, from.id)),
    );
    rows.push(
      {
        entity: 'tag',
        entityId: from.id,
        field: 'stato',
        before: from.status,
        after: 'archiviato',
        buonaStrada: false,
      },
      {
        entity: 'tag',
        entityId: from.id,
        field: 'unito_in_id',
        before: null,
        after: to.id,
        buonaStrada: false,
      },
    );

    return {
      description: `Unisce "${from.name}" in "${to.name}": ${moving.length} assegnazioni spostate, "${from.name}" archiviato.`,
      rows,
      statements,
      count: Math.max(moving.length, 1),
    };
  },
});
