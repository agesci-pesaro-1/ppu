import { UnsecuredJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GOOGLE_TOKEN_URL,
  rinnovaTokenGoogle,
  scambiaCodiceGoogle,
  urlAutorizzazioneGoogle,
  verificaIdToken,
} from '../src/identita/google.ts';

const client = {
  clientId: 'client-demo.apps.googleusercontent.com',
  clientSecret: 'segreto-finto',
};
const dominio = 'example.org';

function idToken(claim: Record<string, unknown>): string {
  return new UnsecuredJWT({
    iss: 'https://accounts.google.com',
    aud: client.clientId,
    email: 'capo.eg@example.org',
    email_verified: true,
    hd: 'example.org',
    ...claim,
  })
    .setExpirationTime('5m')
    .encode();
}

afterEach(() => vi.restoreAllMocks());

describe('login Google', () => {
  it('accetta un account verificato del dominio', () => {
    expect(verificaIdToken(idToken({}), client, dominio)).toBe('capo.eg@example.org');
  });

  it('rifiuta account di altri domini o Gmail personali', () => {
    expect(() =>
      verificaIdToken(idToken({ email: 'x@altro.org', hd: 'altro.org' }), client, dominio),
    ).toThrow(/dominio/);
    expect(() =>
      verificaIdToken(idToken({ email: 'x@gmail.com', hd: undefined }), client, dominio),
    ).toThrow(/dominio/);
    // hd giusto ma email di un altro dominio (alias): rifiutato.
    expect(() => verificaIdToken(idToken({ email: 'x@altro.org' }), client, dominio)).toThrow(
      /dominio/,
    );
  });

  it('rifiuta email non verificate, audience ed emittente sbagliati, token scaduti', () => {
    expect(() => verificaIdToken(idToken({ email_verified: false }), client, dominio)).toThrow(
      /verificata/,
    );
    expect(() => verificaIdToken(idToken({ aud: 'altro-client' }), client, dominio)).toThrow(
      /non valida/,
    );
    expect(() =>
      verificaIdToken(idToken({ iss: 'https://evil.example' }), client, dominio),
    ).toThrow(/non valida/);
    const futuro = new Date(Date.now() + 10 * 60 * 1000);
    expect(() => verificaIdToken(idToken({}), client, dominio, futuro)).toThrow(/scaduto/);
  });

  it('scambia il codice con PKCE e restituisce email e refresh token', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id_token: idToken({}), refresh_token: 'rt-finto' }));
    const identita = await scambiaCodiceGoogle({
      client,
      code: 'codice',
      verifier: 'verificatore',
      redirectUri: 'https://ppu.test/oauth/google/callback',
      dominio,
    });
    expect(identita).toEqual({ email: 'capo.eg@example.org', refreshToken: 'rt-finto' });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(GOOGLE_TOKEN_URL);
    expect(String(init?.body)).toContain('code_verifier=verificatore');
  });

  it('rifiuta lo scambio se Google restituisce un account di un altro dominio', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ id_token: idToken({ email: 'x@altro.org', hd: 'altro.org' }) }),
    );
    await expect(
      scambiaCodiceGoogle({
        client,
        code: 'c',
        verifier: 'v',
        redirectUri: 'https://ppu.test/cb',
        dominio,
      }),
    ).rejects.toMatchObject({ codice: 'dominio_non_ammesso' });
  });

  it('riconosce un account sospeso al rinnovo (invalid_grant)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    );
    expect(await rinnovaTokenGoogle(client, 'rt')).toBe('revocato');
  });

  it('chiede a Google solo account del dominio, con PKCE e accesso offline', () => {
    const url = new URL(
      urlAutorizzazioneGoogle({
        client,
        redirectUri: 'https://ppu.test/cb',
        state: 's',
        codeChallenge: 'c',
        dominio,
      }),
    );
    expect(url.searchParams.get('hd')).toBe('example.org');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('access_type')).toBe('offline');
  });
});
