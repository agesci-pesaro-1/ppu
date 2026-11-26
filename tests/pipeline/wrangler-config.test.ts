import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { assertNoTestMode, generateConfig, stripComments } from '../../scripts/wrangler-config.ts';

const base = JSON.parse(
  stripComments(
    readFileSync(new URL('../../packages/worker/wrangler.jsonc', import.meta.url), 'utf8'),
  ),
) as Record<string, unknown>;

const deployed = {
  d1Name: 'ppu',
  d1Id: '11111111-1111-1111-1111-111111111111',
  kvOauthId: 'abcdefabcdefabcdefabcdefabcdef12',
  domain: 'Example.ORG',
  accessTeamDomain: 'demo.cloudflareaccess.com',
  accessAud: 'aud-123',
};

interface Section {
  name: string;
  vars: Record<string, string>;
  d1_databases: { database_id: string }[];
  kv_namespaces: { binding: string; id: string }[];
  assets?: { directory: string; not_found_handling: string; run_worker_first: string[] };
  routes?: unknown;
}
const section = (c: Record<string, unknown>, env: string): Section =>
  (c.env as Record<string, Section>)[env] as Section;

describe('wrangler-config', () => {
  it('wrangler.jsonc does not enable test mode in the base, beta or production', () => {
    assert.equal('TEST_MODE' in (base.vars as Record<string, string>), false);
    for (const env of ['beta', 'production']) {
      assert.equal('TEST_MODE' in section(base, env).vars, false);
    }
  });

  it('beta: fills in domain, Access, database and route', () => {
    const c = generateConfig(base, {
      environment: 'beta',
      ...deployed,
      route: 'ppu-beta.example.org',
    });
    const s = section(c, 'beta');
    assert.equal(s.vars.ENVIRONMENT, 'beta');
    assert.equal(s.vars.DOMAIN, 'example.org');
    assert.equal(s.vars.ACCESS_AUD, 'aud-123');
    assert.equal(s.d1_databases[0]?.database_id, deployed.d1Id);
    assert.deepEqual(s.kv_namespaces, [{ binding: 'OAUTH_KV', id: deployed.kvOauthId }]);
    assert.deepEqual(s.routes, [{ pattern: 'ppu-beta.example.org', custom_domain: true }]);
    assert.deepEqual(Object.keys(c.env as object), ['beta']);
    assertNoTestMode(c, 'beta');
  });

  it('production: rejects missing values', () => {
    const p = { environment: 'production' as const, ...deployed };
    assert.equal(section(generateConfig(base, p), 'production').vars.ENVIRONMENT, 'production');
    assert.throws(() => generateConfig(base, { ...p, accessAud: '' }), /PPU_ACCESS_AUD/);
    assert.throws(() => generateConfig(base, { ...p, domain: undefined }), /PPU_DOMAIN/);
    assert.throws(() => generateConfig(base, { ...p, d1Id: '' }), /PPU_D1_ID/);
    assert.throws(() => generateConfig(base, { ...p, kvOauthId: '' }), /PPU_KV_OAUTH_ID/);
  });

  it('rejects TEST_MODE in beta and production', () => {
    const tampered = structuredClone(base);
    section(tampered, 'production').vars.TEST_MODE = 'on';
    assert.throws(
      () => generateConfig(tampered, { environment: 'production', ...deployed }),
      /TEST_MODE/,
    );
    assert.throws(
      () => assertNoTestMode({ env: { beta: { vars: { TEST_MODE: 'on' } } } }, 'beta'),
      /TEST_MODE/,
    );
  });

  it('preview: one name per PR, demo domain, simulated identity', () => {
    const c = generateConfig(base, {
      environment: 'preview',
      d1Name: 'ppu-preview-pr-7',
      d1Id: '22222222-2222-2222-2222-222222222222',
      kvOauthId: 'abcdefabcdefabcdefabcdefabcdef34',
      workerName: 'ppu-preview-pr-7',
    });
    const s = section(c, 'preview');
    assert.equal(s.name, 'ppu-preview-pr-7');
    assert.equal(s.vars.ENVIRONMENT, 'preview');
    assert.equal(s.vars.DOMAIN, 'example.org');
    assert.equal(s.vars.TEST_MODE, 'on');
  });

  it('every deployed environment serves the PWA, with API, MCP and OAuth always to the Worker', () => {
    for (const environment of ['preview', 'beta', 'production'] as const) {
      const c = generateConfig(base, {
        environment,
        ...deployed,
        ...(environment === 'preview' ? { domain: undefined } : {}),
      });
      const a = section(c, environment).assets;
      assert.equal(a?.directory, '../pwa/dist', environment);
      assert.equal(a?.not_found_handling, 'single-page-application', environment);
      for (const path of ['/api/*', '/mcp', '/mcp/*', '/oauth/*', '/authorize', '/.well-known/*']) {
        assert.ok(a?.run_worker_first.includes(path), `${environment}: ${path}`);
      }
    }
  });
});
