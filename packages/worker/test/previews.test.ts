import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { listUsers } from '../src/services/admin/users.ts';
import { cancel, confirm, PREVIEW_TTL_MS, propose } from '../src/services/previews.ts';
import { context } from './helpers.ts';

const newLeader = { email: 'nuovo.capo@example.org', units: ['lupetti'], buonaStrada: true };
// The database state is shared by the tests of a file: each test uses its own email.
let n = 0;
const leader = () => ({ email: `capo.prova${++n}@example.org`, units: ['guide'] });

describe('preview and confirmation', () => {
  it('who is not a webmaster can neither read nor propose', async () => {
    const ctx = context({ email: 'capogruppo@example.org', webmaster: false, fullAccess: true });
    await expect(listUsers(ctx)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(propose(ctx, 'user.set', newLeader)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('the preview changes nothing; the confirmation applies data and log', async () => {
    const ctx = context();
    const p = await propose(ctx, 'user.set', newLeader);
    expect(p).toMatchObject({ type: 'user.set', count: 1, mass: false });
    expect(p.changes).toEqual([
      {
        entity: 'utenti',
        entityId: 'nuovo.capo@example.org',
        field: null,
        before: null,
        after: {
          accesso_completo: false,
          buona_strada: true,
          webmaster: false,
          beta_tester: false,
          escluso: false,
          unita: ['lupetti'],
          associato_id: null,
        },
      },
    ]);
    const beforeConfirmation = await env.DB.prepare('SELECT 1 FROM utenti WHERE email = ?')
      .bind('nuovo.capo@example.org')
      .first();
    expect(beforeConfirmation).toBeNull();

    await confirm(ctx, p.id);

    const row = await env.DB.prepare(
      `SELECT u.buona_strada, group_concat(uu.unita_id) AS unita FROM utenti u
         JOIN utenti_unita uu ON uu.email = u.email WHERE u.email = ? GROUP BY u.email`,
    )
      .bind('nuovo.capo@example.org')
      .first();
    expect(row).toEqual({ buona_strada: 1, unita: 'lupetti' });
    const log = await env.DB.prepare(
      'SELECT autore_email, canale, entita, stato_buona_strada FROM modifiche WHERE operazione = ?',
    )
      .bind(p.id)
      .all();
    expect(log.results).toEqual([
      {
        autore_email: 'webmaster@example.org',
        canale: 'admin',
        entita: 'utenti',
        stato_buona_strada: null,
      },
    ]);
  });

  it('a second confirmation is rejected', async () => {
    const ctx = context();
    const p = await propose(ctx, 'user.set', {
      email: 'capo.lupetti@example.org',
      betaTester: true,
    });
    await confirm(ctx, p.id);
    await expect(confirm(ctx, p.id)).rejects.toMatchObject({ code: 'invalid_preview' });
  });

  it('another user cannot confirm the preview', async () => {
    const p = await propose(context(), 'user.set', leader());
    const other = context({ email: 'altro.webmaster@example.org' });
    await expect(confirm(other, p.id)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('an expired preview cannot be confirmed', async () => {
    const start = new Date('2026-11-12T10:00:00Z');
    const p = await propose(context({}, start), 'user.set', leader());
    const later = new Date(start.getTime() + PREVIEW_TTL_MS + 1000);
    await expect(confirm(context({}, later), p.id)).rejects.toMatchObject({
      code: 'invalid_preview',
    });
    const status = await env.DB.prepare('SELECT stato FROM anteprime WHERE id = ?')
      .bind(p.id)
      .first('stato');
    expect(status).toBe('scaduta');
  });

  it('if the data changes after the preview, the confirmation is rejected', async () => {
    const ctx = context();
    const p = await propose(ctx, 'user.set', {
      email: 'capo.lupetti@example.org',
      units: ['coccinelle'],
    });
    await env.DB.prepare(
      "INSERT INTO utenti_unita (email, unita_id) VALUES ('capo.lupetti@example.org', 'clan')",
    ).run();
    await expect(confirm(ctx, p.id)).rejects.toMatchObject({ code: 'invalid_preview' });
  });

  it('permissions are checked again on confirmation', async () => {
    const p = await propose(context(), 'user.set', leader());
    // Same author, who meanwhile lost the webmaster role.
    await expect(confirm(context({ webmaster: false }), p.id)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('a cancelled operation cannot be confirmed', async () => {
    const ctx = context();
    const p = await propose(ctx, 'user.set', leader());
    await cancel(ctx, p.id);
    await expect(confirm(ctx, p.id)).rejects.toMatchObject({ code: 'invalid_preview' });
  });

  it('the last webmaster cannot lose the role', async () => {
    await expect(
      propose(context(), 'user.set', { email: 'webmaster@example.org', webmaster: false }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('rejects emails outside the domain and unknown units', async () => {
    await expect(
      propose(context(), 'user.set', { email: 'x@altrodominio.org' }),
    ).rejects.toMatchObject({ code: 'bad_request' });
    await expect(
      propose(context(), 'user.set', { email: 'x@example.org', units: ['inesistente'] }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('units are added and deactivated, never deleted', async () => {
    const ctx = context();
    const a = await propose(ctx, 'unit.set', {
      id: 'branco_misto',
      name: 'Branco misto',
      branchId: 'lc',
    });
    await confirm(ctx, a.id);
    const b = await propose(ctx, 'unit.set', { id: 'coccinelle', active: false });
    expect(b.description).toMatch(/associati attivi/);
    await confirm(ctx, b.id);
    const rows = await env.DB.prepare(
      "SELECT id, attiva FROM unita WHERE id IN ('branco_misto', 'coccinelle') ORDER BY id",
    ).all();
    expect(rows.results).toEqual([
      { id: 'branco_misto', attiva: 1 },
      { id: 'coccinelle', attiva: 0 },
    ]);
  });

  it('rejects a unit in a branch that is not configured', async () => {
    await expect(
      propose(context(), 'unit.set', {
        id: 'reparto_nautico',
        name: 'Nautico',
        branchId: 'nautici',
      }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });
});
