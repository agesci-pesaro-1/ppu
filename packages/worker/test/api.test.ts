import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { TEST_USER_HEADER } from '../src/identity/index.ts';

const call = (path: string, email?: string) =>
  exports.default.fetch(
    new Request(`https://ppu.test${path}`, {
      headers: email ? { [TEST_USER_HEADER]: email } : {},
    }),
  );

describe('REST API', () => {
  it('/health answers without authentication', async () => {
    const r = await call('/health');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'ok', environment: 'local' });
  });

  it('answers 401 without an identity', async () => {
    const r = await call('/api/me');
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ error: { code: 'unauthenticated' } });
  });

  it('rejects accounts from other domains', async () => {
    const r = await call('/api/me', 'someone@otherdomain.org');
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ error: { code: 'domain_not_allowed' } });
  });

  it('returns units and roles from the utenti table', async () => {
    const r = await call('/api/me', 'Capo.EG@example.org');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      email: 'capo.eg@example.org',
      units: ['esploratori', 'guide'],
      roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: true },
    });
  });

  it('a domain account without a row in utenti is a read-only leader', async () => {
    const r = await call('/api/me', 'nuovo.capo@example.org');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      units: [],
      roles: { fullAccess: false, buonaStrada: false, webmaster: false },
    });
  });

  it('an excluded account is rejected', async () => {
    const r = await call('/api/me', 'segreteria@example.org');
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ error: { code: 'excluded' } });
  });

  it('unknown path: 404 in JSON', async () => {
    const r = await call('/api/missing', 'capo.eg@example.org');
    expect(r.status).toBe(404);
    expect(await r.json()).toMatchObject({ error: { code: 'not_found' } });
  });
});
