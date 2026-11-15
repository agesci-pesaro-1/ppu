// Applica migrazioni e dati iniziali a un database SQLite in memoria (node:sqlite),
// per verificare lo schema senza Cloudflare. D1 è SQLite: lo schema è lo stesso.

import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { seedDemo } from '../../scripts/genera-seed-demo.ts';
import {
  type ConfigurazioneGruppo,
  leggiConfigurazione,
  sqlConfigurazione,
} from '../../scripts/seed-gruppo.ts';

const radice = fileURLToPath(new URL('../../', import.meta.url));

export function fileSql(cartella: string): string[] {
  return readdirSync(`${radice}${cartella}`)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(`${radice}${cartella}/${f}`, 'utf8'));
}

export function creaDatabase(
  opzioni: { config?: ConfigurazioneGruppo | null; base?: boolean; demo?: boolean } = {},
): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;'); // come in D1
  for (const s of fileSql('migrations')) db.exec(s);
  const config = opzioni.config === undefined ? leggiConfigurazione() : opzioni.config;
  if (config) db.exec(sqlConfigurazione(config));
  if (opzioni.base ?? true) for (const s of fileSql('seed/base')) db.exec(s);
  if (opzioni.demo) db.exec(seedDemo);
  return db;
}
