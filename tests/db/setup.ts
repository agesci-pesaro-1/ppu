// Applies migrations and initial data to an in-memory SQLite database
// (node:sqlite), to check the schema without Cloudflare. D1 is SQLite: same schema.

import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { demoSeed } from '../../scripts/demo-seed.ts';
import { type GroupConfig, groupSeedSql, readGroupConfig } from '../../scripts/group-seed.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));

export function sqlFiles(dir: string): string[] {
  return readdirSync(`${root}${dir}`)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${root}${dir}/${f}`, 'utf8'));
}

export function createDatabase(
  options: { config?: GroupConfig | null; base?: boolean; demo?: boolean } = {},
): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;'); // as in D1
  for (const s of sqlFiles('migrations')) db.exec(s);
  const config = options.config === undefined ? readGroupConfig() : options.config;
  if (config) db.exec(groupSeedSql(config));
  if (options.base ?? true) for (const s of sqlFiles('seed/base')) db.exec(s);
  if (options.demo) db.exec(demoSeed);
  return db;
}
