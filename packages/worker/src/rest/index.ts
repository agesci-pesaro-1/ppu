import { Hono } from 'hono';
import { type Config, readConfig } from '../config.ts';
import { createDb, type Db } from '../db/index.ts';
import type { Env } from '../env.ts';
import { AppError } from '../errors.ts';
import { emailFromRequest, loadUser, type User } from '../identity/index.ts';

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

/** Current user's profile: email, units and roles. */
api.get('/me', (c) => {
  const u = c.get('user');
  return c.json({
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

api.notFound(() => {
  throw new AppError('not_found', 'Risorsa non trovata.');
});
