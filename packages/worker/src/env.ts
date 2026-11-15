import type { OAuthHelpers } from '@cloudflare/workers-oauth-provider';

export interface Env {
  DB: D1Database;
  /** 'locale' | 'preview' | 'beta' | 'produzione' | 'demo' */
  AMBIENTE: string;
  /** Dominio Google Workspace del gruppo, per esempio "example.org". */
  DOMINIO: string;
  NOME_GRUPPO?: string;
  /** Team di Cloudflare Access: "<team>.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string;
  /** Audience (AUD tag) dell'applicazione Access della PWA. */
  ACCESS_AUD?: string;
  /** "attiva" solo in locale e preview: identità simulata. */
  MODALITA_TEST?: string;
  /** KV usato dal provider OAuth dell'MCP (token, client, consensi). */
  OAUTH_KV: KVNamespace;
  /** Client OAuth Google (Cloud Console) per il login dell'MCP. */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Iniettato da OAuthProvider nelle richieste non-API. */
  OAUTH_PROVIDER?: OAuthHelpers;
}
