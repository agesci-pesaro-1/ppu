import { UnsecuredJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  exchangeGoogleCode,
  GOOGLE_TOKEN_URL,
  googleAuthorizeUrl,
  refreshGoogleToken,
  verifyIdToken,
} from '../src/identity/google.ts';

const client = {
  clientId: 'client-demo.apps.googleusercontent.com',
  clientSecret: 'fake-secret',
};
const domain = 'example.org';

function idToken(claims: Record<string, unknown>): string {
  return new UnsecuredJWT({
    iss: 'https://accounts.google.com',
    aud: client.clientId,
    email: 'capo.eg@example.org',
    email_verified: true,
    hd: 'example.org',
    ...claims,
  })
    .setExpirationTime('5m')
    .encode();
}

afterEach(() => vi.restoreAllMocks());

describe('Google login', () => {
  it('accepts a verified domain account', () => {
    expect(verifyIdToken(idToken({}), client, domain)).toBe('capo.eg@example.org');
  });

  it('rejects accounts from other domains or personal Gmail', () => {
    expect(() =>
      verifyIdToken(idToken({ email: 'x@altro.org', hd: 'altro.org' }), client, domain),
    ).toThrow(/dominio/);
    expect(() =>
      verifyIdToken(idToken({ email: 'x@gmail.com', hd: undefined }), client, domain),
    ).toThrow(/dominio/);
    // Right hd but an email from another domain (alias): rejected.
    expect(() => verifyIdToken(idToken({ email: 'x@altro.org' }), client, domain)).toThrow(
      /dominio/,
    );
  });

  it('rejects unverified emails, wrong audience or issuer, expired tokens', () => {
    expect(() => verifyIdToken(idToken({ email_verified: false }), client, domain)).toThrow(
      /verificata/,
    );
    expect(() => verifyIdToken(idToken({ aud: 'altro-client' }), client, domain)).toThrow(
      /non valida/,
    );
    expect(() => verifyIdToken(idToken({ iss: 'https://evil.example' }), client, domain)).toThrow(
      /non valida/,
    );
    const future = new Date(Date.now() + 10 * 60 * 1000);
    expect(() => verifyIdToken(idToken({}), client, domain, future)).toThrow(/scaduto/);
  });

  it('exchanges the code with PKCE and returns email and refresh token', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ id_token: idToken({}), refresh_token: 'fake-rt' }));
    const identity = await exchangeGoogleCode({
      client,
      code: 'code',
      verifier: 'the-verifier',
      redirectUri: 'https://ppu.test/oauth/google/callback',
      domain,
    });
    expect(identity).toEqual({ email: 'capo.eg@example.org', refreshToken: 'fake-rt' });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(GOOGLE_TOKEN_URL);
    expect(String(init?.body)).toContain('code_verifier=the-verifier');
  });

  it('rejects the exchange if Google returns an account from another domain', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ id_token: idToken({ email: 'x@altro.org', hd: 'altro.org' }) }),
    );
    await expect(
      exchangeGoogleCode({
        client,
        code: 'c',
        verifier: 'v',
        redirectUri: 'https://ppu.test/cb',
        domain,
      }),
    ).rejects.toMatchObject({ code: 'domain_not_allowed' });
  });

  it('detects a suspended account on renewal (invalid_grant)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ error: 'invalid_grant' }, { status: 400 }),
    );
    expect(await refreshGoogleToken(client, 'rt')).toBe('revoked');
  });

  it('asks Google for domain accounts only, with PKCE and offline access', () => {
    const url = new URL(
      googleAuthorizeUrl({
        client,
        redirectUri: 'https://ppu.test/cb',
        state: 's',
        codeChallenge: 'c',
        domain,
      }),
    );
    expect(url.searchParams.get('hd')).toBe('example.org');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('access_type')).toBe('offline');
  });
});
