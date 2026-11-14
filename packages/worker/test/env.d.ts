import type { D1Migration } from 'cloudflare:test';
import type { Env as EnvPpu } from '../src/env.ts';

declare global {
  namespace Cloudflare {
    interface GlobalProps {
      mainModule: typeof import('../src/index.ts');
    }
    interface Env extends EnvPpu {
      TEST_MIGRAZIONI: D1Migration[];
      TEST_SEED: D1Migration[];
    }
  }
}
