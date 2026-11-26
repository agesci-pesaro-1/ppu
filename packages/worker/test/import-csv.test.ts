import { describe, expect, it } from 'vitest';
import example from '../../../docs/installazione/import-esempio.json';
import { CsvError, detectSeparator, parseCsv } from '../src/import/csv.ts';
import {
  isoDate,
  phone,
  postcode,
  transform,
  validateMapping,
  yesNo,
} from '../src/import/mapping.ts';

const UNITS = ['lupetti', 'coccinelle', 'esploratori', 'guide', 'noviziato', 'clan', 'coca'];

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
  it('converts dates', () => {
    expect(isoDate('03/04/2014', 'gg/mm/aaaa')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('3.4.2014', 'gg/mm/aaaa')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('2014-04-03', 'aaaa-mm-gg')).toEqual({ ok: true, value: '2014-04-03' });
    expect(isoDate('31/02/2014', 'gg/mm/aaaa').ok).toBe(false);
    expect(isoDate('03/04/14', 'gg/mm/aaaa').ok).toBe(false);
    expect(isoDate('ieri', 'gg/mm/aaaa').ok).toBe(false);
  });

  it('reads yes/no cautiously', () => {
    expect(yesNo('Sì')).toEqual({ ok: true, value: 1 });
    expect(yesNo('x')).toEqual({ ok: true, value: 1 });
    expect(yesNo('NO')).toEqual({ ok: true, value: 0 });
    expect(yesNo('')).toEqual({ ok: true, value: 0 });
    expect(yesNo('ok', ['ok'])).toEqual({ ok: true, value: 1 });
    expect(yesNo('forse')).toMatchObject({ ok: true, value: 0, warning: expect.any(String) });
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
    expect(transform('  ', 'date', {})).toEqual({ ok: true, value: null });
    expect(transform(' Via  dei   Pini 1 ', 'text', {})).toEqual({
      ok: true,
      value: 'Via dei Pini 1',
    });
  });
});

describe('mapping', () => {
  it('the example in docs/installazione is valid', () => {
    expect(validateMapping(example, UNITS).tutori).toHaveLength(2);
  });

  it('rejects unknown fields, missing units, unknown roles and mappings without names', () => {
    expect(() =>
      validateMapping({ versione: 1, associato: { cognome: 'C', nome: 'N', sesso: 'S' } }, UNITS),
    ).toThrow(/sconosciuto/);
    expect(() =>
      validateMapping(
        {
          versione: 1,
          associato: { cognome: 'C', nome: 'N' },
          unita: { colonna: 'U', valori: { X: 'reparto' } },
        },
        UNITS,
      ),
    ).toThrow(/non esiste/);
    expect(() =>
      validateMapping(
        {
          versione: 1,
          associato: { cognome: 'C', nome: 'N' },
          tutori: [{ ruolo: 'nonna', campi: { nome: 'Nonna' } }],
        },
        UNITS,
      ),
    ).toThrow(/ruolo/);
    expect(() => validateMapping({ versione: 1, associato: { cognome: 'C' } }, UNITS)).toThrow(
      /cognome e nome/,
    );
    expect(() =>
      validateMapping({ versione: 2, associato: { cognome: 'C', nome: 'N' } }, UNITS),
    ).toThrow(/versione/);
    expect(() => validateMapping('{}', UNITS)).toThrow(/oggetto/);
  });
});
