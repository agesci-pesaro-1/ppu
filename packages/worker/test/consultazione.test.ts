// Consultazione: elenco, scheda, unità, utenti demo. Dati del seed demo (inventati).
import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { COOKIE_UTENTE_TEST, HEADER_UTENTE_TEST } from '../src/identita/index.ts';
import { etaAl } from '../src/servizi/consultazione.ts';

const get = (percorso: string, email?: string, cookie?: string) =>
  exports.default.fetch(
    new Request(`https://ppu.test${percorso}`, {
      headers: {
        ...(email ? { [HEADER_UTENTE_TEST]: email } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    }),
  );

const CAPO = 'capo.lupetti@example.org';

describe('consultazione', () => {
  it('elenco unità attive con conteggi', async () => {
    const r = await get('/api/unita', CAPO);
    expect(r.status).toBe(200);
    const unita = (await r.json()) as { id: string; associati: number }[];
    expect(unita.map((u) => u.id)).toEqual([
      'lupetti',
      'coccinelle',
      'esploratori',
      'guide',
      'noviziato',
      'clan',
      'coca',
    ]);
    expect(unita.find((u) => u.id === 'lupetti')?.associati).toBe(6);
  });

  it('elenco associati: filtri per unità e ricerca', async () => {
    const r = await get('/api/associati?unita=esploratori', CAPO);
    const elenco = (await r.json()) as { cognome: string; unita: { id: string }; tag: string[] }[];
    expect(elenco).toHaveLength(6);
    expect(elenco.every((a) => a.unita.id === 'esploratori')).toBe(true);
    expect(elenco.find((a) => a.cognome === 'Orsolini')?.tag).toContain('Aquile');

    const cerca = (await (
      await get('/api/associati?q=giulia%20tarducci', CAPO)
    ).json()) as unknown[];
    expect(cerca).toHaveLength(1);
    const jolly = (await (await get('/api/associati?q=%25', CAPO)).json()) as unknown[];
    expect(jolly).toHaveLength(0);
  });

  it('archiviati solo su richiesta', async () => {
    const attivi = (await (await get('/api/associati?q=Ricci', CAPO)).json()) as unknown[];
    expect(attivi).toHaveLength(0);
    const archiviati = (await (
      await get('/api/associati?q=Ricci&stato=archiviato', CAPO)
    ).json()) as unknown[];
    expect(archiviati).toHaveLength(1);
    expect((await get('/api/associati?stato=boh', CAPO)).status).toBe(400);
  });

  it('scheda: contatti sì, codici fiscali mai', async () => {
    const r = await get('/api/associati/11', CAPO); // Arcangeli Emma: padre capo, fratello
    expect(r.status).toBe(200);
    const testo = await r.text();
    expect(testo).not.toMatch(/DEMO\d|DEMOT/);
    expect(testo).not.toMatch(/codice_?fiscale/i);
    const s = JSON.parse(testo);
    expect(s.cognome).toBe('Arcangeli');
    expect(s.tutori.length).toBeGreaterThan(0);
    expect(s.tutori[0].cellulare).toMatch(/^\+39/);
    expect(s.relazioni.map((x: { tipo: string }) => x.tipo).sort()).toEqual(['figlio', 'fratello']);
    expect(s.storicoUnita).toHaveLength(2);
    expect(s.privacy).toMatchObject({ informativa: true });
  });

  it('scheda: i tutori archiviati dei maggiorenni non compaiono', async () => {
    const s = (await (await get('/api/associati/28', CAPO)).json()) as { tutori: unknown[] };
    expect(s.tutori).toHaveLength(0);
  });

  it('scheda: puoModificare segue i permessi', async () => {
    const lupetto = (await (await get('/api/associati/1', CAPO)).json()) as {
      puoModificare: boolean;
    };
    expect(lupetto.puoModificare).toBe(true);
    const guida = (await (await get('/api/associati/19', CAPO)).json()) as {
      puoModificare: boolean;
    };
    expect(guida.puoModificare).toBe(false);
  });

  it('scheda inesistente o id non valido', async () => {
    expect((await get('/api/associati/99999', CAPO)).status).toBe(404);
    expect((await get('/api/associati/abc', CAPO)).status).toBe(400);
  });

  it('senza identità: 401; account escluso: 403', async () => {
    expect((await get('/api/associati')).status).toBe(401);
    expect((await get('/api/associati', 'segreteria@example.org')).status).toBe(403);
  });

  it('/api/io espone nome del gruppo e ambiente', async () => {
    const io = await (await get('/api/io', CAPO)).json();
    expect(io).toMatchObject({ gruppo: 'Gruppo Demo', ambiente: 'locale', modalitaTest: true });
  });

  it('modalità di test: identità anche dal cookie', async () => {
    const r = await get(
      '/api/io',
      undefined,
      `altro=1; ${COOKIE_UTENTE_TEST}=capogruppo%40example.org`,
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ email: 'capogruppo@example.org' });
  });

  it('modalità di test: elenco degli utenti finti, senza login', async () => {
    const r = await get('/api/demo/utenti');
    expect(r.status).toBe(200);
    const utenti = (await r.json()) as { email: string; descrizione: string }[];
    expect(utenti.some((u) => u.email === 'webmaster@example.org')).toBe(true);
    expect(utenti.some((u) => u.email === 'capo.sola.lettura@example.org')).toBe(true);
    expect(utenti.find((u) => u.email === 'segreteria@example.org')?.descrizione).toContain(
      'escluso',
    );
  });
});

describe('etaAl', () => {
  it('conta il compleanno', () => {
    expect(etaAl('2010-11-13', '2026-11-13')).toBe(16);
    expect(etaAl('2010-11-14', '2026-11-13')).toBe(15);
    expect(etaAl(null, '2026-11-13')).toBeNull();
  });
});

describe("modalità di test: scelta dell'utente", () => {
  const post = (percorso: string, corpo: unknown) =>
    exports.default.fetch(
      new Request(`https://ppu.test${percorso}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      }),
    );

  it('imposta un cookie HttpOnly per un utente del dominio', async () => {
    const r = await post('/api/demo/accedi', { email: 'Capo.EG@example.org' });
    expect(r.status).toBe(200);
    const cookie = r.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain(`${COOKIE_UTENTE_TEST}=capo.eg%40example.org`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
  });

  it('rifiuta email fuori dal dominio', async () => {
    expect((await post('/api/demo/accedi', { email: 'x@altro.org' })).status).toBe(400);
  });

  it('esci cancella il cookie', async () => {
    const r = await post('/api/demo/esci', {});
    expect(r.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
