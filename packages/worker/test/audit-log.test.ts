import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { changeLogStatements, logAccess, newOperation } from '../src/services/audit-log.ts';

describe('audit log', () => {
  it('saves data and log in the same batch', async () => {
    const op = newOperation('capo.eg@example.org', 'pwa');
    await env.DB.batch([
      env.DB.prepare("UPDATE associati SET cap = '00001' WHERE id = 13"),
      ...changeLogStatements(env.DB, op, [
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
    const { results } = await env.DB.prepare(
      'SELECT campo, valore_prima, valore_dopo, stato_buona_strada, canale FROM modifiche WHERE operazione = ? ORDER BY id',
    )
      .bind(op.id)
      .all();
    expect(results).toEqual([
      {
        campo: 'cap',
        valore_prima: '"00000"',
        valore_dopo: '"00001"',
        stato_buona_strada: 'da_riportare',
        canale: 'pwa',
      },
      {
        campo: 'note_privacy',
        valore_prima: 'null',
        valore_dopo: '"x"',
        stato_buona_strada: null,
        canale: 'pwa',
      },
    ]);
  });

  it('if the log fails, the data does not change', async () => {
    const op = newOperation('capo.eg@example.org', 'pwa');
    const rows = changeLogStatements(env.DB, { ...op, channel: 'unknown' as 'pwa' }, [
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
      env.DB.batch([env.DB.prepare("UPDATE associati SET cap = '00002' WHERE id = 14"), ...rows]),
    ).rejects.toThrow();
    const cap = await env.DB.prepare('SELECT cap FROM associati WHERE id = 14').first('cap');
    expect(cap).toBe('00000');
  });

  it('the database rejects a Buona Strada confirmation by the author', async () => {
    await expect(
      env.DB.prepare(
        `UPDATE modifiche SET stato_buona_strada = 'riportata', confermata_da = autore_email,
           confermata_il = '2026-11-12T00:00:00Z' WHERE operazione = 'demo-op-1'`,
      ).run(),
    ).rejects.toThrow();
  });

  it('logs sensitive reads', async () => {
    await logAccess(env.DB, {
      email: 'capo.rs@example.org',
      channel: 'pwa',
      entity: 'associati',
      entityId: 25,
      fields: ['codice_fiscale'],
    });
    const r = await env.DB.prepare('SELECT campi FROM accessi WHERE email = ?')
      .bind('capo.rs@example.org')
      .first('campi');
    expect(r).toBe('["codice_fiscale"]');
  });
});
