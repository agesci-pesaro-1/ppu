import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Schema reale (migrations/) + seed base e demo, come in preview.
await applyD1Migrations(env.DB, env.TEST_MIGRAZIONI);
await applyD1Migrations(env.DB, env.TEST_SEED, 'd1_seed');
