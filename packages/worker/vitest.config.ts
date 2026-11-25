import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { demoSeed } from '../../scripts/demo-seed.ts';
import { groupSeedSql, readGroupConfig } from '../../scripts/group-seed.ts';

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Writes generated SQL to a temporary folder and reads it as D1 migrations. */
async function generatedMigration(name: string, sql: string) {
  const dir = mkdtempSync(join(tmpdir(), 'ppu-seed-'));
  writeFileSync(join(dir, name), sql);
  return readD1Migrations(dir);
}

export default defineConfig(async () => {
  // wrangler.jsonc declares the PWA assets: the Worker tests do not need them,
  // but the folder must exist even before the PWA build.
  mkdirSync(path('../pwa/dist'), { recursive: true });
  const migrations = await readD1Migrations(path('../../migrations'));
  // Initial data as in preview (seed/README.md): example configuration,
  // seed/base, demo data. Configuration and demo SQL come from the scripts.
  const groupSeed = await generatedMigration('0001_group.sql', groupSeedSql(readGroupConfig()));
  const baseSeed = await readD1Migrations(path('../../seed/base'));
  const demo = await generatedMigration('0001_demo.sql', demoSeed);
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            DOMAIN: 'example.org',
            GROUP_NAME: 'Gruppo Demo',
            TEST_MODE: 'on',
            TEST_MIGRATIONS: migrations,
            TEST_SEED: [...groupSeed, ...baseSeed, ...demo],
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.ts'],
    },
  };
});
