import { Hono } from 'hono';
import { type Config, leggiConfig } from '../config.ts';
import type { Env } from '../env.ts';
import { ErrorePpu } from '../errori.ts';
import {
  COOKIE_UTENTE_TEST,
  caricaUtente,
  emailDallaRichiesta,
  emailNelDominio,
  type Utente,
} from '../identita/index.ts';
import { anteprimaImport, confermaImport } from '../import/servizio.ts';
import {
  cercaAssociati,
  elencaUnita,
  schedaAssociato,
  utentiDemo,
} from '../servizi/consultazione.ts';

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

/** Profilo dell'utente corrente: email, unità e ruoli, più nome del gruppo e ambiente. */
api.get('/io', (c) => {
  const u = c.get('utente');
  const config = c.get('config');
  return c.json({
    gruppo: config.nomeGruppo,
    ambiente: config.ambiente,
    modalitaTest: config.modalitaTest,
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

api.get('/unita', async (c) => c.json(await elencaUnita(c.env.DB, c.get('utente'))));

api.get('/associati', async (c) =>
  c.json(
    await cercaAssociati(c.env.DB, c.get('utente'), {
      q: c.req.query('q'),
      unita: c.req.query('unita'),
      stato: c.req.query('stato'),
    }),
  ),
);

api.get('/associati/:id', async (c) =>
  c.json(await schedaAssociato(c.env.DB, c.get('utente'), Number(c.req.param('id')))),
);

/**
 * Modalità di test (solo locale e preview): utenti finti da scegliere nella PWA.
 * Senza autenticazione, perché serve prima di avere un'identità; fuori dalla
 * modalità di test risponde 404.
 */
export const demo = new Hono<{ Bindings: Env }>();

function configTest(env: Env): Config {
  const config = leggiConfig(env);
  if (!config.modalitaTest) throw new ErrorePpu('non_trovato', 'Risorsa non trovata.');
  return config;
}

demo.get('/utenti', async (c) => {
  const config = configTest(c.env);
  return c.json(await utentiDemo(c.env.DB, config.dominio));
});

/** Sceglie l'utente finto: il Worker imposta il cookie (HttpOnly) letto da src/identita. */
demo.post('/accedi', async (c) => {
  const config = configTest(c.env);
  const corpo = await corpoJson(c.req.raw);
  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (!emailNelDominio(email, config.dominio)) {
    throw new ErrorePpu('richiesta_non_valida', 'Utente non valido.');
  }
  const sicuro = new URL(c.req.url).protocol === 'https:' ? '; Secure' : '';
  c.header(
    'Set-Cookie',
    `${COOKIE_UTENTE_TEST}=${encodeURIComponent(email)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${sicuro}`,
  );
  return c.json({ email });
});

demo.post('/esci', (c) => {
  configTest(c.env);
  c.header('Set-Cookie', `${COOKIE_UTENTE_TEST}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  return c.json({ ok: true });
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
