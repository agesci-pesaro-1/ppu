// Dati iniziali del gruppo: branche, unità e tipi di tag letti da un file di
// configurazione JSON (esempio: config/gruppo.esempio.json) e tradotti in SQL.
//
// Uso: node scripts/seed-gruppo.ts [file]   (stampa l'SQL su stdout)
//
// L'SQL si può riapplicare: aggiunge le voci nuove e non tocca quelle già
// presenti (ON CONFLICT DO NOTHING). Va applicato prima di seed/base, che
// inserisce il catalogo di progressione solo per le branche presenti.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ConfigurazioneGruppo {
  branche: { id: string; nome: string }[];
  unita: { id: string; nome: string; branca: string; attiva?: boolean }[];
  tipi_tag: { id: string; nome: string; esclusivo?: boolean }[];
}

export const CONFIG_ESEMPIO = fileURLToPath(
  new URL('../config/gruppo.esempio.json', import.meta.url),
);

const ID = /^[a-z][a-z0-9_]*$/;

export function leggiConfigurazione(file: string = CONFIG_ESEMPIO): ConfigurazioneGruppo {
  const config = JSON.parse(readFileSync(file, 'utf8')) as ConfigurazioneGruppo;
  validaConfigurazione(config);
  return config;
}

export function validaConfigurazione(config: ConfigurazioneGruppo): void {
  const errori: string[] = [];
  for (const sezione of ['branche', 'unita', 'tipi_tag'] as const) {
    const voci = config[sezione];
    if (!Array.isArray(voci)) {
      errori.push(`manca l'elenco "${sezione}"`);
      continue;
    }
    const visti = new Set<string>();
    for (const v of voci) {
      if (typeof v.id !== 'string' || !ID.test(v.id))
        errori.push(`${sezione}: id non valido "${v.id}"`);
      if (typeof v.nome !== 'string' || !v.nome.trim())
        errori.push(`${sezione}: "${v.id}" senza nome`);
      if (visti.has(v.id)) errori.push(`${sezione}: id ripetuto "${v.id}"`);
      visti.add(v.id);
    }
  }
  if (errori.length === 0) {
    const branche = new Set(config.branche.map((b) => b.id));
    for (const u of config.unita) {
      if (!branche.has(u.branca))
        errori.push(`unita: "${u.id}" usa la branca inesistente "${u.branca}"`);
    }
    // tag.tipo_id ha 'varie' come valore predefinito: il tipo deve esistere.
    if (!config.tipi_tag.some((t) => t.id === 'varie'))
      errori.push('tipi_tag: manca il tipo "varie"');
  }
  if (errori.length > 0)
    throw new Error(`Configurazione del gruppo non valida:\n- ${errori.join('\n- ')}`);
}

const sql = (v: string | number): string =>
  typeof v === 'number' ? String(v) : `'${v.replaceAll("'", "''")}'`;

function blocco(tabella: string, colonne: string[], righe: (string | number)[][]): string {
  if (righe.length === 0) return '';
  const valori = righe.map((r) => `  (${r.map(sql).join(', ')})`).join(',\n');
  return `INSERT INTO ${tabella} (${colonne.join(', ')}) VALUES\n${valori}\nON CONFLICT (id) DO NOTHING;\n`;
}

export function sqlConfigurazione(config: ConfigurazioneGruppo): string {
  validaConfigurazione(config);
  return [
    '-- Dati iniziali del gruppo, generati da scripts/seed-gruppo.ts.',
    '',
    blocco(
      'branche',
      ['id', 'nome', 'ordine'],
      config.branche.map((b, i) => [b.id, b.nome, i + 1]),
    ),
    blocco(
      'unita',
      ['id', 'nome', 'branca_id', 'attiva', 'ordine'],
      config.unita.map((u, i) => [u.id, u.nome, u.branca, u.attiva === false ? 0 : 1, i + 1]),
    ),
    blocco(
      'tipi_tag',
      ['id', 'nome', 'esclusivo_predefinito', 'ordine'],
      config.tipi_tag.map((t, i) => [t.id, t.nome, t.esclusivo ? 1 : 0, i + 1]),
    ),
  ].join('\n');
}

if (import.meta.main) {
  try {
    process.stdout.write(sqlConfigurazione(leggiConfigurazione(process.argv[2])));
  } catch (errore) {
    console.error(errore instanceof Error ? errore.message : errore);
    process.exitCode = 1;
  }
}
