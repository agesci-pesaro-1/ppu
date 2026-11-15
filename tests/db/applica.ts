// Applica migrazioni e seed a un database SQLite in memoria (node:sqlite),
// per verificare lo schema senza Cloudflare. D1 è SQLite: lo schema è lo stesso.

import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const radice = fileURLToPath(new URL('../../', import.meta.url));

export function fileSql(cartella: string): string[] {
  return readdirSync(`${radice}${cartella}`)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${radice}${cartella}/${f}`, 'utf8'));
}

export function creaDatabase(opzioni: { base?: boolean; demo?: boolean } = {}): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;'); // come in D1
  for (const s of fileSql('migrations')) db.exec(s);
  if (opzioni.base ?? true) for (const s of fileSql('seed/base')) db.exec(s);
  if (opzioni.demo) for (const s of fileSql('seed/demo')) db.exec(s);
  return db;
}
