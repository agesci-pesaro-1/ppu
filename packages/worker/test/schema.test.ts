// The Drizzle schema (src/db/schema.ts) must mirror the migrated database
// (migrations/*.sql, the source of truth): same tables, columns, types,
// NOT NULL, defaults, primary and foreign keys. See ADR 0010.

import { env } from 'cloudflare:workers';
import { getTableName, is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import * as schema from '../src/db/schema.ts';

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface ForeignKeyInfo {
  table: string;
  from: string;
  to: string;
}

const drizzleTables: SQLiteTable[] = (Object.values(schema) as unknown[]).filter(
  (v): v is SQLiteTable => is(v, SQLiteTable),
);

async function databaseTables(): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
        AND name NOT IN ('d1_migrations', 'd1_seed')`,
  ).all<{ name: string }>();
  return results.map((r) => r.name).sort();
}

const pragma = async <T>(name: string, table: string) =>
  (await env.DB.prepare(`SELECT * FROM pragma_${name}(?)`).bind(table).all<T>()).results;

/** Columns as the database describes them, in a comparable form. */
async function databaseColumns(table: string) {
  const columns = await pragma<ColumnInfo>('table_info', table);
  return columns
    .map((c) => ({
      name: c.name,
      type: c.type.toLowerCase(),
      // Primary key columns are checked through `primaryKey` only: SQLite
      // reports them as nullable, and Drizzle marks INTEGER PRIMARY KEY (the
      // rowid, assigned automatically) as having a default.
      notNull: c.pk > 0 ? null : c.notnull === 1,
      hasDefault: c.pk > 0 ? null : c.dflt_value !== null,
      primaryKey: c.pk > 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The same description from the Drizzle table. */
function drizzleColumns(table: SQLiteTable) {
  const config = getTableConfig(table);
  const compositeKey = new Set(config.primaryKeys.flatMap((pk) => pk.columns.map((c) => c.name)));
  return config.columns
    .map((c) => {
      const primaryKey = c.primary || compositeKey.has(c.name);
      return {
        name: c.name,
        type: c.getSQLType().toLowerCase(),
        notNull: primaryKey ? null : c.notNull,
        hasDefault: primaryKey ? null : c.hasDefault,
        primaryKey,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function databaseForeignKeys(table: string): Promise<string[]> {
  const keys = await pragma<ForeignKeyInfo>('foreign_key_list', table);
  return keys.map((k) => `${k.from} -> ${k.table}.${k.to}`).sort();
}

function drizzleForeignKeys(table: SQLiteTable): string[] {
  return getTableConfig(table)
    .foreignKeys.flatMap((fk) => {
      const ref = fk.reference();
      const target = getTableName(ref.foreignTable);
      return ref.columns.map((c, i) => `${c.name} -> ${target}.${ref.foreignColumns[i]?.name}`);
    })
    .sort();
}

describe('Drizzle schema mirrors the migrations', () => {
  it('has the same tables', async () => {
    expect(drizzleTables.map((t) => getTableName(t)).sort()).toEqual(await databaseTables());
  });

  for (const table of drizzleTables) {
    const name = getTableName(table);

    it(`${name}: same columns, types, NOT NULL, defaults and primary key`, async () => {
      expect(drizzleColumns(table)).toEqual(await databaseColumns(name));
    });

    it(`${name}: same foreign keys`, async () => {
      expect(drizzleForeignKeys(table)).toEqual(await databaseForeignKeys(name));
    });
  }
});
