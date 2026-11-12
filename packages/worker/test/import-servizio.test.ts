// Dati INVENTATI: email su example.org, codici fiscali con prefisso DEMO.
import { env, exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import esempio from '../../../docs/installazione/import-esempio.json';
import { HEADER_UTENTE_TEST } from '../src/identita/index.ts';

const WEBMASTER = 'webmaster@example.org';

const INTESTAZIONE =
  'Cognome;Nome;Data di nascita;Luogo di nascita;Codice fiscale;Censimento;Unità;Indirizzo;CAP;Comune;Prov;Cellulare;Email;Informativa;2A;2B;2C;Madre nome;Madre cognome;Madre cellulare;Madre email;Padre nome;Padre cognome;Padre cellulare;Note';

const CSV_VALIDO = [
  INTESTAZIONE,
  'Prova;Lino;14/03/2017;Valdifiori;DEMOIMP000000001;800001;L;Via Finta 1;00000;Valdifiori;xx;;;Sì;x;x;;Lia;Prova;333 000 0001;lia.prova@example.org;Ugo;Prova;333 000 0002;"Ama i giochi; bravo a nodi"',
  'Esempio;Rita;02/02/2013;Valdifiori;DEMOIMP000000002;800002;G;Via Finta 2;1100;Valdifiori;XX;;;si;si;no;si;Ada;;333 000 0003;;;;;',
  'Campione;Dario;05/05/2005;Valdifiori;;800003;R;;;;;333 000 0004;dario@example.org;si;si;si;si;Eva;Campione;333 000 0005;;;;;Ex capo squadriglia',
  'Arcangeli;Tommaso;14/03/2017;Valdifiori;;900001;L;;;;;;;si;si;si;si;;;;;;;;',
].join('\n');

const CSV_ERRATO = [
  INTESTAZIONE,
  'Errata;Data;31/02/2015;;;800010;L;;;;;;;si;si;si;si;;;;;;;;',
  'Errata;Unita;01/01/2015;;;800011;Z;;;;;;;si;si;si;si;;;;;;;;',
  'Doppio;Uno;01/01/2015;;DEMOIMP000000099;800012;L;;;;;;;si;si;si;si;;;;;;;;',
  'Doppio;Due;01/01/2015;;DEMOIMP000000099;800012;L;;;;;;;si;si;si;si;;;;;;;;',
  ';SenzaCognome;01/01/2015;;DEMO000000000001;;L;;;;;;;si;si;si;si;;;;;;;;',
].join('\n');

const chiama = (percorso: string, email: string, corpo: unknown) =>
  exports.default.fetch(
    new Request(`https://ppu.test/api/admin/import/${percorso}`, {
      method: 'POST',
      headers: { [HEADER_UTENTE_TEST]: email, 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  );

interface Anteprima {
  hash: string;
  conteggi: Record<string, number>;
  colonneIgnorate: string[];
  righe: { riga: number; stato: string; cognome: string; errori: string[]; avvisi: string[] }[];
}

describe('import dal foglio', () => {
  it('solo il webmaster può usarlo', async () => {
    for (const email of ['capogruppo@example.org', 'capo.eg@example.org']) {
      const r = await chiama('anteprima', email, { csv: CSV_VALIDO, mappatura: esempio });
      expect(r.status).toBe(403);
      const c = await chiama('conferma', email, { csv: CSV_VALIDO, mappatura: esempio, hash: 'x' });
      expect(c.status).toBe(403);
    }
  });

  it("l'anteprima mostra il piano senza contatti né codici fiscali", async () => {
    const r = await chiama('anteprima', WEBMASTER, { csv: CSV_VALIDO, mappatura: esempio });
    expect(r.status).toBe(200);
    const testo = await r.text();
    expect(testo).not.toContain('DEMOIMP');
    expect(testo).not.toContain('example.org');
    expect(testo).not.toContain('3330000001');
    const a = JSON.parse(testo) as Anteprima;
    expect(a.conteggi).toEqual({
      righe: 4,
      daCreare: 3,
      giaPresenti: 1,
      conErrori: 0,
      tutori: 4,
      note: 2,
    });
    expect(a.righe.map((x) => x.stato)).toEqual([
      'da_creare',
      'da_creare',
      'da_creare',
      'gia_presente',
    ]);
    expect(a.righe[1]?.avvisi).toContain('cap: CAP completato con lo zero iniziale');
    expect(a.righe[1]?.avvisi.some((x) => x.includes('cognome mancante'))).toBe(true);
    expect(a.righe[2]?.avvisi.some((x) => x.includes('maggiorenne'))).toBe(true);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('segnala date non valide, unità sconosciute, duplicati e campi obbligatori', async () => {
    const r = await chiama('anteprima', WEBMASTER, { csv: CSV_ERRATO, mappatura: esempio });
    const a = (await r.json()) as Anteprima;
    expect(a.righe.map((x) => x.stato)).toEqual([
      'errore',
      'errore',
      'da_creare',
      'errore',
      'errore',
    ]);
    expect(a.righe[0]?.errori).toEqual(['data_nascita: data inesistente']);
    expect(a.righe[1]?.errori).toEqual(['unita: valore non presente nella mappatura']);
    expect(a.righe[3]?.errori).toEqual([
      'codice_censimento: duplicato della riga 4',
      'codice_fiscale: duplicato della riga 4',
    ]);
    expect(a.righe[4]?.errori).toEqual([
      'cognome: obbligatorio',
      'codice_fiscale: già presente in PPU',
    ]);

    const c = await chiama('conferma', WEBMASTER, {
      csv: CSV_ERRATO,
      mappatura: esempio,
      hash: a.hash,
    });
    expect(c.status).toBe(400);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Doppio'").first('n'),
    ).toBe(0);
  });

  it('rifiuta colonne della mappatura assenti nel file', async () => {
    const r = await chiama('anteprima', WEBMASTER, {
      csv: 'Cognome;Nome\nA;B',
      mappatura: esempio,
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      errore: { messaggio: expect.stringContaining('"Data di nascita"') },
    });
  });

  it("rifiuta la conferma se il file è cambiato dopo l'anteprima", async () => {
    const a = (await (
      await chiama('anteprima', WEBMASTER, { csv: CSV_VALIDO, mappatura: esempio })
    ).json()) as Anteprima;
    const modificato = CSV_VALIDO.replace('Lino', 'Lina');
    const r = await chiama('conferma', WEBMASTER, {
      csv: modificato,
      mappatura: esempio,
      hash: a.hash,
    });
    expect(r.status).toBe(409);
    expect(
      await env.DB.prepare("SELECT count(*) n FROM associati WHERE cognome = 'Prova'").first('n'),
    ).toBe(0);
  });

  it('la conferma scrive associati, storico, tutori, note e registro insieme', async () => {
    const a = (await (
      await chiama('anteprima', WEBMASTER, { csv: CSV_VALIDO, mappatura: esempio })
    ).json()) as Anteprima;
    const r = await chiama('conferma', WEBMASTER, {
      csv: CSV_VALIDO,
      mappatura: esempio,
      hash: a.hash,
    });
    expect(r.status).toBe(200);
    const esito = (await r.json()) as {
      operazione: string;
      associati: number;
      tutori: number;
      note: number;
    };
    expect(esito).toMatchObject({ associati: 3, tutori: 4, note: 2, giaPresenti: 1 });

    const lino = await env.DB.prepare(
      "SELECT id, data_nascita, codice_fiscale, unita_id, provincia, informativa, consenso_2c FROM associati WHERE codice_censimento = '800001'",
    ).first<Record<string, unknown>>();
    expect(lino).toMatchObject({
      data_nascita: '2017-03-14',
      codice_fiscale: 'DEMOIMP000000001',
      unita_id: 'lupetti',
      provincia: 'XX',
      informativa: 1,
      consenso_2c: 0,
    });
    const storico = await env.DB.prepare(
      'SELECT s.unita_id FROM storico_unita s JOIN anni_scout y ON y.id = s.anno_scout_id WHERE y.attuale = 1 AND s.associato_id = ?',
    )
      .bind(lino?.id)
      .first('unita_id');
    expect(storico).toBe('lupetti');

    const tutori = await env.DB.prepare(
      'SELECT relazione, nome, cellulare, archiviato FROM tutori WHERE associato_id = ? ORDER BY relazione',
    )
      .bind(lino?.id)
      .all();
    expect(tutori.results).toEqual([
      { relazione: 'madre', nome: 'Lia', cellulare: '+393330000001', archiviato: 0 },
      { relazione: 'padre', nome: 'Ugo', cellulare: '+393330000002', archiviato: 0 },
    ]);

    const nota = await env.DB.prepare(
      'SELECT tipo, descrizione, creato_da FROM progressione WHERE associato_id = ?',
    )
      .bind(lino?.id)
      .first();
    expect(nota).toEqual({
      tipo: 'nota',
      descrizione: 'Ama i giochi; bravo a nodi',
      creato_da: WEBMASTER,
    });

    // Maggiorenne: tutori archiviati.
    const archiviati = await env.DB.prepare(
      "SELECT t.archiviato, t.archiviato_il IS NOT NULL AS data FROM tutori t JOIN associati a ON a.id = t.associato_id WHERE a.codice_censimento = '800003'",
    ).first();
    expect(archiviati).toEqual({ archiviato: 1, data: 1 });

    const registro = await env.DB.prepare(
      'SELECT entita, count(*) n, sum(stato_buona_strada IS NOT NULL) bs FROM modifiche WHERE operazione = ? AND canale = ? GROUP BY entita ORDER BY entita',
    )
      .bind(esito.operazione, 'import')
      .all();
    expect(registro.results).toEqual([
      { entita: 'associati', n: 3, bs: 0 },
      { entita: 'progressione', n: 2, bs: 0 },
      { entita: 'tutori', n: 4, bs: 0 },
    ]);

    // Ripetere lo stesso import non duplica nulla: le righe risultano già presenti.
    const di_nuovo = (await (
      await chiama('anteprima', WEBMASTER, { csv: CSV_VALIDO, mappatura: esempio })
    ).json()) as Anteprima;
    expect(di_nuovo.conteggi).toMatchObject({ daCreare: 0, giaPresenti: 4 });
  });

  it('rifiuta corpi non validi', async () => {
    const r = await exports.default.fetch(
      new Request('https://ppu.test/api/admin/import/anteprima', {
        method: 'POST',
        headers: { [HEADER_UTENTE_TEST]: WEBMASTER },
        body: 'non json',
      }),
    );
    expect(r.status).toBe(400);
    const s = await chiama('anteprima', WEBMASTER, { csv: 42, mappatura: esempio });
    expect(s.status).toBe(400);
  });
});
