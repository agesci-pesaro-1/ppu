// Formato del foglio "Censiti" (intestazioni reali, dati INVENTATI).
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import mappatura from '../../../docs/installazione/import-foglio-censiti.json';
import { HEADER_UTENTE_TEST } from '../src/identita/index.ts';

const INTESTAZIONE = [
  'Codice censimento AGESCI',
  'Cognome',
  'Nome',
  'Luogo di nascita',
  // a capo dentro l'intestazione, come nel foglio reale
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
  INTESTAZIONE,
  // apostrofo davanti al cellulare, date g/m/aaaa, consensi ok/no
  `7000001,Provetti,Nina,Valdifiori,03/04/2016,Coccinelle,ok,ok,ok,no,,"Via Finta, 3",VALDIFIORI,Provetti,Ugo,5/6/1980,Valdifiori,DEMOCSV000000001,'+393000000001,ugo@example.org,Bianchetti,Lia,7/1/1982,Altrove,DEMOCSV000000002,3000000002,lia@example.org,,0000/000001,,(ama disegnare)`,
  // unità Fuoco, maggiorenne con contatti propri
  `7000002,Provetti,Sara,Valdifiori,10/10/2006,Fuoco,ok,ok,ok,ok,manca firma,"Via Finta, 3",VALDIFIORI,,,,,,,,,,,,,,,+39 300 000 0003,,sara@example.org,`,
  // consensi vuoti, codice censimento sospetto
  `9,Campioni,Leo,Valdifiori,1/2/2015,Lupetti,,,,,,"Via Finta, 9",VALDIFIORI,Campioni,Remo,,,,,,,,,,,,,,,,`,
].join('\n');

const chiama = (percorso: string, corpo: unknown) =>
  exports.default.fetch(
    new Request(`https://ppu.test/api/admin/import/${percorso}`, {
      method: 'POST',
      headers: {
        [HEADER_UTENTE_TEST]: 'webmaster@example.org',
        'content-type': 'application/json',
      },
      body: JSON.stringify(corpo),
    }),
  );

describe('import dal foglio Censiti', () => {
  it('legge il formato reale e importa associati e tutori', async () => {
    await env.DB.prepare("UPDATE unita SET attiva = 1 WHERE id = 'fuoco'").run();
    const a = await chiama('anteprima', { csv: CSV, mappatura });
    expect(a.status).toBe(200);
    const piano = (await a.json()) as {
      hash: string;
      conteggi: Record<string, number>;
      righe: { stato: string; errori: string[]; avvisi: string[] }[];
    };
    expect(piano.righe.map((r) => r.stato)).toEqual(['da_creare', 'da_creare', 'da_creare']);
    expect(piano.righe.flatMap((r) => r.errori)).toEqual([]);
    expect(piano.righe[2]?.avvisi.some((x) => x.includes('codice censimento sospetto'))).toBe(true);
    expect(piano.conteggi).toMatchObject({ daCreare: 3, tutori: 3, note: 1 });

    const c = await chiama('conferma', { csv: CSV, mappatura, hash: piano.hash });
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

    const padre = await env.DB.prepare(
      "SELECT cellulare, data_nascita, luogo_nascita FROM tutori WHERE associato_id = ? AND relazione = 'padre'",
    )
      .bind(nina?.id)
      .first();
    expect(padre).toEqual({
      cellulare: '+393000000001',
      data_nascita: '1980-06-05',
      luogo_nascita: 'Valdifiori',
    });

    const sara = await env.DB.prepare(
      "SELECT unita_id, cellulare, note_privacy FROM associati WHERE codice_censimento = '7000002'",
    ).first();
    expect(sara).toEqual({
      unita_id: 'fuoco',
      cellulare: '+393000000003',
      note_privacy: 'manca firma',
    });

    const leo = await env.DB.prepare(
      "SELECT informativa, consenso_2a FROM associati WHERE codice_censimento = '9'",
    ).first();
    expect(leo).toEqual({ informativa: 0, consenso_2a: 0 });
  });
});
