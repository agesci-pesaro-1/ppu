// The test cookie and the list of fake users must be unusable outside test mode.
import { createExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import type { Config } from '../src/config.ts';
import {
  emailFromRequest,
  readCookie,
  TEST_USER_COOKIE,
  TEST_USER_HEADER,
} from '../src/identity/index.ts';
import worker from '../src/index.ts';

const productionConfig: Config = {
  environment: 'production',
  domain: 'example.org',
  groupName: 'Gruppo',
  testMode: false,
  access: { teamDomain: 'demo.cloudflareaccess.com', aud: 'aud' },
  google: null,
};

describe('test identity outside test mode', () => {
  it('the cookie is ignored', async () => {
    const req = new Request('https://ppu.test/api/me', {
      headers: { Cookie: `${TEST_USER_COOKIE}=webmaster@example.org` },
    });
    await expect(emailFromRequest(req, productionConfig)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('the header is ignored', async () => {
    const req = new Request('https://ppu.test/api/me', {
      headers: { [TEST_USER_HEADER]: 'webmaster@example.org' },
    });
    await expect(emailFromRequest(req, productionConfig)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });
});

describe('readCookie', () => {
  it('finds the cookie among others and decodes the value', () => {
    const req = new Request('https://x', { headers: { Cookie: 'a=1; b=c%40d.e; z=2' } });
    expect(readCookie(req, 'b')).toBe('c@d.e');
    expect(readCookie(req, 'x')).toBeNull();
  });
});

describe('fake users in production', () => {
  it('answers 404', async () => {
    const productionEnv = {
      ...env,
      ENVIRONMENT: 'production',
      TEST_MODE: undefined,
      ACCESS_TEAM_DOMAIN: 'demo.cloudflareaccess.com',
      ACCESS_AUD: 'aud',
    };
    for (const req of [
      new Request('https://ppu.test/api/demo/users'),
      new Request('https://ppu.test/api/demo/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'webmaster@example.org' }),
      }),
    ]) {
      const r = await worker.fetch(
        req as Parameters<typeof worker.fetch>[0],
        productionEnv as unknown as typeof env,
        createExecutionContext(),
      );
      expect(r.status).toBe(404);
      expect(r.headers.get('Set-Cookie')).toBeNull();
    }
  });
});
