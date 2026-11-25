// Browsing: list, card, units, demo users. Demo data (fake).
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { TEST_USER_COOKIE, TEST_USER_HEADER } from '../src/identity/index.ts';
import { ageOn } from '../src/services/browse.ts';
import { memberId } from './helpers.ts';

const get = (path: string, email?: string, cookie?: string) =>
  exports.default.fetch(
    new Request(`https://ppu.test${path}`, {
      headers: {
        ...(email ? { [TEST_USER_HEADER]: email } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    }),
  );

const LEADER = 'capo.lupetti@example.org';

const count = async (query: string): Promise<number> =>
  Number(await env.DB.prepare(query).first('n'));

describe('browsing', () => {
  it('lists active units with counts', async () => {
    const r = await get('/api/units', LEADER);
    expect(r.status).toBe(200);
    const units = (await r.json()) as { id: string; members: number }[];
    expect(units.map((u) => u.id)).toEqual([
      'lupetti',
      'coccinelle',
      'esploratori',
      'guide',
      'noviziato',
      'clan',
      'coca',
    ]);
    expect(units.find((u) => u.id === 'lupetti')?.members).toBe(
      await count(
        "SELECT count(*) n FROM associati WHERE unita_id = 'lupetti' AND stato = 'attivo'",
      ),
    );
  });

  it('member list: unit filter and search', async () => {
    const r = await get('/api/members?unit=esploratori', LEADER);
    const list = (await r.json()) as { lastName: string; unit: { id: string }; tags: string[] }[];
    expect(list).toHaveLength(
      await count(
        "SELECT count(*) n FROM associati WHERE unita_id = 'esploratori' AND stato = 'attivo'",
      ),
    );
    expect(list.every((a) => a.unit.id === 'esploratori')).toBe(true);
    expect(list.find((a) => a.lastName === 'Orsolini')?.tags).toContain('Aquile');

    const found = (await (
      await get('/api/members?q=giulia%20tarducci', LEADER)
    ).json()) as unknown[];
    expect(found).toHaveLength(1);
    const wildcard = (await (await get('/api/members?q=%25', LEADER)).json()) as unknown[];
    expect(wildcard).toHaveLength(0);
  });

  it('archived members only on request', async () => {
    const active = (await (await get('/api/members?q=Ricci', LEADER)).json()) as unknown[];
    expect(active).toHaveLength(0);
    const archived = (await (
      await get('/api/members?q=Ricci&status=archiviato', LEADER)
    ).json()) as unknown[];
    expect(archived).toHaveLength(1);
    expect((await get('/api/members?status=boh', LEADER)).status).toBe(400);
  });

  it('card: contacts yes, tax codes and residence never', async () => {
    const id = await memberId('Arcangeli Emma'); // father is a leader, has a brother
    const r = await get(`/api/members/${id}`, LEADER);
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).not.toMatch(/DEMO\d|DEMOT/);
    expect(text).not.toMatch(/codice_?fiscale|taxCode/i);
    expect(text).not.toMatch(/indirizzo|address|postcode/i);
    const c = JSON.parse(text);
    expect(c.lastName).toBe('Arcangeli');
    expect(c.guardians.length).toBeGreaterThan(0);
    expect(c.guardians[0].mobile).toMatch(/^\+39/);
    expect(c.relationships.map((x: { type: string }) => x.type).sort()).toEqual([
      'figlio',
      'fratello',
    ]);
    expect(c.privacy).toMatchObject({ privacyNotice: true });
  });

  it('card: unit history has both year and unit (joined `nome` columns)', async () => {
    const id = await memberId('Arcangeli Emma');
    const expected = (
      await env.DB.prepare(
        `SELECT y.nome AS year, u.nome AS unit FROM storico_unita s
           JOIN anni_scout y ON y.id = s.anno_scout_id
           JOIN unita u ON u.id = s.unita_id
         WHERE s.associato_id = ? ORDER BY y.data_inizio DESC, u.ordine`,
      )
        .bind(id)
        .all<{ year: string; unit: string }>()
    ).results;
    expect(expected.length).toBeGreaterThan(0);
    const c = (await (await get(`/api/members/${id}`, LEADER)).json()) as {
      unitHistory: { year: string; unit: string }[];
      attendance: { latest: { date: string; unit: string }[] };
    };
    expect(c.unitHistory).toEqual(expected);
    for (const r of c.attendance.latest) expect(r.unit).toEqual(expect.any(String));
  });

  it("card: adult members' archived guardians are not shown", async () => {
    const id = Number(
      await env.DB.prepare(
        'SELECT associato_id AS n FROM tutori GROUP BY associato_id HAVING min(archiviato) = 1 LIMIT 1',
      ).first('n'),
    );
    expect(id).toBeGreaterThan(0);
    const c = (await (await get(`/api/members/${id}`, LEADER)).json()) as { guardians: unknown[] };
    expect(c.guardians).toHaveLength(0);
  });

  it('card: canEdit follows the permissions', async () => {
    const cub = await count(
      "SELECT a.id n FROM associati a WHERE a.unita_id = 'lupetti' AND NOT EXISTS (SELECT 1 FROM utenti u WHERE u.associato_id = a.id) LIMIT 1",
    );
    const guide = await count("SELECT id n FROM associati WHERE unita_id = 'guide' LIMIT 1");
    const a = (await (await get(`/api/members/${cub}`, LEADER)).json()) as { canEdit: boolean };
    expect(a.canEdit).toBe(true);
    const b = (await (await get(`/api/members/${guide}`, LEADER)).json()) as { canEdit: boolean };
    expect(b.canEdit).toBe(false);
  });

  it('missing card or invalid id', async () => {
    expect((await get('/api/members/99999', LEADER)).status).toBe(404);
    expect((await get('/api/members/abc', LEADER)).status).toBe(400);
  });

  it('no identity: 401; excluded or not enabled: 403', async () => {
    expect((await get('/api/members')).status).toBe(401);
    expect((await get('/api/members', 'segreteria@example.org')).status).toBe(403);
    expect((await get('/api/members', 'nuovo.capo@example.org')).status).toBe(403);
  });

  it('/api/me exposes group name and environment', async () => {
    const me = await (await get('/api/me', LEADER)).json();
    expect(me).toMatchObject({ group: 'Gruppo Demo', environment: 'local', testMode: true });
  });

  it('test mode: identity from the cookie too', async () => {
    const r = await get(
      '/api/me',
      undefined,
      `other=1; ${TEST_USER_COOKIE}=capogruppo%40example.org`,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ email: 'capogruppo@example.org' });
  });

  it('test mode: list of fake users, without login', async () => {
    const r = await get('/api/demo/users');
    expect(r.status).toBe(200);
    const users = (await r.json()) as { email: string; description: string }[];
    expect(users.some((u) => u.email === 'webmaster@example.org')).toBe(true);
    expect(users.find((u) => u.email === 'capo.coca@example.org')?.description).toBe(
      'sola lettura',
    );
    expect(users.some((u) => u.email === 'nuovo.capo@example.org')).toBe(true);
    expect(users.find((u) => u.email === 'segreteria@example.org')?.description).toContain(
      'escluso',
    );
  });
});

describe('ageOn', () => {
  it('counts the birthday', () => {
    expect(ageOn('2010-11-13', '2026-11-13')).toBe(16);
    expect(ageOn('2010-11-14', '2026-11-13')).toBe(15);
    expect(ageOn(null, '2026-11-13')).toBeNull();
  });
});

describe('test mode: picking the user', () => {
  const post = (path: string, body: unknown) =>
    exports.default.fetch(
      new Request(`https://ppu.test${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );

  it('sets an HttpOnly cookie for a domain user', async () => {
    const r = await post('/api/demo/login', { email: 'Capo.EG@example.org' });
    expect(r.status).toBe(200);
    const cookie = r.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain(`${TEST_USER_COOKIE}=capo.eg%40example.org`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('rejects emails outside the domain', async () => {
    expect((await post('/api/demo/login', { email: 'x@other.org' })).status).toBe(400);
  });

  it('logout clears the cookie', async () => {
    const r = await post('/api/demo/logout', {});
    expect(r.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
