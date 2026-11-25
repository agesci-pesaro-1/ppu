import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { listTags } from '../src/services/admin/tags.ts';
import { confirm, propose } from '../src/services/previews.ts';
import { activeMembersOf, context, memberId, memberIds } from './helpers.ts';

// Demo seed: tag 8 "Campo invernale 2026" (Orsolini Lorenzo, Rinaldi Giacomo),
// tag 9 "campo invernale" (Tarducci Giulia), patrols 1 Aquile and 2 Volpi,
// tag 10 "Capo squadriglia" (Rinaldi, also in Volpi; Zanetti Alice, in Gazzelle).

describe('tag review', () => {
  it('lists the tags with uses and status', async () => {
    const tags = await listTags(context(), { type: 'varie', status: 'libero' });
    expect(tags.map((t) => [t.id, t.status, t.uses])).toEqual([
      [9, 'libero', 1],
      [8, 'libero', 2],
      [11, 'libero', 2],
    ]);
  });

  it('merges a duplicate: assignments moved, old tag archived', async () => {
    const ctx = context();
    const p = await propose(ctx, 'tag.merge', { fromId: 9, toId: 8 });
    expect(p.count).toBe(1);
    await confirm(ctx, p.id);
    expect(await activeMembersOf(8)).toEqual(
      await memberIds('Orsolini Lorenzo', 'Rinaldi Giacomo', 'Tarducci Giulia'),
    );
    expect(await activeMembersOf(9)).toEqual([]);
    const old = await env.DB.prepare('SELECT stato, unito_in_id FROM tag WHERE id = 9').first();
    expect(old).toEqual({ stato: 'archiviato', unito_in_id: 8 });
    // The history stays: the closed assignment still exists.
    const history = await env.DB.prepare(
      'SELECT rimosso_da FROM associati_tag WHERE tag_id = 9 AND associato_id = ?',
    )
      .bind(await memberId('Tarducci Giulia'))
      .first('rimosso_da');
    expect(history).toBe('webmaster@example.org');
  });

  it('who already has the target tag is not duplicated', async () => {
    const ctx = context();
    const [a, b] = await memberIds('Ugolini Chiara', 'Vannucci Martina');
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO tag (id, nome, tipo_id, creato_da) VALUES (101, 'Uscita al lago', 'varie', 'x@example.org'), (102, 'uscita lago', 'varie', 'x@example.org')",
      ),
      env.DB.prepare(
        "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (?1, 101, 'x@example.org'), (?1, 102, 'x@example.org'), (?2, 102, 'x@example.org')",
      ).bind(a, b),
    ]);
    const p = await propose(ctx, 'tag.merge', { fromId: 102, toId: 101 });
    await confirm(ctx, p.id, { count: 2 });
    expect(await activeMembersOf(101)).toEqual([a, b]);
    expect(await activeMembersOf(102)).toEqual([]);
  });

  it('merging two patrols is a mass operation: the count must be repeated', async () => {
    const ctx = context();
    const p = await propose(ctx, 'tag.merge', { fromId: 2, toId: 1 });
    expect(p).toMatchObject({ count: 3, mass: true });
    await expect(confirm(ctx, p.id)).rejects.toMatchObject({ code: 'bad_request' });
    await confirm(ctx, p.id, { count: 3 });
    expect(await activeMembersOf(1)).toHaveLength(6);
  });

  it('rejects a merge that would give two exclusive tags of the same type', async () => {
    // Zanetti (10) is in Gazzelle: merging "Capo squadriglia" into Aquile would give her two patrols.
    await expect(propose(context(), 'tag.merge', { fromId: 10, toId: 1 })).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('makes a tag official, with the change log', async () => {
    const ctx = context();
    const p = await propose(ctx, 'tag.status', { tagId: 11, status: 'ufficiale' });
    await confirm(ctx, p.id);
    expect(await env.DB.prepare('SELECT stato FROM tag WHERE id = 11').first('stato')).toBe(
      'ufficiale',
    );
    const log = await env.DB.prepare(
      "SELECT valore_prima, valore_dopo FROM modifiche WHERE operazione = ? AND entita = 'tag'",
    )
      .bind(p.id)
      .first();
    expect(log).toEqual({ valore_prima: '"libero"', valore_dopo: '"ufficiale"' });
  });

  it('who is not a webmaster cannot merge tags', async () => {
    await expect(
      propose(context({ webmaster: false, fullAccess: true }), 'tag.merge', { fromId: 9, toId: 8 }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});
