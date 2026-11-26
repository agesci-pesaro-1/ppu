// FAKE data: emails on example.org, tax codes with the DEMO prefix.
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import example from '../../../docs/installazione/import-esempio.json';
import { TEST_USER_HEADER } from '../src/identity/index.ts';

const WEBMASTER = 'webmaster@example.org';

const HEADER =
  'Cognome;Nome;Data di nascita;Luogo di nascita;Codice fiscale;Censimento;Unità;Indirizzo;CAP;Comune;Prov;Cellulare;Email;Informativa;2A;2B;2C;Madre nome;Madre cognome;Madre cellulare;Madre email;Padre nome;Padre cognome;Padre cellulare;Note';

const VALID_CSV = [
  HEADER,
  'Prova;Lino;14/03/2017;Valdifiori;DEMOIMP000000001;800001;L;Via Finta 1;00000;Valdifiori;xx;;;Sì;x;x;;Lia;Prova;333 000 0001;lia.prova@example.org;Ugo;Prova;333 000 0002;"Ama i giochi; bravo a nodi"',
  'Esempio;Rita;02/02/2013;Valdifiori;DEMOIMP000000002;800002;G;Via Finta 2;1100;Valdifiori;XX;;;si;si;no;si;Ada;;333 000 0003;;;;;',
  'Campione;Dario;05/05/2005;Valdifiori;;800003;R;;;;;333 000 0004;dario@example.org;si;si;si;si;Eva;Campione;333 000 0005;;;;;Ex capo squadriglia',
  'Arcangeli;Tommaso;14/03/2017;Valdifiori;;900001;L;;;;;;;si;si;si;si;;;;;;;;',
].join('\n');

const INVALID_CSV = [
  HEADER,
  'Errata;Data;31/02/2015;;;800010;L;;;;;;;si;si;si;si;;;;;;;;',
  'Errata;Unita;01/01/2015;;;800011;Z;;;;;;;si;si;si;si;;;;;;;;',
  'Doppio;Uno;01/01/2015;;DEMOIMP000000099;800012;L;;;;;;;si;si;si;si;;;;;;;;',
  'Doppio;Due;01/01/2015;;DEMOIMP000000099;800012;L;;;;;;;si;si;si;si;;;;;;;;',
  ';SenzaCognome;01/01/2015;;DEMO000000000001;;L;;;;;;;si;si;si;si;;;;;;;;',
].join('\n');

