// Login Google per l'MCP: scambio del codice (con PKCE) e verifica dell'identità.
//
// L'ID token arriva direttamente dal token endpoint di Google, su TLS e con il
// nostro client secret: per OpenID Connect (3.1.3.7) si possono quindi
// controllare i claim senza verificarne la firma. Si controllano emittente,
// audience, scadenza, email verificata e dominio Workspace (claim `hd` ed
// email): un account Gmail personale o di un altro dominio viene rifiutato.

import { decodeJwt } from 'jose';
import { ErrorePpu } from '../errori.ts';
import { emailNelDominio } from './index.ts';

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EMITTENTI = new Set(['https://accounts.google.com', 'accounts.google.com']);

export interface ClientGoogle {
  clientId: string;
  clientSecret: string;
}

export interface IdentitaGoogle {
  email: string;
  /** Presente se Google l'ha rilasciato (access_type=offline). */
  refreshToken: string | null;
}

export function urlAutorizzazioneGoogle(opzioni: {
  client: ClientGoogle;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  dominio: string;
}): string {
  const u = new URL(GOOGLE_AUTHORIZE_URL);
  u.searchParams.set('client_id', opzioni.client.clientId);
  u.searchParams.set('redirect_uri', opzioni.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email');
  u.searchParams.set('state', opzioni.state);
  u.searchParams.set('code_challenge', opzioni.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  // Suggerisce gli account del dominio; il controllo vero è su `hd` dopo il login.
  u.searchParams.set('hd', opzioni.dominio);
  // Refresh token Google: a ogni rinnovo si verifica che l'account sia ancora attivo.
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent select_account');
  return u.toString();
}

export async function sfidaPkce(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** Controlla i claim dell'ID token. Esportata per i test. */
export function verificaIdToken(
  idToken: string,
  client: ClientGoogle,
  dominio: string,
  adesso: Date = new Date(),
): string {
  let claim: ReturnType<typeof decodeJwt>;
  try {
    claim = decodeJwt(idToken);
  } catch {
    throw new ErrorePpu('non_autenticato', 'Risposta di Google non valida.');
  }
  const aud = Array.isArray(claim.aud) ? claim.aud : [claim.aud];
  if (!EMITTENTI.has(String(claim.iss)) || !aud.includes(client.clientId)) {
    throw new ErrorePpu('non_autenticato', 'Risposta di Google non valida.');
  }
  if (typeof claim.exp !== 'number' || claim.exp * 1000 <= adesso.getTime()) {
    throw new ErrorePpu('non_autenticato', 'Login Google scaduto: riprova.');
  }
  const email = typeof claim.email === 'string' ? claim.email.toLowerCase() : '';
  if (!email || claim.email_verified !== true) {
    throw new ErrorePpu('non_autenticato', 'Email Google non verificata.');
  }
  if (claim.hd !== dominio || !emailNelDominio(email, dominio)) {
    throw new ErrorePpu('dominio_non_ammesso', 'Account non appartenente al dominio del gruppo.');
  }
  return email;
}

/** Scambia il codice di Google e restituisce l'identità verificata. */
export async function scambiaCodiceGoogle(opzioni: {
  client: ClientGoogle;
  code: string;
  verifier: string;
  redirectUri: string;
  dominio: string;
}): Promise<IdentitaGoogle> {
  const risposta = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: opzioni.code,
      code_verifier: opzioni.verifier,
      redirect_uri: opzioni.redirectUri,
      client_id: opzioni.client.clientId,
      client_secret: opzioni.client.clientSecret,
    }),
  });
  if (!risposta.ok) throw new ErrorePpu('non_autenticato', 'Login Google non riuscito.');
  const dati = (await risposta.json()) as { id_token?: string; refresh_token?: string };
  if (!dati.id_token) throw new ErrorePpu('non_autenticato', 'Login Google non riuscito.');
  return {
    email: verificaIdToken(dati.id_token, opzioni.client, opzioni.dominio),
    refreshToken: dati.refresh_token ?? null,
  };
}

export type EsitoRinnovo = 'valido' | 'revocato' | 'non_disponibile';

/**
 * Rinnova il token Google: se Google risponde invalid_grant l'account è stato
 * sospeso, rimosso o ha revocato l'accesso.
 */
export async function rinnovaTokenGoogle(
  client: ClientGoogle,
  refreshToken: string,
): Promise<EsitoRinnovo> {
  let risposta: Response;
  try {
    risposta = await fetch(GOOGLE_TOKEN_URL, {
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
    return 'non_disponibile';
  }
  if (risposta.ok) return 'valido';
  const errore = ((await risposta.json().catch(() => ({}))) as { error?: string }).error;
  return errore === 'invalid_grant' ? 'revocato' : 'non_disponibile';
}
