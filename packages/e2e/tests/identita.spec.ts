import { expect, test } from '@playwright/test';

// Test a livello di API contro la preview (o wrangler dev in locale).
// Gli utenti sono quelli finti del seed demo, tutti su example.org.
const HEADER = 'X-Ppu-Utente-Test';
const come = (email: string) => ({ headers: { [HEADER]: email } });

test('/salute risponde senza autenticazione', async ({ request }) => {
  const r = await request.get('/salute');
  expect(r.status()).toBe(200);
  const corpo = await r.json();
  expect(corpo.stato).toBe('ok');
  expect(['locale', 'preview']).toContain(corpo.ambiente);
});

test('senza identità: 401', async ({ request }) => {
  const r = await request.get('/api/io');
  expect(r.status()).toBe(401);
  expect(await r.json()).toMatchObject({ errore: { codice: 'non_autenticato' } });
});

test('account di un altro dominio: 403', async ({ request }) => {
  const r = await request.get('/api/io', come('qualcuno@altrodominio.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ errore: { codice: 'dominio_non_ammesso' } });
});

test('account escluso: 403', async ({ request }) => {
  const r = await request.get('/api/io', come('segreteria@example.org'));
  expect(r.status()).toBe(403);
  expect(await r.json()).toMatchObject({ errore: { codice: 'escluso' } });
});

const ruoli = [
  {
    email: 'capo.lupetti@example.org',
    unita: ['lupetti'],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'capo.coccinelle@example.org',
    unita: ['coccinelle'],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'capo.eg@example.org',
    unita: ['esploratori', 'guide'],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: true },
  },
  {
    email: 'capo.rs@example.org',
    unita: ['clan', 'noviziato'],
    ruoli: { accessoCompleto: false, buonaStrada: true, webmaster: false, betaTester: false },
  },
  {
    email: 'capogruppo@example.org',
    unita: [],
    ruoli: { accessoCompleto: true, buonaStrada: true, webmaster: false, betaTester: false },
  },
  {
    email: 'genitore.capo@example.org',
    unita: ['esploratori'],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
  {
    email: 'webmaster@example.org',
    unita: [],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: true, betaTester: true },
  },
  {
    // Account del dominio senza riga in `utenti`: capo in sola lettura.
    email: 'nuovo.capo@example.org',
    unita: [],
    ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: false },
  },
];

for (const atteso of ruoli) {
  test(`/api/io per ${atteso.email}`, async ({ request }) => {
    const r = await request.get('/api/io', come(atteso.email));
    expect(r.status()).toBe(200);
    expect(await r.json()).toMatchObject(atteso);
  });
}
