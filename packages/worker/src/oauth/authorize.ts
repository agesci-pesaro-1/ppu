// /authorize page of the MCP's OAuth provider: consent for the MCP client,
// then Google login limited to the domain, then the token is issued.
//
// Flow (helpers of @cloudflare/workers-oauth-provider, which bind consent and
// `state` to the browser with __Host- cookies and prevent framing):
//   GET  /authorize               → consent page
//   POST /authorize               → consent given: redirect to Google (PKCE)
//   GET  /oauth/google/callback   → code exchange, checks, MCP token
//
// The pages are read by people: their text is Italian.

import type { ConsentDescription } from '@cloudflare/workers-oauth-provider';
import {
  AuthorizationError,
  authorizationErrorRedirect,
  CimdFetchError,
} from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { readConfig } from '../config.ts';
import { createDb } from '../db/index.ts';
import type { Env } from '../env.ts';
import { AppError } from '../errors.ts';
import { exchangeGoogleCode, googleAuthorizeUrl, pkceChallenge } from '../identity/google.ts';
import { loadUser } from '../identity/index.ts';

/** Data encrypted in the grant and passed to the MCP endpoint as ctx.props. */
export interface McpProps {
  email: string;
  googleRefreshToken: string | null;
}

export const CALLBACK_PATH = '/oauth/google/callback';

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(title: string, body: string, status = 200, headers = new Headers()): Response {
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(
    `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
button{font:inherit;padding:.5rem 1rem;margin-right:.5rem}.warning{background:#fff3cd;padding:.5rem;border-radius:.25rem}</style>
<h1>${escapeHtml(title)}</h1>${body}</html>`,
    { status, headers },
  );
}

function consentPage(d: ConsentDescription, handle: string, groupName: string): string {
  const origin = d.clientDomain
    ? `Pubblicata da <strong>${escapeHtml(d.clientDomain)}</strong>.`
    : "L'applicazione si è registrata da sola: il nome non è verificato.";
  return `<p><strong>${escapeHtml(d.clientName)}</strong> chiede di accedere a PPU di ${escapeHtml(groupName)} a tuo nome.</p>
<p>${origin} L'accesso sarà inviato a <strong>${escapeHtml(d.redirectHost)}</strong>.</p>
${d.redirectIsLoopback ? '<p class="warning">L\'accesso va a un\'applicazione sul tuo computer: continua solo se hai appena avviato tu il collegamento.</p>' : ''}
<p>Dopo il consenso entrerai con il tuo account Google del gruppo.</p>
<form method="post">
<input type="hidden" name="handle" value="${escapeHtml(handle)}">
<button name="decision" value="allow">Consenti</button><button name="decision" value="deny">Nega</button>
</form>`;
}

const notConfigured = () =>
  page('Login non configurato', '<p>Il login Google non è configurato.</p>', 503);

export const authorizeApp = new Hono<{ Bindings: Env }>();

const oauth = (env: Env) => {
  if (!env.OAUTH_PROVIDER) throw new Error('OAUTH_PROVIDER not available');
  return env.OAUTH_PROVIDER;
};

function errorPage(e: unknown): Response {
  if (e instanceof AuthorizationError && e.redirectTo) return Response.redirect(e.redirectTo, 302);
  if (e instanceof AuthorizationError || e instanceof CimdFetchError) {
    const message =
      e instanceof AuthorizationError ? e.description : "L'applicazione non è verificabile.";
    return page(
      'Richiesta non valida',
      `<p>${escapeHtml(message ?? 'Richiesta non valida.')}</p>`,
      400,
    );
  }
  if (e instanceof AppError) {
    return page('Accesso negato', `<p>${escapeHtml(e.message)}</p>`, e.httpStatus);
  }
  throw e;
}

authorizeApp.get('/authorize', async (c) => {
  const config = readConfig(c.env);
  if (!config.google) return notConfigured();
  try {
    const api = oauth(c.env);
    const request = await api.parseAuthRequest(c.req.raw);
    const details = await api.describeConsent(request);
    const consent = await api.beginConsent(request);
    return page(
      `Collegare ${details.clientName}?`,
      consentPage(details, consent.handle, config.groupName),
      200,
      consent.headers,
    );
  } catch (e) {
    return errorPage(e);
  }
});

authorizeApp.post('/authorize', async (c) => {
  const config = readConfig(c.env);
  if (!config.google) return notConfigured();
  try {
    const api = oauth(c.env);
    const form = await c.req.raw.formData();
    const handle = String(form.get('handle'));
    if (form.get('decision') !== 'allow') {
      const denied = await api.denyConsent(c.req.raw, handle);
      return new Response(null, { status: 302, headers: denied.headers });
    }
    const approved = await api.approveConsent(c.req.raw, handle);
    const verifier = crypto.randomUUID() + crypto.randomUUID();
    const { state, headers } = await api.beginUpstream(approved.request, {
      data: { verifier },
      headers: approved.headers,
    });
    headers.set(
      'Location',
      googleAuthorizeUrl({
        client: config.google,
        redirectUri: new URL(CALLBACK_PATH, c.req.url).toString(),
        state,
        codeChallenge: await pkceChallenge(verifier),
        domain: config.domain,
      }),
    );
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return errorPage(e);
  }
});

authorizeApp.get(CALLBACK_PATH, async (c) => {
  const config = readConfig(c.env);
  if (!config.google) return notConfigured();
  try {
    const api = oauth(c.env);
    const url = new URL(c.req.url);
    const {
      request: original,
      data,
      headers,
    } = await api.finishUpstream<{ verifier: string }>(c.req.raw);
    const code = url.searchParams.get('code');
    if (url.searchParams.get('error') || !code) {
      headers.set('Location', authorizationErrorRedirect(original, 'access_denied'));
      return new Response(null, { status: 302, headers });
    }
    const identity = await exchangeGoogleCode({
      client: config.google,
      code,
      verifier: data.verifier,
      redirectUri: new URL(CALLBACK_PATH, c.req.url).toString(),
      domain: config.domain,
    });
    // Same checks as the PWA: excluded accounts out, only testers in beta.
    await loadUser(createDb(c.env.DB), identity.email, config);
    const props: McpProps = { email: identity.email, googleRefreshToken: identity.refreshToken };
    const { redirectTo } = await api.completeAuthorization({
      request: original,
      userId: identity.email,
      metadata: {},
      scope: original.scope,
      props,
    });
    headers.set('Location', redirectTo);
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return errorPage(e);
  }
});
