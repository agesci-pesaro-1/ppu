// Generates packages/worker/wrangler.generated.json for a deployed environment,
// starting from wrangler.jsonc and the pipeline's environment variables.
//
// Usage (in GitHub Actions):
//   PPU_ENVIRONMENT=beta PPU_DOMAIN=... node scripts/wrangler-config.ts
//
// Variables:
//   PPU_ENVIRONMENT         preview | beta | production (required)
//   PPU_D1_NAME, PPU_D1_ID  D1 database (required)
//   PPU_WORKER_NAME         Worker name (optional; in preview, one per PR)
//   PPU_DOMAIN              Workspace domain (beta and production)
//   PPU_GROUP_NAME          group name (optional)
//   PPU_ACCESS_TEAM_DOMAIN  <team>.cloudflareaccess.com (beta and production)
//   PPU_ACCESS_AUD          audience of the Access application (beta and production)
//   PPU_ROUTE               custom domain of the Worker (optional)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type DeployedEnvironment = 'preview' | 'beta' | 'production';

const DEPLOYED_ENVIRONMENTS: readonly DeployedEnvironment[] = ['preview', 'beta', 'production'];

export interface Options {
  environment: DeployedEnvironment;
  d1Name: string;
  d1Id: string;
  workerName?: string | undefined;
  domain?: string | undefined;
  groupName?: string | undefined;
  accessTeamDomain?: string | undefined;
  accessAud?: string | undefined;
  route?: string | undefined;
}

type Json = Record<string, unknown>;

/** Strips whole-line comments, the only kind allowed in wrangler.jsonc. */
export function stripComments(jsonc: string): string {
  return jsonc
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
}

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} missing`);
  return value.trim();
}

export function generateConfig(base: Json, o: Options): Json {
  const environments = base.env as Record<string, Json> | undefined;
  const section = environments?.[o.environment];
  if (!section) throw new Error(`environment "${o.environment}" missing from wrangler.jsonc`);

  const vars = { ...(section.vars as Record<string, string>) };
  if (vars.ENVIRONMENT !== o.environment) {
    throw new Error(`vars.ENVIRONMENT of "${o.environment}" does not match`);
  }

  if (o.environment === 'preview') {
    // Previews only hold demo data: example.org domain and simulated identity.
    if (vars.TEST_MODE !== 'on') throw new Error('preview requires TEST_MODE');
  } else {
    if ('TEST_MODE' in vars) {
      throw new Error(`TEST_MODE not allowed in "${o.environment}"`);
    }
    vars.DOMAIN = required(o.domain, 'PPU_DOMAIN').toLowerCase();
    vars.ACCESS_TEAM_DOMAIN = required(o.accessTeamDomain, 'PPU_ACCESS_TEAM_DOMAIN');
    vars.ACCESS_AUD = required(o.accessAud, 'PPU_ACCESS_AUD');
    if (o.groupName?.trim()) vars.GROUP_NAME = o.groupName.trim();
  }

  const [d1] = section.d1_databases as Json[];
  if (!d1) throw new Error(`d1_databases missing in "${o.environment}"`);

  const generated: Json = {
    ...section,
    vars,
    d1_databases: [
      {
        ...d1,
        database_name: required(o.d1Name, 'PPU_D1_NAME'),
        database_id: required(o.d1Id, 'PPU_D1_ID'),
      },
    ],
  };
  if (o.workerName?.trim()) generated.name = o.workerName.trim();
  if (o.route?.trim()) generated.routes = [{ pattern: o.route.trim(), custom_domain: true }];

  // The generated file only holds the requested environment.
  return { ...base, env: { [o.environment]: generated } };
}

/** Independent final check: no simulated identity outside previews. */
export function assertNoTestMode(config: Json, environment: DeployedEnvironment): void {
  if (environment === 'preview') return;
  if (JSON.stringify(config).includes('TEST_MODE')) {
    throw new Error(`the "${environment}" configuration contains TEST_MODE`);
  }
}

function main(): void {
  const dir = fileURLToPath(new URL('../packages/worker/', import.meta.url));
  const base = JSON.parse(stripComments(readFileSync(`${dir}wrangler.jsonc`, 'utf8'))) as Json;
  const e = process.env;
  const environment = e.PPU_ENVIRONMENT as DeployedEnvironment;
  if (!DEPLOYED_ENVIRONMENTS.includes(environment)) {
    throw new Error(`invalid PPU_ENVIRONMENT: "${e.PPU_ENVIRONMENT ?? ''}"`);
  }
  const config = generateConfig(base, {
    environment,
    d1Name: e.PPU_D1_NAME ?? '',
    d1Id: e.PPU_D1_ID ?? '',
    workerName: e.PPU_WORKER_NAME,
    domain: e.PPU_DOMAIN,
    groupName: e.PPU_GROUP_NAME,
    accessTeamDomain: e.PPU_ACCESS_TEAM_DOMAIN,
    accessAud: e.PPU_ACCESS_AUD,
    route: e.PPU_ROUTE,
  });
  assertNoTestMode(config, environment);
  // Same folder as wrangler.jsonc, so relative paths stay valid.
  writeFileSync(`${dir}wrangler.generated.json`, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Wrote wrangler.generated.json for "${environment}"`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
