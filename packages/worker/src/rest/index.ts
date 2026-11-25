import { Hono } from 'hono';
import { type Config, readConfig } from '../config.ts';
import { createDb, type Db } from '../db/index.ts';
import type { Env } from '../env.ts';
import { AppError } from '../errors.ts';
import {
  emailFromRequest,
  isInDomain,
  loadUser,
  TEST_USER_COOKIE,
  type User,
} from '../identity/index.ts';
import { confirmImport, previewImport } from '../import/service.ts';
import { demoUsers, listUnits, memberCard, searchMembers } from '../services/browse.ts';

export interface Variables {
  config: Config;
  db: Db;
  user: User;
}

export const api = new Hono<{ Bindings: Env; Variables: Variables }>();

// Identity on every PWA call: Access JWT (or the test identity in preview).
api.use('*', async (c, next) => {
  const config = readConfig(c.env);
  const email = await emailFromRequest(c.req.raw, config);
  const db = createDb(c.env.DB);
  c.set('config', config);
  c.set('db', db);
  c.set('user', await loadUser(db, email, config));
  await next();
});

/** Current user's profile: email, units and roles, plus group name and environment. */
api.get('/me', (c) => {
  const u = c.get('user');
  const config = c.get('config');
  return c.json({
    group: config.groupName,
    environment: config.environment,
    testMode: config.testMode,
    email: u.email,
    units: u.units,
    roles: {
      fullAccess: u.fullAccess,
      buonaStrada: u.buonaStrada,
      webmaster: u.webmaster,
      betaTester: u.betaTester,
    },
    memberId: u.memberId,
  });
});

api.get('/units', async (c) => c.json(await listUnits(c.get('db'), c.get('user'))));

api.get('/members', async (c) =>
  c.json(
    await searchMembers(c.get('db'), c.get('user'), {
      q: c.req.query('q'),
      unit: c.req.query('unit'),
      status: c.req.query('status'),
    }),
  ),
);

api.get('/members/:id', async (c) =>
  c.json(await memberCard(c.get('db'), c.get('user'), Number(c.req.param('id')))),
);

async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('bad_request', 'Il corpo della richiesta deve essere JSON.');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError('bad_request', 'Il corpo della richiesta deve essere un oggetto JSON.');
  }
  return body as Record<string, unknown>;
}

// Import from the sheet (webmaster only: the service checks the permission).
api.post('/admin/import/preview', async (c) => {
  const body = await jsonBody(c.req.raw);
  return c.json(
    await previewImport(c.get('db'), c.get('user'), { csv: body.csv, mapping: body.mapping }),
  );
});

api.post('/admin/import/confirm', async (c) => {
  const body = await jsonBody(c.req.raw);
  return c.json(
    await confirmImport(c.get('db'), c.get('user'), {
      csv: body.csv,
      mapping: body.mapping,
      hash: body.hash,
    }),
  );
});

/**
 * Test mode (local and preview only): fake users to pick in the PWA. No
 * authentication, because it is needed before having an identity; outside test
 * mode it answers 404.
 */
export const demo = new Hono<{ Bindings: Env }>();

function testConfig(env: Env): Config {
  const config = readConfig(env);
  if (!config.testMode) throw new AppError('not_found', 'Risorsa non trovata.');
  return config;
}

demo.get('/users', async (c) => {
  const config = testConfig(c.env);
  return c.json(await demoUsers(createDb(c.env.DB), config.domain));
});

/** Picks the fake user: the Worker sets the (HttpOnly) cookie read by src/identity. */
demo.post('/login', async (c) => {
  const config = testConfig(c.env);
  const body = await jsonBody(c.req.raw);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!isInDomain(email, config.domain)) {
    throw new AppError('bad_request', 'Utente non valido.');
  }
  const secure = new URL(c.req.url).protocol === 'https:' ? '; Secure' : '';
  c.header(
    'Set-Cookie',
    `${TEST_USER_COOKIE}=${encodeURIComponent(email)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`,
  );
  return c.json({ email });
});

demo.post('/logout', (c) => {
  testConfig(c.env);
  c.header('Set-Cookie', `${TEST_USER_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  return c.json({ ok: true });
});

api.notFound(() => {
  throw new AppError('not_found', 'Risorsa non trovata.');
});
