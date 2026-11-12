import { describe, expect, it } from 'vitest';
import { leggiConfig } from '../src/config.ts';
import type { Env } from '../src/env.ts';

const base = { DB: {} as D1Database, DOMINIO: 'example.org' } satisfies Partial<Env>;
const access = { ACCESS_TEAM_DOMAIN: 'demo.cloudflareaccess.com', ACCESS_AUD: 'aud' };

describe('leggiConfig', () => {
  it('rifiuta la modalità di test in produzione e in beta', () => {
    for (const AMBIENTE of ['produzione', 'beta', 'demo']) {
      expect(() => leggiConfig({ ...base, ...access, AMBIENTE, MODALITA_TEST: 'attiva' })).toThrow(
        /MODALITA_TEST/,
      );
    }
  });

  it('ammette la modalità di test in preview e in locale', () => {
    for (const AMBIENTE of ['preview', 'locale']) {
      expect(leggiConfig({ ...base, AMBIENTE, MODALITA_TEST: 'attiva' }).modalitaTest).toBe(true);
    }
  });

  it('richiede Access fuori dalla modalità di test', () => {
    expect(() => leggiConfig({ ...base, AMBIENTE: 'produzione' })).toThrow(/ACCESS/);
    expect(leggiConfig({ ...base, ...access, AMBIENTE: 'produzione' }).access).toEqual({
      teamDomain: 'demo.cloudflareaccess.com',
      aud: 'aud',
    });
  });

  it('rifiuta ambiente e dominio non validi', () => {
    expect(() => leggiConfig({ ...base, ...access, AMBIENTE: 'prod' })).toThrow(/AMBIENTE/);
    expect(() => leggiConfig({ ...base, ...access, AMBIENTE: 'beta', DOMINIO: '' })).toThrow(
      /DOMINIO/,
    );
  });

  it('normalizza il dominio in minuscolo', () => {
    expect(
      leggiConfig({ ...base, ...access, AMBIENTE: 'beta', DOMINIO: 'Example.ORG' }).dominio,
    ).toBe('example.org');
  });
});
