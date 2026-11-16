export interface Env {
  DB: D1Database;
  /** 'local' | 'preview' | 'beta' | 'production' | 'demo' */
  ENVIRONMENT: string;
  /** The group's Google Workspace domain, e.g. "example.org". */
  DOMAIN: string;
  GROUP_NAME?: string;
  /** Cloudflare Access team: "<team>.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string;
  /** Audience (AUD tag) of the PWA's Access application. */
  ACCESS_AUD?: string;
  /** "on" only in local and preview: simulated identity. */
  TEST_MODE?: string;
}
