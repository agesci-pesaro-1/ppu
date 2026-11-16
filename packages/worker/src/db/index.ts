import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.ts';

export type Db = DrizzleD1Database<typeof schema>;

/** Drizzle client on the D1 binding. Cheap to create: one per request. */
export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

export { schema };
