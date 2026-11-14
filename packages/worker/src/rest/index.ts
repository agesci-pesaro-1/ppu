import { Hono } from 'hono';
import { type Config, leggiConfig } from '../config.ts';
import type { Env } from '../env.ts';
import { ErrorePpu } from '../errori.ts';
import { caricaUtente, emailDallaRichiesta, type Utente } from '../identita/index.ts';
import { anteprimaImport, confermaImport } from '../import/servizio.ts';

export interface Variabili {
  config: Config;
  utente: Utente;
}

export const api = new Hono<{ Bindings: Env; Variables: Variabili }>();

// Identità su ogni chiamata della PWA: JWT di Access (o identità di test in preview).
api.use('*', async (c, next) => {
  const config = leggiConfig(c.env);
  const email = await emailDallaRichiesta(c.req.raw, config);
  c.set('config', config);
  c.set('utente', await caricaUtente(c.env.DB, email, config));
  await next();
});

/** Profilo dell'utente corrente: email, unità e ruoli. */
api.get('/io', (c) => {
  const u = c.get('utente');
  return c.json({
    email: u.email,
    unita: u.unita,
    ruoli: {
      accessoCompleto: u.accessoCompleto,
      buonaStrada: u.buonaStrada,
      webmaster: u.webmaster,
      betaTester: u.betaTester,
    },
    associatoId: u.associatoId,
  });
});

async function corpoJson(req: Request): Promise<Record<string, unknown>> {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    throw new ErrorePpu('richiesta_non_valida', 'Il corpo della richiesta deve essere JSON.');
  }
  if (typeof corpo !== 'object' || corpo === null || Array.isArray(corpo)) {
    throw new ErrorePpu(
      'richiesta_non_valida',
      'Il corpo della richiesta deve essere un oggetto JSON.',
    );
  }
  return corpo as Record<string, unknown>;
}

// Import dal foglio (solo webmaster: il permesso è controllato nel servizio).
api.post('/admin/import/anteprima', async (c) => {
  const corpo = await corpoJson(c.req.raw);
  return c.json(
    await anteprimaImport(c.env.DB, c.get('utente'), {
      csv: corpo.csv,
      mappatura: corpo.mappatura,
    }),
  );
});

api.post('/admin/import/conferma', async (c) => {
  const corpo = await corpoJson(c.req.raw);
  return c.json(
    await confermaImport(c.env.DB, c.get('utente'), {
      csv: corpo.csv,
      mappatura: corpo.mappatura,
      hash: corpo.hash,
    }),
  );
});

api.notFound(() => {
  throw new ErrorePpu('non_trovato', 'Risorsa non trovata.');
});
