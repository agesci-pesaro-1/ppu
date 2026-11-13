import { OAuthError, OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { ErroreConfigurazione, leggiConfig } from './config.ts';
import type { Env } from './env.ts';
import { ErrorePpu } from './errori.ts';
import { rinnovaTokenGoogle } from './identita/google.ts';
import { caricaUtente, emailNelDominio, HEADER_UTENTE_TEST } from './identita/index.ts';
import { gestisciMcp, PERCORSO_MCP } from './mcp/index.ts';
import { autorizzazione, type PropsMcp } from './oauth/autorizzazione.ts';
import { api, demo } from './rest/index.ts';

const app = new Hono<{ Bindings: Env }>();

/** Controllo di salute, senza autenticazione e senza dati. */
app.get('/salute', (c) => {
  const config = leggiConfig(c.env);
  return c.json({ stato: 'ok', ambiente: config.ambiente });
});

app.route('/api/demo', demo);
app.route('/api', api);
app.route('/', autorizzazione);

app.onError((err, c) => {
  if (err instanceof ErrorePpu) {
    return c.json({ errore: { codice: err.codice, messaggio: err.message } }, err.statoHttp as 400);
  }
  if (err instanceof ErroreConfigurazione) {
    console.error('Configurazione non valida:', err.message);
    return c.json(
      { errore: { codice: 'configurazione', messaggio: 'Configurazione del server non valida.' } },
      500,
    );
  }
  // Mai dati nei log: solo il tipo di errore.
  console.error('Errore inatteso:', err instanceof Error ? err.name : typeof err);
  return c.json({ errore: { codice: 'interno', messaggio: 'Errore interno.' } }, 500);
});

app.notFound((c) => c.json({ errore: { codice: 'non_trovato', messaggio: 'Non trovato.' } }, 404));

/** Endpoint MCP protetto da OAuth: ctx.props è ciò che ha salvato il callback Google. */
const handlerMcp = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const props = (ctx as ExecutionContext & { props: PropsMcp }).props;
    return gestisciMcp(request, env, leggiConfig(env), props.email);
  },
} satisfies ExportedHandler<Env>;

// Un provider per origine: il resource indicator dell'MCP dipende dall'host
// dell'installazione, che non è scritto nel codice.
const provider = new Map<string, OAuthProvider<Env>>();

function providerPer(origine: string): OAuthProvider<Env> {
  let p = provider.get(origine);
  if (!p) {
    p = new OAuthProvider<Env>({
      apiRoute: PERCORSO_MCP,
      apiHandler: handlerMcp,
      defaultHandler: app,
      authorizeEndpoint: '/authorize',
      tokenEndpoint: '/oauth/token',
      clientRegistrationEndpoint: '/oauth/register',
      scopesSupported: ['ppu'],
      resourceMetadata: {
        resource: `${origine}${PERCORSO_MCP}`,
        authorization_servers: [origine],
        resource_name: 'PPU',
      },
      accessTokenTTL: 60 * 60,
      refreshTokenTTL: 30 * 24 * 60 * 60,
      // A ogni rinnovo: l'account Google è ancora attivo? L'utente è ancora ammesso?
      async tokenExchangeCallback({ grantType, props, env }) {
        if (grantType !== 'refresh_token') return;
        const p = props as PropsMcp;
        const config = leggiConfig(env);
        try {
          await caricaUtente(env.DB, p.email, config);
        } catch (e) {
          if (e instanceof ErrorePpu)
            throw new OAuthError('invalid_grant', { description: e.message });
          throw e;
        }
        if (config.google && p.googleRefreshToken) {
          const esito = await rinnovaTokenGoogle(config.google, p.googleRefreshToken);
          if (esito === 'revocato') {
            throw new OAuthError('invalid_grant', {
              description: 'Account Google non più attivo.',
            });
          }
          if (esito === 'non_disponibile') {
            throw new OAuthError('temporarily_unavailable', {
              description: 'Google non raggiungibile.',
              statusCode: 503,
            });
          }
        }
      },
    });
    provider.set(origine, p);
  }
  return p;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mcp = url.pathname === PERCORSO_MCP || url.pathname.startsWith(`${PERCORSO_MCP}/`);
    if (mcp && request.headers.has(HEADER_UTENTE_TEST)) {
      // Modalità di test (solo locale e preview): identità dall'header, niente OAuth.
      try {
        const config = leggiConfig(env);
        const email = request.headers.get(HEADER_UTENTE_TEST) ?? '';
        if (config.modalitaTest && emailNelDominio(email, config.dominio)) {
          return gestisciMcp(request, env, config, email.trim().toLowerCase());
        }
      } catch (e) {
        if (!(e instanceof ErroreConfigurazione)) throw e;
        console.error('Configurazione non valida:', e.message);
        return Response.json(
          {
            errore: {
              codice: 'configurazione',
              messaggio: 'Configurazione del server non valida.',
            },
          },
          { status: 500 },
        );
      }
    }
    return providerPer(url.origin).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
