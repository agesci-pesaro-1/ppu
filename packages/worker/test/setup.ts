import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';

// Real schema (migrations/) + initial and demo data, as in preview.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await applyD1Migrations(env.DB, env.TEST_SEED, 'd1_seed');
