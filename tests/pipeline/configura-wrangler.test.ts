import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  generaConfig,
  togliCommenti,
  verificaSenzaModalitaTest,
} from '../../scripts/configura-wrangler.ts';

const base = JSON.parse(
  togliCommenti(
    readFileSync(new URL('../../packages/worker/wrangler.jsonc', import.meta.url), 'utf8'),
  ),
) as Record<string, unknown>;

const pubblicato = {
  d1Nome: 'ppu',
  d1Id: '11111111-1111-1111-1111-111111111111',
  kvOauthId: 'abcdefabcdefabcdefabcdefabcdef12',
  dominio: 'Example.ORG',
  accessTeamDomain: 'demo.cloudflareaccess.com',
  accessAud: 'aud-123',
};

interface Sezione {
  name: string;
  vars: Record<string, string>;
  d1_databases: { database_id: string }[];
  kv_namespaces: { binding: string; id: string }[];
  routes?: unknown;
}
const sezione = (c: Record<string, unknown>, a: string): Sezione =>
  (c.env as Record<string, Sezione>)[a] as Sezione;

describe('configura-wrangler', () => {
  it('wrangler.jsonc non attiva la modalità di test nella base, in beta e in produzione', () => {
    assert.equal('MODALITA_TEST' in (base.vars as Record<string, string>), false);
    for (const a of ['beta', 'produzione']) {
      assert.equal('MODALITA_TEST' in sezione(base, a).vars, false);
    }
  });

  it('beta: inserisce dominio, Access, database e rotta', () => {
    const c = generaConfig(base, {
      ambiente: 'beta',
      ...pubblicato,
      route: 'ppu-beta.example.org',
    });
    const s = sezione(c, 'beta');
    assert.equal(s.vars.DOMINIO, 'example.org');
    assert.equal(s.vars.ACCESS_AUD, 'aud-123');
    assert.equal(s.d1_databases[0]?.database_id, pubblicato.d1Id);
    assert.deepEqual(s.kv_namespaces, [{ binding: 'OAUTH_KV', id: pubblicato.kvOauthId }]);
    assert.deepEqual(s.routes, [{ pattern: 'ppu-beta.example.org', custom_domain: true }]);
    assert.deepEqual(Object.keys(c.env as object), ['beta']);
    verificaSenzaModalitaTest(c, 'beta');
  });

  it('produzione: rifiuta valori mancanti', () => {
    const p = { ambiente: 'produzione' as const, ...pubblicato };
    assert.throws(() => generaConfig(base, { ...p, accessAud: '' }), /PPU_ACCESS_AUD/);
    assert.throws(() => generaConfig(base, { ...p, dominio: undefined }), /PPU_DOMINIO/);
    assert.throws(() => generaConfig(base, { ...p, d1Id: '' }), /PPU_D1_ID/);
    assert.throws(() => generaConfig(base, { ...p, kvOauthId: '' }), /PPU_KV_OAUTH_ID/);
  });

  it('rifiuta MODALITA_TEST in beta e produzione', () => {
    const manomesso = structuredClone(base);
    sezione(manomesso, 'produzione').vars.MODALITA_TEST = 'attiva';
    assert.throws(
      () => generaConfig(manomesso, { ambiente: 'produzione', ...pubblicato }),
      /MODALITA_TEST/,
    );
    assert.throws(
      () =>
        verificaSenzaModalitaTest({ env: { beta: { vars: { MODALITA_TEST: 'attiva' } } } }, 'beta'),
      /MODALITA_TEST/,
    );
  });

  it('preview: nome per PR, dominio demo, identità simulata', () => {
    const c = generaConfig(base, {
      ambiente: 'preview',
      d1Nome: 'ppu-preview-pr-7',
      d1Id: '22222222-2222-2222-2222-222222222222',
      kvOauthId: 'abcdefabcdefabcdefabcdefabcdef34',
      nomeWorker: 'ppu-preview-pr-7',
    });
    const s = sezione(c, 'preview');
    assert.equal(s.name, 'ppu-preview-pr-7');
    assert.equal(s.vars.DOMINIO, 'example.org');
    assert.equal(s.vars.MODALITA_TEST, 'attiva');
  });
});
