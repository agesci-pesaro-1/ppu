import { expect, test } from '@playwright/test';

// API-level tests against the preview (or wrangler dev locally).
// Users are the fake ones of the demo data, all on example.org.
const HEADER = 'X-Ppu-Test-User';
const as = (email: string) => ({ headers: { [HEADER]: email } });

test('/health answers without authentication', async ({ request }) => {
  const r = await request.get('/health');
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.status).toBe('ok');
  expect(['local', 'preview']).toContain(body.environment);
});

test('no identity: 401', async ({ request }) => {
  const r = await request.get('/api/me');
  expect(r.status()).toBe(401);
  expect(await r.json()).toMatchObject({ error: { code: 'unauthenticated' } });
});

test('account from another domain: 403', async ({ request }) => {
  const r = await request.get('/api/me', as('qualcuno@altrodominio.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ error: { code: 'domain_not_allowed' } });
});

test('excluded account: 403', async ({ request }) => {
  const r = await request.get('/api/me', as('segreteria@example.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ error: { code: 'excluded' } });
});

const users = [
  {
    email: 'capo.lupetti@example.org',
    units: ['lupetti'],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'capo.coccinelle@example.org',
    units: ['coccinelle'],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'capo.eg@example.org',
    units: ['esploratori', 'guide'],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: true },
  },
  {
    email: 'capo.rs@example.org',
    units: ['clan', 'noviziato'],
    roles: { fullAccess: false, buonaStrada: true, webmaster: false, betaTester: false },
  },
  {
    email: 'capogruppo@example.org',
    units: [],
    roles: { fullAccess: true, buonaStrada: true, webmaster: false, betaTester: false },
  },
  {
    email: 'genitore.capo@example.org',
    units: ['esploratori'],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'webmaster@example.org',
    units: [],
    roles: { fullAccess: false, buonaStrada: false, webmaster: true, betaTester: true },
  },
  {
    // Domain account without a row in `utenti`: read-only leader.
    email: 'nuovo.capo@example.org',
    units: [],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
];

for (const expected of users) {
  test(`/api/me for ${expected.email}`, async ({ request }) => {
    const r = await request.get('/api/me', as(expected.email));
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject(expected);
  });
}