const call = (path: string, email: string, body: unknown) =>
  exports.default.fetch(
    new Request(`https://ppu.test/api/admin/import/${path}`, {
      method: 'POST',
      headers: { [TEST_USER_HEADER]: email, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

interface Preview {
  hash: string;
  counts: Record<string, number>;
  ignoredColumns: string[];
  rows: { line: number; status: string; lastName: string; errors: string[]; warnings: string[] }[];
}

describe('import from the sheet', () => {
  it('only the webmaster can use it', async () => {
    for (const email of ['capogruppo@example.org', 'capo.eg@example.org']) {
      const r = await call('preview', email, { csv: VALID_CSV, mapping: example });
      expect(r.status).toBe(403);
      const c = await call('confirm', email, { csv: VALID_CSV, mapping: example, hash: 'x' });
      expect(c.status).toBe(403);
    }
  });

  it('the preview shows the plan without contacts or tax codes', async () => {
    const r = await call('preview', WEBMASTER, { csv: VALID_CSV, mapping: example });
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).not.toContain('DEMOIMP');
    expect(text).not.toContain('example.org');
    expect(text).not.toContain('3330000001');
    const p = JSON.parse(text) as Preview;
    expect(p.counts).toEqual({
      rows: 4,
      toCreate: 3,
      existing: 1,
      withErrors: 0,
      guardians: 4,
      notes: 2,
    });
    expect(p.rows.map((x) => x.status)).toEqual(['create', 'create', 'create', 'existing']);
    expect(p.rows[1]?.warnings).toContain('cap: CAP completato con lo zero iniziale');
    expect(p.rows[1]?.warnings.some((x) => x.includes('cognome mancante'))).toBe(true);
    expect(p.rows[2]?.warnings.some((x) => x.includes('maggiorenne'))).toBe(true);
    expect(p.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reports invalid dates, unknown units, duplicates and required fields', async () => {
    const r = await call('preview', WEBMASTER, { csv: INVALID_CSV, mapping: example });
    const p = (await r.json()) as Preview;
    expect(p.rows.map((x) => x.status)).toEqual(['error', 'error', 'create', 'error', 'error']);
    expect(p.rows[0]?.errors).toEqual(['data_nascita: data inesistente']);
    expect(p.rows[1]?.errors).toEqual(['unita: valore non presente nella mappatura']);
    expect(p.rows[3]?.errors).toEqual([
      'codice_censimento: duplicato della riga 4',
      'codice_fiscale: duplicato della riga 4',
    ]);
    expect(p.rows[4]?.errors).toEqual([
      'cognome: obbligatorio',
      'codice_fiscale: già presente in PPU',
    ]);

    const c = await call('confirm', WEBMASTER, {
      csv: INVALID_CSV,
      mapping: example,
      hash: p.hash,
    });
    expect(c.status).toBe(400);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Doppio'").first('n'),
    ).toBe(0);
  });

  it('rejects mapping columns missing from the file', async () => {
    const r = await call('preview', WEBMASTER, { csv: 'Cognome;Nome\nA;B', mapping: example });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { message: expect.stringContaining('"Data di nascita"') },
    });
  });

  it('rejects the confirmation if the file changed after the preview', async () => {
    const p = (await (
      await call('preview', WEBMASTER, { csv: VALID_CSV, mapping: example })
    ).json()) as Preview;
    const changed = VALID_CSV.replace('Lino', 'Lina');
    const r = await call('confirm', WEBMASTER, { csv: changed, mapping: example, hash: p.hash });
    expect(r.status).toBe(409);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Prova'").first('n'),
    ).toBe(0);
  });

  it('the confirmation writes members, history, guardians, notes and log together', async () => {
    const p = (await (
      await call('preview', WEBMASTER, { csv: VALID_CSV, mapping: example })
    ).json()) as Preview;
    const r = await call('confirm', WEBMASTER, { csv: VALID_CSV, mapping: example, hash: p.hash });
    expect(r.status).toBe(200);
    const outcome = (await r.json()) as {
      operation: string;
      members: number;
      guardians: number;
      notes: number;
    };
    expect(outcome).toMatchObject({ members: 3, guardians: 4, notes: 2, existing: 1 });

    const lino = await env.DB.prepare(
      "SELECT id, data_nascita, codice_fiscale, unita_id, provincia, informativa, consenso_commerciale, riceve_comunicazioni FROM associati WHERE codice_censimento = '800001'",
    ).first<Record<string, unknown>>();
    expect(lino).toMatchObject({
      data_nascita: '2017-03-14',
      codice_fiscale: 'DEMOIMP000000001',
      unita_id: 'lupetti',
      provincia: 'XX',
      informativa: 1,
      consenso_commerciale: 0,
      riceve_comunicazioni: 1,
    });
    const history = await env.DB.prepare(
      'SELECT s.unita_id FROM storico_unita s JOIN anni_scout y ON y.id = s.anno_scout_id WHERE y.attuale = 1 AND s.associato_id = ?',
    )
      .bind(lino?.id)
      .first('unita_id');
    expect(history).toBe('lupetti');

    const guardians = await env.DB.prepare(
      'SELECT ruolo, nome, cellulare, archiviato FROM tutori WHERE associato_id = ? ORDER BY ruolo',
    )
      .bind(lino?.id)
      .all();
    expect(guardians.results).toEqual([
      { ruolo: 'madre', nome: 'Lia', cellulare: '+393330000001', archiviato: 0 },
      { ruolo: 'padre', nome: 'Ugo', cellulare: '+393330000002', archiviato: 0 },
    ]);

    const note = await env.DB.prepare(
      'SELECT tipo, descrizione, creato_da FROM progressione WHERE associato_id = ?',
    )
      .bind(lino?.id)
      .first();
    expect(note).toEqual({
      tipo: 'nota',
      descrizione: 'Ama i giochi; bravo a nodi',
      creato_da: WEBMASTER,
    });

    // Adult member: guardians archived.
    const archived = await env.DB.prepare(
      "SELECT t.archiviato, t.archiviato_il IS NOT NULL AS data FROM tutori t JOIN associati a ON a.id = t.associato_id WHERE a.codice_censimento = '800003'",
    ).first();
    expect(archived).toEqual({ archiviato: 1, data: 1 });

    const log = await env.DB.prepare(
      'SELECT entita, count(*) n, sum(stato_buona_strada IS NOT NULL) bs FROM modifiche WHERE operazione = ? AND canale = ? GROUP BY entita ORDER BY entita',
    )
      .bind(outcome.operation, 'import')
      .all();
    expect(log.results).toEqual([
      { entita: 'associati', n: 3, bs: 0 },
      { entita: 'progressione', n: 2, bs: 0 },
      { entita: 'tutori', n: 4, bs: 0 },
    ]);

    // Repeating the same import duplicates nothing: the rows are already present.
    const again = (await (
      await call('preview', WEBMASTER, { csv: VALID_CSV, mapping: example })
    ).json()) as Preview;
    expect(again.counts).toMatchObject({ toCreate: 0, existing: 4 });
  });

  it('rejects invalid bodies', async () => {
    const r = await exports.default.fetch(
      new Request('https://ppu.test/api/admin/import/preview', {
        method: 'POST',
        headers: { [TEST_USER_HEADER]: WEBMASTER },
        body: 'non json',
      }),
    );
    expect(r.status).toBe(400);
    const s = await call('preview', WEBMASTER, { csv: 42, mapping: example });
    expect(s.status).toBe(400);
  });
});
