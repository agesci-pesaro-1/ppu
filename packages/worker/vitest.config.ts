import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

const percorso = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(async () => {
  // wrangler.jsonc dichiara gli asset della PWA: i test del Worker non ne hanno
  // bisogno, ma la cartella deve esistere anche prima della build della PWA.
  mkdirSync(percorso('../pwa/dist'), { recursive: true });
  const migrazioni = await readD1Migrations(percorso('../../migrations'));
  const seedBase = await readD1Migrations(percorso('../../seed/base'));
  const seedDemo = await readD1Migrations(percorso('../../seed/demo'));
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
            TEST_SEED: [...seedBase, ...seedDemo],
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.ts'],
    },
  };
});
