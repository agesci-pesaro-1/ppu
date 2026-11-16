import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config.ts';
import type { Env } from '../src/env.ts';

const base = { DB: {} as D1Database, DOMAIN: 'example.org' } satisfies Partial<Env>;
const access = { ACCESS_TEAM_DOMAIN: 'demo.cloudflareaccess.com', ACCESS_AUD: 'aud' };

describe('readConfig', () => {
  it('rejects test mode in production, beta and demo', () => {
    for (const ENVIRONMENT of ['production', 'beta', 'demo']) {
      expect(() => readConfig({ ...base, ...access, ENVIRONMENT, TEST_MODE: 'on' })).toThrow(
        /TEST_MODE/,
      );
    }
  });

  it('allows test mode in preview and local', () => {
    for (const ENVIRONMENT of ['preview', 'local']) {
      expect(readConfig({ ...base, ENVIRONMENT, TEST_MODE: 'on' }).testMode).toBe(true);
    }
  });

  it('requires Access outside test mode', () => {
    expect(() => readConfig({ ...base, ENVIRONMENT: 'production' })).toThrow(/ACCESS/);
    expect(readConfig({ ...base, ...access, ENVIRONMENT: 'production' }).access).toEqual({
      teamDomain: 'demo.cloudflareaccess.com',
      aud: 'aud',
    });
  });

  it('rejects an invalid environment or domain', () => {
    expect(() => readConfig({ ...base, ...access, ENVIRONMENT: 'prod' })).toThrow(/ENVIRONMENT/);
    expect(() => readConfig({ ...base, ...access, ENVIRONMENT: 'beta', DOMAIN: '' })).toThrow(
      /DOMAIN/,
    );
  });

  it('lowercases the domain', () => {
    expect(
      readConfig({ ...base, ...access, ENVIRONMENT: 'beta', DOMAIN: 'Example.ORG' }).domain,
    ).toBe('example.org');
  });
});
