import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

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
  /** KV used by the MCP's OAuth provider (tokens, clients, grants). */
  OAUTH_KV: KVNamespace;
  /** Google OAuth client (Cloud Console) for the MCP login. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Injected by OAuthProvider into non-API requests. */
  OAUTH_PROVIDER?: OAuthHelpers;
}
