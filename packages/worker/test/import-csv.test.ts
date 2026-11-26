import { describe, expect, it } from 'vitest';
import template from '../../../docs/installazione/import-modello.csv?raw';
import { CsvError, detectSeparator, parseCsv } from '../src/import/csv.ts';
import {
  guardianRole,
  isoDate,
  phone,
  postcode,
  readHeaders,
  STANDARD_COLUMNS,
  transform,
  yesNo,
} from '../src/import/format.ts';

describe('CSV', () => {
  it('detects the separator', () => {
    expect(detectSeparator('a;b;c\n1;2;3')).toBe(';');
    expect(detectSeparator('a,b,c\n1,2,3')).toBe(',');
    expect(detectSeparator('a\tb\tc')).toBe('\t');
    expect(detectSeparator('"a;b",c,d')).toBe(',');
  });

  it('handles BOM, quotes, doubled quotes and line breaks in fields', () => {
    const t = parseCsv(
      '﻿Cognome;Note\r\nRossi;"riga uno\nriga due"\r\n"Bianchi";"dice ""ciao""; poi va"\r\n',
    );
    expect(t.headers).toEqual(['Cognome', 'Note']);
    expect(t.rows).toEqual([
      { line: 2, values: ['Rossi', 'riga uno\nriga due'] },
      { line: 4, values: ['Bianchi', 'dice "ciao"; poi va'] },
    ]);
  });

  it('skips empty rows and accepts shorter rows', () => {
    const t = parseCsv('a,b,c\n1,2\n\n,,\n4,5,6');
    expect(t.rows.map((r) => r.values)).toEqual([
      ['1', '2'],
      ['4', '5', '6'],
    ]);
  });

  it('rejects empty files, unclosed quotes, duplicate columns and rows that are too long', () => {
    expect(() => parseCsv('  ')).toThrow(CsvError);
    expect(() => parseCsv('a,b\n"1,2')).toThrow(/Virgolette/);
    expect(() => parseCsv('Nome,nome\n1,2')).toThrow(/duplicata/);
    expect(() => parseCsv('a,b\n1,2,3')).toThrow(/colonne/);
  });
});

describe('transformations', () => {
  it('converts dates in both accepted formats', () => {
    expect(isoDate('03/04/2014')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('3/4/2014')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('2014-04-03')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('31/02/2014').ok).toBe(false);
    expect(isoDate('03/04/14').ok).toBe(false);
    expect(isoDate('3.4.2014').ok).toBe(false);
    expect(isoDate('ieri').ok).toBe(false);
  });

  it('reads yes/no strictly', () => {
    expect(yesNo('Sì')).toEqual({ ok: true, value: 1 });
    expect(yesNo('si')).toEqual({ ok: true, value: 1 });
    expect(yesNo('x')).toEqual({ ok: true, value: 1 });
    expect(yesNo('NO')).toEqual({ ok: true, value: 0 });
    expect(yesNo('')).toEqual({ ok: true, value: 0 });
    expect(yesNo('forse').ok).toBe(false);
    expect(yesNo('vero').ok).toBe(false);
  });

  it('reads guardian roles', () => {
    expect(guardianRole(' Padre ')).toEqual({ ok: true, value: 'padre' });
    expect(guardianRole('nonna').ok).toBe(false);
  });

  it('normalises phone numbers', () => {
    expect(phone('333 123 4567')).toEqual({ ok: true, value: '+393331234567' });
    expect(phone('0039 333.123.4567')).toEqual({ ok: true, value: '+393331234567' });
    expect(phone('+41 79 123 45 67')).toEqual({ ok: true, value: '+41791234567' });
    expect(phone('chiamare la sera').ok).toBe(false);
  });

  it('pads a postcode without the leading zero', () => {
    expect(postcode('1100')).toMatchObject({ value: '01100', warning: expect.any(String) });
    expect(postcode('00000')).toEqual({ ok: true, value: '00000' });
  });

  it('an empty value becomes null', () => {
    expect(transform('  ', 'date')).toEqual({ ok: true, value: null });
    expect(transform(' Via  dei   Pini 1 ', 'text')).toEqual({
      ok: true,
      value: 'Via dei Pini 1',
    });
  });
});

describe('standard format', () => {
  it('the template in docs/installazione has every column, in order', () => {
    const t = parseCsv(template);
    expect(t.headers).toEqual(STANDARD_COLUMNS);
    expect(t.rows.length).toBeGreaterThan(0);
  });

  it('every column follows the schema naming', () => {
    for (const c of STANDARD_COLUMNS) expect(c).toMatch(/^[a-z0-9_]+$/);
  });

  it('accepts any subset with cognome and nome, ignoring case and blank headers', () => {
    const index = readHeaders(['Nome', ' COGNOME ', '', 'tutore2_email']);
    expect([...index]).toEqual([
      ['nome', 0],
      ['cognome', 1],
      ['tutore2_email', 3],
    ]);
  });

  it('rejects unknown columns and missing required ones', () => {
    expect(() => readHeaders(['cognome', 'nome', 'sesso'])).toThrow(/"sesso"/);
    expect(() => readHeaders(['cognome', 'nome', 'tutore5_nome'])).toThrow(/tutore5_nome/);
    expect(() => readHeaders(['cognome'])).toThrow(/nome/);
  });
});
