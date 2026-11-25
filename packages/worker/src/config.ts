import type { Env } from './env.ts';

export type Environment = 'local' | 'preview' | 'beta' | 'production' | 'demo';

const ENVIRONMENTS: readonly Environment[] = ['local', 'preview', 'beta', 'production', 'demo'];

/** Environments where the simulated identity can be turned on. */
const TEST_MODE_ENVIRONMENTS: readonly Environment[] = ['local', 'preview'];

export interface Config {
  environment: Environment;
  domain: string;
  groupName: string;
  testMode: boolean;
  access: { teamDomain: string; aud: string } | null;
  google: { clientId: string; clientSecret: string } | null;
}

export class ConfigError extends Error {}

/**
 * Reads and validates the configuration. Fails explicitly if test mode is on
 * outside local and preview: this is the main safeguard against a simulated
 * identity in beta or production.
 */
export function readConfig(env: Env): Config {
  const environment = env.ENVIRONMENT as Environment;
  if (!ENVIRONMENTS.includes(environment)) {
    throw new ConfigError(`invalid ENVIRONMENT: "${env.ENVIRONMENT}"`);
  }
  const domain = (env.DOMAIN ?? '').trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    throw new ConfigError('DOMAIN missing or invalid');
  }
  const testMode = env.TEST_MODE === 'on';
  if (testMode && !TEST_MODE_ENVIRONMENTS.includes(environment)) {
    throw new ConfigError(`TEST_MODE not allowed in "${environment}"`);
  }
  const access =
    env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD
      ? { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD }
      : null;
  if (!access && !testMode && environment !== 'demo') {
    throw new ConfigError('ACCESS_TEAM_DOMAIN and ACCESS_AUD are required');
  }
  // Google login for the MCP: optional (without it, the MCP endpoint only accepts test mode).
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : null;
  return {
    environment,
    domain,
    groupName: env.GROUP_NAME ?? 'PPU',
    testMode,
    access,
    google,
  };
}
