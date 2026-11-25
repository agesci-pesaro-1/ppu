// "Censiti" sheet format (real headers, FAKE data).
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import mapping from '../../../docs/installazione/import-foglio-censiti.json';
import { TEST_USER_HEADER } from '../src/identity/index.ts';

const HEADER = [
  'Codice censimento AGESCI',
  'Cognome',
  'Nome',
  'Luogo di nascita',
  // line break inside the header, as in the real sheet
  '"Data di Nascita\r\n(gg/mm/aaaa)"',
  'Unità',
  'Informativa ',
  '2A',
  '2B',
  '2C',
  'NOTE su Privacy',
  'Residenza',
  'Comune',
  'Cognome Padre',
  'Nome Padre',
  'data di nascita padre',
  'luogo di nascita padre',
  'CF padre',
  'Cell padre',
  'email padre',
  'Cognome Madre',
  'Nome Madre',
  'data di nascita madre',
  'luogo di nascita madre',
  'CF madre',
  'Cell madre',
  'email madre',
  'CELL',
  'Telefono Casa',
  'EMAIL PERSONALE',
  'NOTE',
].join(',');

const CSV = [
  HEADER,
  // apostrophe before the mobile number, d/m/yyyy dates, ok/no consents
  `7000001,Provetti,Nina,Valdifiori,03/04/2016,Coccinelle,ok,ok,ok,no,,"Via Finta, 3",VALDIFIORI,Provetti,Ugo,5/6/1980,Valdifiori,DEMOCSV000000001,'+393000000001,ugo@example.org,Bianchetti,Lia,7/1/1982,Altrove,DEMOCSV000000002,3000000002,lia@example.org,,0000/000001,,(ama disegnare)`,
  // Fuoco unit (mapped to clan), adult with their own contacts
  `7000002,Provetti,Sara,Valdifiori,10/10/2006,Fuoco,ok,ok,ok,ok,manca firma,"Via Finta, 3",VALDIFIORI,,,,,,,,,,,,,,,+39 300 000 0003,,sara@example.org,`,
  // empty consents, suspicious census code
  `9,Campioni,Leo,Valdifiori,1/2/2015,Lupetti,,,,,,"Via Finta, 9",VALDIFIORI,Campioni,Remo,,,,,,,,,,,,,,,,`,
].join('\n');

const call = (path: string, body: unknown) =>
  exports.default.fetch(
    new Request(`https://ppu.test/api/admin/import/${path}`, {
      method: 'POST',
      headers: {
        [TEST_USER_HEADER]: 'webmaster@example.org',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
  );

describe('import from the "Censiti" sheet', () => {
  it('reads the real format and imports members and guardians', async () => {
    const p = await call('preview', { csv: CSV, mapping });
    expect(p.status).toBe(200);
    const plan = (await p.json()) as {
      hash: string;
      counts: Record<string, number>;
      ignoredColumns: string[];
      rows: { status: string; errors: string[]; warnings: string[] }[];
    };
    expect(plan.rows.map((r) => r.status)).toEqual(['create', 'create', 'create']);
    expect(plan.rows.flatMap((r) => r.errors)).toEqual([]);
    expect(plan.rows[2]?.warnings.some((x) => x.includes('codice censimento sospetto'))).toBe(true);
    expect(plan.counts).toMatchObject({ toCreate: 3, guardians: 3, notes: 1 });
    expect(plan.ignoredColumns).toEqual(['Telefono Casa']);

    const c = await call('confirm', { csv: CSV, mapping, hash: plan.hash });
    expect(c.status).toBe(200);

    const nina = await env.DB.prepare(
      "SELECT id, data_nascita, unita_id, consenso_2c, informativa FROM associati WHERE codice_censimento = '7000001'",
    ).first<{
      id: number;
      data_nascita: string;
      unita_id: string;
      consenso_2c: number;
      informativa: number;
    }>();
    expect(nina).toMatchObject({
      data_nascita: '2016-04-03',
      unita_id: 'coccinelle',
      consenso_2c: 0,
      informativa: 1,
    });

    const father = await env.DB.prepare(
      "SELECT cellulare, data_nascita, luogo_nascita FROM tutori WHERE associato_id = ? AND ruolo = 'padre'",
    )
      .bind(nina?.id)
      .first();
    expect(father).toEqual({
      cellulare: '+393000000001',
      data_nascita: '1980-06-05',
      luogo_nascita: 'Valdifiori',
    });

    const sara = await env.DB.prepare(
      "SELECT unita_id, cellulare, note_privacy FROM associati WHERE codice_censimento = '7000002'",
    ).first();
    expect(sara).toEqual({
      unita_id: 'clan',
      cellulare: '+393000000003',
      note_privacy: 'manca firma',
    });

    const leo = await env.DB.prepare(
      "SELECT informativa, consenso_2a FROM associati WHERE codice_censimento = '9'",
    ).first();
    expect(leo).toEqual({ informativa: 0, consenso_2a: 0 });
  });
});
