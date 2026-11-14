import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { HEADER_UTENTE_TEST } from '../src/identita/index.ts';

const chiama = (percorso: string, email?: string) =>
  exports.default.fetch(
    new Request(`https://ppu.test${percorso}`, {
      headers: email ? { [HEADER_UTENTE_TEST]: email } : {},
    }),
  );

describe('API REST', () => {
  it('/salute risponde senza autenticazione', async () => {
    const r = await chiama('/salute');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ stato: 'ok', ambiente: 'locale' });
  });

  it('senza identità risponde 401', async () => {
    const r = await chiama('/api/io');
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ errore: { codice: 'non_autenticato' } });
  });

  it('rifiuta account di altri domini', async () => {
    const r = await chiama('/api/io', 'qualcuno@altrodominio.org');
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ errore: { codice: 'dominio_non_ammesso' } });
  });

  it('restituisce unità e ruoli dalla tabella utenti', async () => {
    const r = await chiama('/api/io', 'Capo.EG@example.org');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      email: 'capo.eg@example.org',
      unita: ['esploratori', 'guide'],
      ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false, betaTester: true },
    });
  });

  it('un account del dominio senza riga in utenti è un capo in sola lettura', async () => {
    const r = await chiama('/api/io', 'nuovo.capo@example.org');
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      unita: [],
      ruoli: { accessoCompleto: false, buonaStrada: false, webmaster: false },
    });
  });

  it('un account escluso non entra', async () => {
    const r = await chiama('/api/io', 'segreteria@example.org');
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ errore: { codice: 'escluso' } });
  });

  it('percorso sconosciuto: 404 in JSON', async () => {
    const r = await chiama('/api/inesistente', 'capo.eg@example.org');
    expect(r.status).toBe(404);
  });
});
