// Il cookie di test e l'elenco degli utenti finti devono essere inutilizzabili
// fuori dalla modalità di test.
import { createExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import type { Config } from '../src/config.ts';
import {
  COOKIE_UTENTE_TEST,
  emailDallaRichiesta,
  HEADER_UTENTE_TEST,
  leggiCookie,
} from '../src/identita/index.ts';
import worker from '../src/index.ts';

const configProduzione: Config = {
  ambiente: 'produzione',
  dominio: 'example.org',
  nomeGruppo: 'Gruppo',
  modalitaTest: false,
  access: { teamDomain: 'demo.cloudflareaccess.com', aud: 'aud' },
  google: null,
};

describe('identità di test fuori dalla modalità di test', () => {
  it('il cookie viene ignorato', async () => {
    const req = new Request('https://ppu.test/api/io', {
      headers: { Cookie: `${COOKIE_UTENTE_TEST}=webmaster@example.org` },
    });
    await expect(emailDallaRichiesta(req, configProduzione)).rejects.toMatchObject({
      codice: 'non_autenticato',
    });
  });

  it("l'header viene ignorato", async () => {
    const req = new Request('https://ppu.test/api/io', {
      headers: { [HEADER_UTENTE_TEST]: 'webmaster@example.org' },
    });
    await expect(emailDallaRichiesta(req, configProduzione)).rejects.toMatchObject({
      codice: 'non_autenticato',
    });
  });
});

describe('leggiCookie', () => {
  it('trova il cookie tra altri e decodifica il valore', () => {
    const req = new Request('https://x', { headers: { Cookie: 'a=1; b=c%40d.e; z=2' } });
    expect(leggiCookie(req, 'b')).toBe('c@d.e');
    expect(leggiCookie(req, 'x')).toBeNull();
  });
});

describe('utenti finti in produzione', () => {
  it('risponde 404', async () => {
    const envProduzione = {
      ...env,
      AMBIENTE: 'produzione',
      MODALITA_TEST: undefined,
      ACCESS_TEAM_DOMAIN: 'demo.cloudflareaccess.com',
      ACCESS_AUD: 'aud',
    };
    for (const req of [
      new Request('https://ppu.test/api/demo/utenti'),
      new Request('https://ppu.test/api/demo/accedi', {
        method: 'POST',
        body: JSON.stringify({ email: 'webmaster@example.org' }),
      }),
    ]) {
      const r = await worker.fetch(
        req as Parameters<typeof worker.fetch>[0],
        envProduzione as unknown as typeof env,
        createExecutionContext(),
      );
      expect(r.status).toBe(404);
      expect(r.headers.get('Set-Cookie')).toBeNull();
    }
  });
});
