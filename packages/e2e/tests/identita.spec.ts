import { expect, test } from '@playwright/test';

// Test a livello di API contro la preview (o wrangler dev in locale).
// Gli utenti sono quelli finti del seed demo, tutti su example.org.
const HEADER = 'X-Ppu-Test-User';
const come = (email: string) => ({ headers: { [HEADER]: email } });

test('/health risponde senza autenticazione', async ({ request }) => {
  const r = await request.get('/health');
  expect(r.status()).toBe(200);
  const corpo = await r.json();
  expect(corpo.status).toBe('ok');
  expect(['local', 'preview']).toContain(corpo.environment);
});

test('senza identità: 401', async ({ request }) => {
  const r = await request.get('/api/me');
  expect(r.status()).toBe(401);
  expect(await r.json()).toMatchObject({ error: { code: 'unauthenticated' } });
});

test('account di un altro dominio: 403', async ({ request }) => {
  const r = await request.get('/api/me', come('qualcuno@altrodominio.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ error: { code: 'domain_not_allowed' } });
});

test('account escluso: 403', async ({ request }) => {
  const r = await request.get('/api/me', come('segreteria@example.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ error: { code: 'excluded' } });
});

const ruoli = [
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
    // Account del dominio senza riga in `utenti`: capo in sola lettura.
    email: 'nuovo.capo@example.org',
    units: [],
    roles: { fullAccess: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
];

for (const atteso of ruoli) {
  test(`/api/me per ${atteso.email}`, async ({ request }) => {
    const r = await request.get('/api/me', come(atteso.email));
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject(atteso);
  });
}
