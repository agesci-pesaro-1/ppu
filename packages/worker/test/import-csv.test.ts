import { describe, expect, it } from 'vitest';
import esempio from '../../../docs/installazione/import-esempio.json';
import { ErroreCsv, leggiCsv, rilevaSeparatore } from '../src/import/csv.ts';
import {
  cap,
  dataIso,
  siNo,
  telefono,
  trasforma,
  validaMappatura,
} from '../src/import/mappatura.ts';

const UNITA = ['lupetti', 'coccinelle', 'esploratori', 'guide', 'noviziato', 'clan', 'coca'];

describe('CSV', () => {
  it('rileva il separatore', () => {
    expect(rilevaSeparatore('a;b;c\n1;2;3')).toBe(';');
    expect(rilevaSeparatore('a,b,c\n1,2,3')).toBe(',');
    expect(rilevaSeparatore('a\tb\tc')).toBe('\t');
    expect(rilevaSeparatore('"a;b",c,d')).toBe(',');
  });

  it('gestisce BOM, virgolette, virgolette raddoppiate e a capo nei campi', () => {
    const t = leggiCsv(
      '﻿Cognome;Note\r\nRossi;"riga uno\nriga due"\r\n"Bianchi";"dice ""ciao""; poi va"\r\n',
    );
    expect(t.intestazioni).toEqual(['Cognome', 'Note']);
    expect(t.righe).toEqual([
      { numero: 2, valori: ['Rossi', 'riga uno\nriga due'] },
      { numero: 4, valori: ['Bianchi', 'dice "ciao"; poi va'] },
    ]);
  });

  it('ignora le righe vuote e accetta righe più corte', () => {
    const t = leggiCsv('a,b,c\n1,2\n\n,,\n4,5,6');
    expect(t.righe.map((r) => r.valori)).toEqual([
      ['1', '2'],
      ['4', '5', '6'],
    ]);
  });

  it('rifiuta file vuoti, virgolette non chiuse, colonne duplicate e righe troppo lunghe', () => {
    expect(() => leggiCsv('  ')).toThrow(ErroreCsv);
    expect(() => leggiCsv('a,b\n"1,2')).toThrow(/Virgolette/);
    expect(() => leggiCsv('Nome,nome\n1,2')).toThrow(/duplicata/);
    expect(() => leggiCsv('a,b\n1,2,3')).toThrow(/colonne/);
  });
});

describe('trasformazioni', () => {
  it('converte le date', () => {
    expect(dataIso('03/04/2014', 'gg/mm/aaaa')).toEqual({ ok: true, valore: '2014-04-03' });
    expect(dataIso('3.4.2014', 'gg/mm/aaaa')).toEqual({ ok: true, valore: '2014-04-03' });
    expect(dataIso('2014-04-03', 'aaaa-mm-gg')).toEqual({ ok: true, valore: '2014-04-03' });
    expect(dataIso('31/02/2014', 'gg/mm/aaaa').ok).toBe(false);
    expect(dataIso('03/04/14', 'gg/mm/aaaa').ok).toBe(false);
    expect(dataIso('ieri', 'gg/mm/aaaa').ok).toBe(false);
  });

  it('legge sì/no in modo prudente', () => {
    expect(siNo('Sì')).toEqual({ ok: true, valore: 1 });
    expect(siNo('x')).toEqual({ ok: true, valore: 1 });
    expect(siNo('NO')).toEqual({ ok: true, valore: 0 });
    expect(siNo('')).toEqual({ ok: true, valore: 0 });
    expect(siNo('ok', ['ok'])).toEqual({ ok: true, valore: 1 });
    expect(siNo('forse')).toMatchObject({ ok: true, valore: 0, avviso: expect.any(String) });
  });

  it('normalizza i telefoni', () => {
    expect(telefono('333 123 4567')).toEqual({ ok: true, valore: '+393331234567' });
    expect(telefono('0039 333.123.4567')).toEqual({ ok: true, valore: '+393331234567' });
    expect(telefono('+41 79 123 45 67')).toEqual({ ok: true, valore: '+41791234567' });
    expect(telefono('chiamare la sera').ok).toBe(false);
  });

  it('completa il CAP senza zero iniziale', () => {
    expect(cap('1100')).toMatchObject({ valore: '01100', avviso: expect.any(String) });
    expect(cap('00000')).toEqual({ ok: true, valore: '00000' });
  });

  it('un valore vuoto diventa null', () => {
    expect(trasforma('  ', 'data', {})).toEqual({ ok: true, valore: null });
    expect(trasforma(' Via  dei   Pini 1 ', 'testo', {})).toEqual({
      ok: true,
      valore: 'Via dei Pini 1',
    });
  });
});

describe('mappatura', () => {
  it("l'esempio in docs/installazione è valido", () => {
    expect(validaMappatura(esempio, UNITA).tutori).toHaveLength(2);
  });

  it('rifiuta campi sconosciuti, unità inesistenti e mappature senza cognome e nome', () => {
    expect(() =>
      validaMappatura({ versione: 1, associato: { cognome: 'C', nome: 'N', sesso: 'S' } }, UNITA),
    ).toThrow(/sconosciuto/);
    expect(() =>
      validaMappatura(
        {
          versione: 1,
          associato: { cognome: 'C', nome: 'N' },
          unita: { colonna: 'U', valori: { X: 'reparto' } },
        },
        UNITA,
      ),
    ).toThrow(/non esiste/);
    expect(() => validaMappatura({ versione: 1, associato: { cognome: 'C' } }, UNITA)).toThrow(
      /cognome e nome/,
    );
    expect(() =>
      validaMappatura({ versione: 2, associato: { cognome: 'C', nome: 'N' } }, UNITA),
    ).toThrow(/versione/);
    expect(() => validaMappatura('{}', UNITA)).toThrow(/oggetto/);
  });
});
