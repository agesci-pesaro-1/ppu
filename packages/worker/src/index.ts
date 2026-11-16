import { Hono } from 'hono';
import { ConfigError, readConfig } from './config.ts';
import type { Env } from './env.ts';
import { AppError } from './errors.ts';
import { api } from './rest/index.ts';

const app = new Hono<{ Bindings: Env }>();

/** Health check: no authentication, no data. */
app.get('/health', (c) => {
  const config = readConfig(c.env);
  return c.json({ status: 'ok', environment: config.environment });
});

app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message } }, err.httpStatus as 400);
  }
  if (err instanceof ConfigError) {
    console.error('Invalid configuration:', err.message);
    return c.json(
      { error: { code: 'configuration', message: 'Configurazione del server non valida.' } },
      500,
    );
  }
  // Never data in the logs: only the error type.
  console.error('Unexpected error:', err instanceof Error ? err.name : typeof err);
  return c.json({ error: { code: 'internal', message: 'Errore interno.' } }, 500);
});

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Non trovato.' } }, 404));

export default app satisfies ExportedHandler<Env>;
