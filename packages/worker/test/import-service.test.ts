// FAKE data: emails on example.org, tax codes with the DEMO prefix.
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import template from '../../../docs/installazione/import-modello.csv?raw';
import { TEST_USER_HEADER } from '../src/identity/index.ts';

const WEBMASTER = 'webmaster@example.org';

const [HEADER = ''] = template.split('\n');
const COLUMNS = HEADER.split(';');

/** A row of the standard format from the given values (missing columns stay empty). */
const row = (values: Record<string, string>) => COLUMNS.map((c) => values[c] ?? '').join(';');

// The template's three rows, plus a member already in the demo seed.
const VALID_CSV = `${template.trimEnd()}\n${row({ codice_censimento: '900001', cognome: 'Arcangeli', nome: 'Tommaso' })}`;

const INVALID_CSV = [
  HEADER,
  row({ codice_censimento: '800010', cognome: 'Errata', nome: 'Data', data_nascita: '31/02/2015' }),
  row({ codice_censimento: '800011', cognome: 'Errata', nome: 'Unita', unita: 'reparto' }),
  row({
    codice_censimento: '800012',
    cognome: 'Doppio',
    nome: 'Uno',
    codice_fiscale: 'DEMOIMP000000099',
    tutore1_ruolo: 'Madre',
    tutore1_nome: 'Ada',
  }),
  row({
    codice_censimento: '800012',
    cognome: 'Doppio',
    nome: 'Due',
    codice_fiscale: 'DEMOIMP000000099',
  }),
  row({ nome: 'SenzaCognome', codice_fiscale: 'DEMO000000000001' }),
  row({ cognome: 'Errato', nome: 'Consenso', consenso_immagini: 'forse' }),
  row({ cognome: 'Errato', nome: 'Tutore', tutore1_ruolo: 'nonna', tutore2_cognome: 'Solo' }),
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
  rows: { line: number; status: string; lastName: string; errors: string[]; warnings: string[] }[];
}

describe('import in the standard format', () => {
  it('only the webmaster can use it', async () => {
    for (const email of ['capogruppo@example.org', 'capo.eg@example.org']) {
      const r = await call('preview', email, { csv: VALID_CSV });
      expect(r.status).toBe(403);
      const c = await call('confirm', email, { csv: VALID_CSV, hash: 'x' });
      expect(c.status).toBe(403);
    }
  });

  it('the preview shows the plan without contacts or tax codes', async () => {
    const r = await call('preview', WEBMASTER, { csv: VALID_CSV });
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
    expect(p.rows[1]?.warnings).toEqual([]);
    expect(p.rows[2]?.warnings.some((x) => x.includes('maggiorenne'))).toBe(true);
    expect(p.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reports invalid dates, unknown units, duplicates and required fields', async () => {
    const r = await call('preview', WEBMASTER, { csv: INVALID_CSV });
    const p = (await r.json()) as Preview;
    expect(p.rows.map((x) => x.status)).toEqual([
      'error',
      'error',
      'create',
      'error',
      'error',
      'error',
      'error',
    ]);
    expect(p.rows[0]?.errors).toEqual(['data_nascita: data inesistente']);
    expect(p.rows[1]?.errors).toEqual(['unita: unità sconosciuta in PPU']);
    expect(p.rows[2]?.warnings).toContain("tutore1: cognome mancante, usato quello dell'associato");
    expect(p.rows[3]?.errors).toEqual([
      'codice_censimento: duplicato della riga 4',
      'codice_fiscale: duplicato della riga 4',
    ]);
    expect(p.rows[4]?.errors).toEqual([
      'cognome: obbligatorio',
      'codice_fiscale: già presente in PPU',
    ]);
    expect(p.rows[5]?.errors).toEqual([
      'consenso_immagini: valore sì/no non valido (usa "si" o "no")',
    ]);
    expect(p.rows[6]?.errors).toEqual([
      'tutore1_ruolo: ruolo non valido (uno tra: madre, padre, tutore, affidatario, altro)',
      'tutore1_nome: obbligatorio se il tutore è presente',
      'tutore2_ruolo: ruolo non valido (uno tra: madre, padre, tutore, affidatario, altro)',
      'tutore2_nome: obbligatorio se il tutore è presente',
    ]);

    const c = await call('confirm', WEBMASTER, {
      csv: INVALID_CSV,
      hash: p.hash,
    });
    expect(c.status).toBe(400);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Doppio'").first('n'),
    ).toBe(0);
  });

  it('rejects columns outside the format and files without the required ones', async () => {
    const unknown = await call('preview', WEBMASTER, { csv: 'cognome;nome;Data di nascita\nA;B;' });
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toMatchObject({
      error: { message: expect.stringContaining('"Data di nascita"') },
    });
    const missing = await call('preview', WEBMASTER, { csv: 'cognome;unita\nA;lupetti' });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toMatchObject({
      error: { message: expect.stringContaining('nome') },
    });
  });

  it('accepts a subset of the columns, in any order and case, and unit names', async () => {
    const r = await call('preview', WEBMASTER, {
      csv: 'Nome,COGNOME,unita\nLina,Ridotta,clan/fuoco',
    });
    expect(r.status).toBe(200);
    const p = (await r.json()) as Preview;
    expect(p.rows[0]).toMatchObject({
      status: 'create',
      lastName: 'Ridotta',
      unit: 'clan',
      errors: [],
    });
  });

  it('rejects the confirmation if the file changed after the preview', async () => {
    const p = (await (await call('preview', WEBMASTER, { csv: VALID_CSV })).json()) as Preview;
    const changed = VALID_CSV.replace('Lino', 'Lina');
    const r = await call('confirm', WEBMASTER, { csv: changed, hash: p.hash });
    expect(r.status).toBe(409);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Prova'").first('n'),
    ).toBe(0);
  });

  it('the confirmation writes members, history, guardians, notes and log together', async () => {
    const p = (await (await call('preview', WEBMASTER, { csv: VALID_CSV })).json()) as Preview;
    const r = await call('confirm', WEBMASTER, { csv: VALID_CSV, hash: p.hash });
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
    const again = (await (await call('preview', WEBMASTER, { csv: VALID_CSV })).json()) as Preview;
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
    const s = await call('preview', WEBMASTER, { csv: 42 });
    expect(s.status).toBe(400);
  });
});
