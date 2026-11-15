// Pagina /authorize del provider OAuth dell'MCP: consenso per il client MCP,
// poi login Google limitato al dominio, poi rilascio del token.
//
// Flusso (helper di @cloudflare/workers-oauth-provider, che legano consenso e
// `state` al browser con cookie __Host- e impediscono il framing):
//   GET  /authorize               → pagina di consenso
//   POST /authorize               → consenso dato: redirect a Google (PKCE)
//   GET  /oauth/google/callback   → scambio del codice, controlli, token MCP

import type { ConsentDescription } from '@cloudflare/workers-oauth-provider';
import {
  AuthorizationError,
  authorizationErrorRedirect,
  CimdFetchError,
} from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { leggiConfig } from '../config.ts';
import type { Env } from '../env.ts';
import { ErrorePpu } from '../errori.ts';
import { scambiaCodiceGoogle, sfidaPkce, urlAutorizzazioneGoogle } from '../identita/google.ts';
import { caricaUtente } from '../identita/index.ts';

/** Dati cifrati nel grant e passati all'endpoint MCP come ctx.props. */
export interface PropsMcp {
  email: string;
  googleRefreshToken: string | null;
}

export const PERCORSO_CALLBACK = '/oauth/google/callback';

const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function pagina(titolo: string, corpo: string, stato = 200, headers = new Headers()): Response {
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(
    `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(titolo)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5}
button{font:inherit;padding:.5rem 1rem;margin-right:.5rem}.avviso{background:#fff3cd;padding:.5rem;border-radius:.25rem}</style>
<h1>${escapeHtml(titolo)}</h1>${corpo}</html>`,
    { status: stato, headers },
  );
}

function paginaConsenso(d: ConsentDescription, handle: string, nomeGruppo: string): string {
  const origine = d.clientDomain
    ? `Pubblicata da <strong>${escapeHtml(d.clientDomain)}</strong>.`
    : "L'applicazione si è registrata da sola: il nome non è verificato.";
  return `<p><strong>${escapeHtml(d.clientName)}</strong> chiede di accedere a PPU di ${escapeHtml(nomeGruppo)} a tuo nome.</p>
<p>${origine} L'accesso sarà inviato a <strong>${escapeHtml(d.redirectHost)}</strong>.</p>
${d.redirectIsLoopback ? '<p class="avviso">L\'accesso va a un\'applicazione sul tuo computer: continua solo se hai appena avviato tu il collegamento.</p>' : ''}
<p>Dopo il consenso entrerai con il tuo account Google del gruppo.</p>
<form method="post">
<input type="hidden" name="handle" value="${escapeHtml(handle)}">
<button name="decisione" value="consenti">Consenti</button><button name="decisione" value="nega">Nega</button>
</form>`;
}

export const autorizzazione = new Hono<{ Bindings: Env }>();

const oauth = (env: Env) => {
  if (!env.OAUTH_PROVIDER) throw new Error('OAUTH_PROVIDER non disponibile');
  return env.OAUTH_PROVIDER;
};

function erroreLocale(e: unknown): Response {
  if (e instanceof AuthorizationError && e.redirectTo) return Response.redirect(e.redirectTo, 302);
  if (e instanceof AuthorizationError || e instanceof CimdFetchError) {
    const msg =
      e instanceof AuthorizationError ? e.description : "L'applicazione non è verificabile.";
    return pagina(
      'Richiesta non valida',
      `<p>${escapeHtml(msg ?? 'Richiesta non valida.')}</p>`,
      400,
    );
  }
  if (e instanceof ErrorePpu) {
    return pagina('Accesso negato', `<p>${escapeHtml(e.message)}</p>`, e.statoHttp);
  }
  throw e;
}

autorizzazione.get('/authorize', async (c) => {
  const config = leggiConfig(c.env);
  if (!config.google)
    return pagina('Login non configurato', '<p>Il login Google non è configurato.</p>', 503);
  try {
    const api = oauth(c.env);
    const richiesta = await api.parseAuthRequest(c.req.raw);
    const dettagli = await api.describeConsent(richiesta);
    const consenso = await api.beginConsent(richiesta);
    return pagina(
      `Collegare ${dettagli.clientName}?`,
      paginaConsenso(dettagli, consenso.handle, config.nomeGruppo),
      200,
      consenso.headers,
    );
  } catch (e) {
    return erroreLocale(e);
  }
});

autorizzazione.post('/authorize', async (c) => {
  const config = leggiConfig(c.env);
  if (!config.google)
    return pagina('Login non configurato', '<p>Il login Google non è configurato.</p>', 503);
  try {
    const api = oauth(c.env);
    const form = await c.req.raw.formData();
    const handle = String(form.get('handle'));
    if (form.get('decisione') !== 'consenti') {
      const negato = await api.denyConsent(c.req.raw, handle);
      return new Response(null, { status: 302, headers: negato.headers });
    }
    const approvato = await api.approveConsent(c.req.raw, handle);
    const verifier = crypto.randomUUID() + crypto.randomUUID();
    const { state, headers } = await api.beginUpstream(approvato.request, {
      data: { verifier },
      headers: approvato.headers,
    });
    headers.set(
      'Location',
      urlAutorizzazioneGoogle({
        client: config.google,
        redirectUri: new URL(PERCORSO_CALLBACK, c.req.url).toString(),
        state,
        codeChallenge: await sfidaPkce(verifier),
        dominio: config.dominio,
      }),
    );
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return erroreLocale(e);
  }
});

autorizzazione.get(PERCORSO_CALLBACK, async (c) => {
  const config = leggiConfig(c.env);
  if (!config.google)
    return pagina('Login non configurato', '<p>Il login Google non è configurato.</p>', 503);
  try {
    const api = oauth(c.env);
    const url = new URL(c.req.url);
    const {
      request: originale,
      data,
      headers,
    } = await api.finishUpstream<{ verifier: string }>(c.req.raw);
    const code = url.searchParams.get('code');
    if (url.searchParams.get('error') || !code) {
      headers.set('Location', authorizationErrorRedirect(originale, 'access_denied'));
      return new Response(null, { status: 302, headers });
    }
    const identita = await scambiaCodiceGoogle({
      client: config.google,
      code,
      verifier: data.verifier,
      redirectUri: new URL(PERCORSO_CALLBACK, c.req.url).toString(),
      dominio: config.dominio,
    });
    // Stessi controlli della PWA: esclusi fuori, in beta solo i tester.
    await caricaUtente(c.env.DB, identita.email, config);
    const props: PropsMcp = { email: identita.email, googleRefreshToken: identita.refreshToken };
    const { redirectTo } = await api.completeAuthorization({
      request: originale,
      userId: identita.email,
      metadata: {},
      scope: originale.scope,
      props,
    });
    headers.set('Location', redirectTo);
    return new Response(null, { status: 302, headers });
  } catch (e) {
    return erroreLocale(e);
  }
});
