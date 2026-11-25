import { env } from 'cloudflare:workers';
import { asc, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { createDb } from '../src/db/index.ts';
import { accessLog, changes, members } from '../src/db/schema.ts';
import { changeLogInserts, logAccess, newOperation } from '../src/services/audit-log.ts';

const db = createDb(env.DB);

const postcodeOf = async (id: number) =>
  (await db.select({ postcode: members.postcode }).from(members).where(eq(members.id, id)).get())
    ?.postcode;

describe('audit log', () => {
  it('saves data and log in the same batch', async () => {
    const op = newOperation('capo.eg@example.org', 'pwa');
    await db.batch([
      db.update(members).set({ postcode: '00001' }).where(eq(members.id, 13)),
      ...changeLogInserts(db, op, [
        {
          entity: 'associati',
          entityId: 13,
          field: 'cap',
          before: '00000',
          after: '00001',
          buonaStrada: true,
        },
        {
          entity: 'associati',
          entityId: 13,
          field: 'note_privacy',
          before: null,
          after: 'x',
          buonaStrada: false,
        },
      ]),
    ]);
    const rows = await db
      .select({
        field: changes.field,
        valueBefore: changes.valueBefore,
        valueAfter: changes.valueAfter,
        buonaStradaStatus: changes.buonaStradaStatus,
        channel: changes.channel,
      })
      .from(changes)
      .where(eq(changes.operation, op.id))
      .orderBy(asc(changes.id));
    expect(rows).toEqual([
      {
        field: 'cap',
        valueBefore: '"00000"',
        valueAfter: '"00001"',
        buonaStradaStatus: 'da_riportare',
        channel: 'pwa',
      },
      {
        field: 'note_privacy',
        valueBefore: 'null',
        valueAfter: '"x"',
        buonaStradaStatus: null,
        channel: 'pwa',
      },
    ]);
    expect(await postcodeOf(13)).toBe('00001');
  });

  it('if the log fails, the data does not change', async () => {
    const op = newOperation('capo.eg@example.org', 'pwa');
    const log = changeLogInserts(db, { ...op, channel: 'unknown' as 'pwa' }, [
      {
        entity: 'associati',
        entityId: 14,
        field: 'cap',
        before: '00000',
        after: '00002',
        buonaStrada: true,
      },
    ]);
    await expect(
      db.batch([db.update(members).set({ postcode: '00002' }).where(eq(members.id, 14)), ...log]),
    ).rejects.toThrow();
    expect(await postcodeOf(14)).toBe('00000');
  });

  it('the database rejects a Buona Strada confirmation by the author', async () => {
    await expect(
      db
        .update(changes)
        .set({
          buonaStradaStatus: 'riportata',
          confirmedBy: sql`${changes.authorEmail}`,
          confirmedAt: '2026-11-12T00:00:00Z',
        })
        .where(eq(changes.operation, 'demo-op-1'))
        .run(),
    ).rejects.toThrow();
  });

  it('logs sensitive reads', async () => {
    await logAccess(db, {
      email: 'capo.rs@example.org',
      channel: 'pwa',
      entity: 'associati',
      entityId: 25,
      fields: ['codice_fiscale'],
    });
    const row = await db
      .select({ fields: accessLog.fields })
      .from(accessLog)
      .where(eq(accessLog.email, 'capo.rs@example.org'))
      .get();
    expect(row?.fields).toBe('["codice_fiscale"]');
  });
});
