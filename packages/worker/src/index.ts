import { OAuthError, OAuthProvider } from '@cloudflare/workers-oauth-provider';
import { Hono } from 'hono';
import { ConfigError, readConfig } from './config.ts';
import { createDb } from './db/index.ts';
import type { Env } from './env.ts';
import { AppError } from './errors.ts';
import { refreshGoogleToken } from './identity/google.ts';
import { isInDomain, loadUser, TEST_USER_HEADER } from './identity/index.ts';
import { handleMcp, MCP_PATH } from './mcp/index.ts';
import { authorizeApp, type McpProps } from './oauth/authorize.ts';
import { api, demo } from './rest/index.ts';

const app = new Hono<{ Bindings: Env }>();

/** Health check: no authentication, no data. */
app.get('/health', (c) => {
  const config = readConfig(c.env);
  return c.json({ status: 'ok', environment: config.environment });
});

app.route('/api/demo', demo);
app.route('/api', api);
app.route('/', authorizeApp);

const configurationError = {
  code: 'configuration',
  message: 'Configurazione del server non valida.',
};

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400);
  }
  if (err instanceof ConfigError) {
    console.error('Invalid configuration:', err.message);
    return c.json({ error: configurationError }, 500);
  }
  // Never data in the logs: only the error type.
  console.error('Unexpected error:', err instanceof Error ? err.name : typeof err);
  return c.json({ error: { code: 'internal', message: 'Errore interno.' } }, 500);
});

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Non trovato.' } }, 404));

/** MCP endpoint protected by OAuth: ctx.props is what the Google callback stored. */
const mcpHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const props = (ctx as ExecutionContext & { props: McpProps }).props;
    return handleMcp(request, env, readConfig(env), props.email);
  },
} satisfies ExportedHandler<Env>;

// One provider per origin: the MCP resource indicator depends on the
// installation's host, which is not written in the code.
const providers = new Map<string, OAuthProvider<Env>>();

function providerFor(origin: string): OAuthProvider<Env> {
  let p = providers.get(origin);
  if (!p) {
    p = new OAuthProvider<Env>({
      apiRoute: MCP_PATH,
      apiHandler: mcpHandler,
      defaultHandler: app,
      authorizeEndpoint: '/authorize',
      tokenEndpoint: '/oauth/token',
      clientRegistrationEndpoint: '/oauth/register',
      scopesSupported: ['ppu'],
      resourceMetadata: {
        resource: `${origin}${MCP_PATH}`,
        authorization_servers: [origin],
        resource_name: 'PPU',
      },
      accessTokenTTL: 60 * 60,
      refreshTokenTTL: 30 * 24 * 60 * 60,
      // On every renewal: is the Google account still active? Is the user still allowed?
      async tokenExchangeCallback({ grantType, props, env }) {
        if (grantType !== 'refresh_token') return;
        const p = props as McpProps;
        const config = readConfig(env);
        try {
          await loadUser(createDb(env.DB), p.email, config);
        } catch (e) {
          if (e instanceof AppError) {
            throw new OAuthError('invalid_grant', { description: e.message });
          }
          throw e;
        }
        if (config.google && p.googleRefreshToken) {
          const outcome = await refreshGoogleToken(config.google, p.googleRefreshToken);
          if (outcome === 'revoked') {
            throw new OAuthError('invalid_grant', {
              description: 'Account Google non più attivo.',
            });
          }
          if (outcome === 'unavailable') {
            throw new OAuthError('temporarily_unavailable', {
              description: 'Google non raggiungibile.',
              statusCode: 503,
            });
          }
        }
      },
    });
    providers.set(origin, p);
  }
  return p;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const mcp = url.pathname === MCP_PATH || url.pathname.startsWith(`${MCP_PATH}/`);
    if (mcp && request.headers.has(TEST_USER_HEADER)) {
      // Test mode (local and preview only): identity from the header, no OAuth.
      try {
        const config = readConfig(env);
        const email = request.headers.get(TEST_USER_HEADER) ?? '';
        if (config.testMode && isInDomain(email, config.domain)) {
          return handleMcp(request, env, config, email.trim().toLowerCase());
        }
      } catch (e) {
        if (!(e instanceof ConfigError)) throw e;
        console.error('Invalid configuration:', e.message);
        return Response.json({ error: configurationError }, { status: 500 });
      }
    }
    return providerFor(url.origin).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
