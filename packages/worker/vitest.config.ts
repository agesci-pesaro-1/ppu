import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';
import { demoSeed } from '../../scripts/demo-seed.ts';
import { groupSeedSql, readGroupConfig } from '../../scripts/group-seed.ts';

const percorso = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(async () => {
  const migrazioni = await readD1Migrations(percorso('../../migrations'));
  // Dati iniziali come in preview (seed/README.md): configurazione d'esempio,
  // seed/base, dati demo. Configurazione e demo si generano dagli script.
  const generati = mkdtempSync(join(tmpdir(), 'ppu-seed-'));
  writeFileSync(join(generati, '0001_gruppo.sql'), groupSeedSql(readGroupConfig()));
  const seedGruppo = await readD1Migrations(generati);
  const seedBase = await readD1Migrations(percorso('../../seed/base'));
  const demo = mkdtempSync(join(tmpdir(), 'ppu-demo-'));
  writeFileSync(join(demo, '0001_demo.sql'), demoSeed);
  const seedDemo = await readD1Migrations(demo);
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            DOMINIO: 'example.org',
            NOME_GRUPPO: 'Gruppo Demo',
            MODALITA_TEST: 'attiva',
            TEST_MIGRAZIONI: migrazioni,
            TEST_SEED: [...seedGruppo, ...seedBase, ...seedDemo],
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.ts'],
    },
  };
});
