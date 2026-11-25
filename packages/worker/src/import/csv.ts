// Minimal CSV parser (RFC 4180): quotes, doubled quotes, line breaks inside
// fields, leading BOM, separator ';' ',' or tab detected from the header row.
// No external dependencies. Error messages are shown to the user (Italian).

export interface CsvRow {
  /** File line where the record starts (the header is line 1). */
  line: number;
  values: string[];
}

export interface CsvTable {
  separator: string;
  headers: string[];
  rows: CsvRow[];
}

export class CsvError extends Error {}

const SEPARATORS = [';', ',', '\t'] as const;

/** Picks the most frequent separator outside quotes in the first row. */
export function detectSeparator(text: string): string {
  const counts = new Map<string, number>(SEPARATORS.map((s) => [s, 0]));
  let inQuotes = false;
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break;
    else if (!inQuotes && counts.has(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let best = ',';
  let max = 0;
  for (const [s, n] of counts) {
    if (n > max) {
      best = s;
      max = n;
    }
  }
  return best;
}

function records(text: string, separator: string): CsvRow[] {
  const result: CsvRow[] = [];
  let field = '';
  let values: string[] = [];
  let inQuotes = false;
  let line = 1;
  let start = 1;
  const close = () => {
    values.push(field);
    result.push({ line: start, values });
    values = [];
    field = '';
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line += 1;
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === separator) {
      values.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      close();
      line += 1;
      start = line;
    } else {
      field += ch;
    }
  }
  if (inQuotes) throw new CsvError(`Virgolette non chiuse (riga ${start}).`);
  if (field !== '' || values.length > 0) close();
  return result;
}

export function parseCsv(text: string): CsvTable {
  const clean = text.startsWith('﻿') ? text.slice(1) : text;
  if (clean.trim() === '') throw new CsvError('Il file CSV è vuoto.');
  const separator = detectSeparator(clean);
  const [header, ...data] = records(clean, separator);
  if (!header) throw new CsvError('Intestazione mancante.');
  // Headers may contain line breaks or double spaces (multi-line cells).
  const headers = header.values.map((h) => h.replace(/\s+/g, ' ').trim());
  const seen = new Set<string>();
  for (const h of headers) {
    const key = h.toLowerCase();
    if (h !== '' && seen.has(key)) throw new CsvError(`Colonna duplicata: "${h}".`);
    seen.add(key);
  }
  const rows = data.filter((r) => r.values.some((v) => v.trim() !== ''));
  for (const r of rows) {
    if (r.values.length > headers.length) {
      throw new CsvError(
        `La riga ${r.line} ha ${r.values.length} colonne, l'intestazione ${headers.length}.`,
      );
    }
  }
  return { separator, headers, rows };
}

/** Comparison key between column names: normalised spaces, case-insensitive. */
export function columnKey(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}
