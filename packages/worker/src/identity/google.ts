// Google login for the MCP: code exchange (with PKCE) and identity checks.
//
// The ID token comes straight from Google's token endpoint, over TLS and with
// our client secret: per OpenID Connect (3.1.3.7) its claims can be checked
// without verifying the signature. Issuer, audience, expiry, verified email
// and Workspace domain (`hd` claim and email) are checked: a personal Gmail
// account or an account from another domain is rejected.

import { decodeJwt } from 'jose';
import { AppError } from '../errors.ts';
import { isInDomain } from './index.ts';

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

export interface GoogleClient {
  clientId: string;
  clientSecret: string;
}

export interface GoogleIdentity {
  email: string;
  /** Present if Google issued it (access_type=offline). */
  refreshToken: string | null;
}

export function googleAuthorizeUrl(options: {
  client: GoogleClient;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  domain: string;
}): string {
  const u = new URL(GOOGLE_AUTHORIZE_URL);
  u.searchParams.set('client_id', options.client.clientId);
  u.searchParams.set('redirect_uri', options.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email');
  u.searchParams.set('state', options.state);
  u.searchParams.set('code_challenge', options.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  // Suggests the domain's accounts; the real check is on `hd` after the login.
  u.searchParams.set('hd', options.domain);
  // Google refresh token: on every renewal we check that the account is still active.
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent select_account');
  return u.toString();
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** Checks the ID token claims. Exported for the tests. */
export function verifyIdToken(
  idToken: string,
  client: GoogleClient,
  domain: string,
  now: Date = new Date(),
): string {
  let claims: ReturnType<typeof decodeJwt>;
  try {
    claims = decodeJwt(idToken);
  } catch {
    throw new AppError('unauthenticated', 'Risposta di Google non valida.');
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.has(String(claims.iss)) || !aud.includes(client.clientId)) {
    throw new AppError('unauthenticated', 'Risposta di Google non valida.');
  }
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= now.getTime()) {
    throw new AppError('unauthenticated', 'Login Google scaduto: riprova.');
  }
  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : '';
  if (!email || claims.email_verified !== true) {
    throw new AppError('unauthenticated', 'Email Google non verificata.');
  }
  if (claims.hd !== domain || !isInDomain(email, domain)) {
    throw new AppError('domain_not_allowed', 'Account non appartenente al dominio del gruppo.');
  }
  return email;
}

/** Exchanges Google's code and returns the verified identity. */
export async function exchangeGoogleCode(options: {
  client: GoogleClient;
  code: string;
  verifier: string;
  redirectUri: string;
  domain: string;
}): Promise<GoogleIdentity> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      code_verifier: options.verifier,
      redirect_uri: options.redirectUri,
      client_id: options.client.clientId,
      client_secret: options.client.clientSecret,
    }),
  });
  if (!response.ok) throw new AppError('unauthenticated', 'Login Google non riuscito.');
  const data = (await response.json()) as { id_token?: string; refresh_token?: string };
  if (!data.id_token) throw new AppError('unauthenticated', 'Login Google non riuscito.');
  return {
    email: verifyIdToken(data.id_token, options.client, options.domain),
    refreshToken: data.refresh_token ?? null,
  };
}

export type RefreshOutcome = 'valid' | 'revoked' | 'unavailable';

/**
 * Refreshes the Google token: if Google answers invalid_grant, the account was
 * suspended, removed or revoked the access.
 */
export async function refreshGoogleToken(
  client: GoogleClient,
  refreshToken: string,
): Promise<RefreshOutcome> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: client.clientId,
        client_secret: client.clientSecret,
      }),
    });
  } catch {
    return 'unavailable';
  }
  if (response.ok) return 'valid';
  const error = ((await response.json().catch(() => ({}))) as { error?: string }).error;
  return error === 'invalid_grant' ? 'revoked' : 'unavailable';
}
