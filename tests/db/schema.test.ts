import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { creaDatabase, fileSql } from './applica.ts';

const conta = (db: ReturnType<typeof creaDatabase>, sql: string): number =>
  Number((db.prepare(sql).get() as { n: number }).n);

describe('migrazioni e seed base', () => {
  it('si applicano su un database vuoto', () => {
    const db = creaDatabase();
    assert.equal(conta(db, 'SELECT count(*) n FROM unita'), 7);
    assert.equal(conta(db, 'SELECT count(*) n FROM branche'), 4);
  });

  it('il seed base è idempotente', () => {
    const db = creaDatabase();
    const prima = conta(db, 'SELECT count(*) n FROM catalogo_progressione');
    for (const s of fileSql('seed/base')) db.exec(s);
    assert.equal(conta(db, 'SELECT count(*) n FROM unita'), 7);
    assert.equal(conta(db, 'SELECT count(*) n FROM catalogo_progressione'), prima);
  });

  it('Noviziato fa parte della branca R/S', () => {
    const db = creaDatabase();
    const r = db.prepare("SELECT branca_id FROM unita WHERE id = 'noviziato'").get() as {
      branca_id: string;
    };
    assert.equal(r.branca_id, 'rs');
  });
});

describe('vincoli di dominio', () => {
  it('un solo anno scout attuale', () => {
    const db = creaDatabase();
    db.exec(
      "INSERT INTO anni_scout (nome, data_inizio, attuale) VALUES ('2025/26', '2025-10-05', 1)",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO anni_scout (nome, data_inizio, attuale) VALUES ('2026/27', '2026-10-04', 1)",
      ),
    );
  });

  it("chi conferma su Buona Strada non può essere l'autore", () => {
    const db = creaDatabase();
    assert.throws(() =>
      db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
        stato_buona_strada, confermata_da, confermata_il)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', 'riportata', 'a@example.org', '2026-01-01')`),
    );
    db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
      stato_buona_strada, confermata_da, confermata_il)
      VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', 'riportata', 'b@example.org', '2026-01-01')`);
  });

  it("una modifica riportata deve avere chi l'ha confermata", () => {
    const db = creaDatabase();
    assert.throws(() =>
      db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, stato_buona_strada)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'riportata')`),
    );
  });

  it('le email degli utenti sono in minuscolo', () => {
    const db = creaDatabase();
    assert.throws(() => db.exec("INSERT INTO utenti (email) VALUES ('Capo@Example.org')"));
    db.exec("INSERT INTO utenti (email) VALUES ('capo@example.org')");
  });

  it('archiviato richiede la data di archiviazione', () => {
    const db = creaDatabase();
    assert.throws(() =>
      db.exec("INSERT INTO associati (cognome, nome, stato) VALUES ('Prova', 'Uno', 'archiviato')"),
    );
  });

  it('una relazione non può legare un associato a se stesso', () => {
    const db = creaDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.throws(() =>
      db.exec(
        "INSERT INTO relazioni (associato_id, altro_associato_id, tipo) VALUES (1, 1, 'altro')",
      ),
    );
  });

  it('una voce di progressione libera richiede tipo e descrizione', () => {
    const db = creaDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.throws(() =>
      db.exec(
        "INSERT INTO progressione (associato_id, tipo, creato_da) VALUES (1, 'nota', 'x@example.org')",
      ),
    );
  });

  it('un tag attivo non si assegna due volte nello stesso anno', () => {
    const db = creaDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    db.exec(
      "INSERT INTO tag (id, nome, tipo_id, creato_da) VALUES (1, 'Aquile', 'squadriglia', 'x@example.org')",
    );
    db.exec(
      "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (1, 1, 'x@example.org')",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (1, 1, 'x@example.org')",
      ),
    );
    // dopo la rimozione si può riassegnare
    db.exec("UPDATE associati_tag SET rimosso_il = '2026-01-01', rimosso_da = 'x@example.org'");
    db.exec(
      "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (1, 1, 'x@example.org')",
    );
  });

  it('due tag attivi non possono avere lo stesso nome e tipo (maiuscole incluse)', () => {
    const db = creaDatabase();
    db.exec(
      "INSERT INTO tag (nome, tipo_id, creato_da) VALUES ('Aquile', 'squadriglia', 'x@example.org')",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO tag (nome, tipo_id, creato_da) VALUES ('aquile', 'squadriglia', 'x@example.org')",
      ),
    );
  });

  it('le chiavi esterne sono applicate', () => {
    const db = creaDatabase();
    assert.throws(() =>
      db.exec(
        "INSERT INTO associati (cognome, nome, unita_id) VALUES ('Prova', 'Uno', 'inesistente')",
      ),
    );
  });

  describe('le colonne di sola data accettano solo date valide AAAA-MM-GG', () => {
    const colonne: [string, string, string][] = [
      ['anni_scout', 'data_inizio', "INSERT INTO anni_scout (nome, data_inizio) VALUES ('x', ?)"],
      [
        'associati',
        'data_nascita',
        "INSERT INTO associati (cognome, nome, data_nascita) VALUES ('P', 'U', ?)",
      ],
      [
        'associati',
        'informativa_data',
        "INSERT INTO associati (cognome, nome, informativa_data) VALUES ('P', 'U', ?)",
      ],
      [
        'progressione',
        'data',
        "INSERT INTO progressione (associato_id, tipo, descrizione, creato_da, data) VALUES (1, 't', 'd', 'capo@example.org', ?)",
      ],
      [
        'riunioni',
        'data',
        "INSERT INTO riunioni (unita_id, creato_da, data) VALUES ('lupetti', 'capo@example.org', ?)",
      ],
    ];
    const valide = ['2026-11-14', '2024-02-29'];
    const nonValide = [
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '2026-1-5',
      '14/11/2026',
      '2026-11-14 10:00',
      '2026-11-14T10:00:00Z',
      '',
    ];

    for (const [tabella, colonna, sql] of colonne) {
      it(`${tabella}.${colonna}`, () => {
        const db = creaDatabase();
        db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
        for (const v of valide) {
          db.exec('SAVEPOINT s');
          assert.doesNotThrow(() => db.prepare(sql).run(v), v);
          db.exec('ROLLBACK TO s');
        }
        for (const v of nonValide) {
          assert.throws(() => db.prepare(sql).run(v), /CHECK/, `${v} dovrebbe essere rifiutato`);
        }
      });
    }
  });
});

describe('registri in sola aggiunta', () => {
  const inserisciModifica = (db: ReturnType<typeof creaDatabase>, stato: string | null) =>
    db
      .prepare(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
        valore_prima, valore_dopo, stato_buona_strada)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', '"00000"', '"00001"', ?)`)
      .run(stato).lastInsertRowid;

  it('una modifica non si cancella', () => {
    const db = creaDatabase();
    const id = inserisciModifica(db, null);
    assert.throws(
      () => db.prepare('DELETE FROM modifiche WHERE id = ?').run(id),
      /non si cancella/,
    );
  });

  it('la conferma Buona Strada è l’unico aggiornamento ammesso', () => {
    const db = creaDatabase();
    const id = inserisciModifica(db, 'da_riportare');
    const conferma = db.prepare(`UPDATE modifiche SET stato_buona_strada = 'riportata',
      confermata_da = ?, confermata_il = '2026-11-14T10:00:00.000Z' WHERE id = ?`);
    conferma.run('b@example.org', id);
    // una volta riportata non si torna indietro né si cambia chi ha confermato
    assert.throws(
      () =>
        db
          .prepare(
            "UPDATE modifiche SET stato_buona_strada = 'da_riportare', confermata_da = NULL, confermata_il = NULL WHERE id = ?",
          )
          .run(id),
      /solo la conferma/,
    );
    assert.throws(() => conferma.run('c@example.org', id), /solo la conferma/);
  });

  it('la conferma non può cambiare il contenuto della modifica', () => {
    const db = creaDatabase();
    const id = inserisciModifica(db, 'da_riportare');
    assert.throws(
      () =>
        db
          .prepare(`UPDATE modifiche SET stato_buona_strada = 'riportata', confermata_da = 'b@example.org',
          confermata_il = '2026-11-14T10:00:00.000Z', valore_dopo = '"99999"' WHERE id = ?`)
          .run(id),
      /solo la conferma/,
    );
  });

  it('una modifica senza Buona Strada non si aggiorna', () => {
    const db = creaDatabase();
    const id = inserisciModifica(db, null);
    assert.throws(
      () => db.prepare(`UPDATE modifiche SET valore_dopo = '"x"' WHERE id = ?`).run(id),
      /solo la conferma/,
    );
  });

  it('un accesso non si modifica né si cancella', () => {
    const db = creaDatabase();
    const id = db
      .prepare(
        "INSERT INTO accessi (email, canale, entita) VALUES ('a@example.org', 'pwa', 'associati')",
      )
      .run().lastInsertRowid;
    assert.throws(
      () => db.prepare("UPDATE accessi SET motivo = 'x' WHERE id = ?").run(id),
      /non si modifica/,
    );
    assert.throws(() => db.prepare('DELETE FROM accessi WHERE id = ?').run(id), /non si cancella/);
  });
});

describe('tutori e tag', () => {
  it('il ruolo del tutore è un valore ammesso', () => {
    const db = creaDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    const sql = db.prepare(
      "INSERT INTO tutori (associato_id, ruolo, cognome, nome) VALUES (1, ?, 'Prova', 'Due')",
    );
    for (const r of ['madre', 'padre', 'tutore', 'affidatario', 'altro']) sql.run(r);
    assert.throws(() => sql.run('nonna'), /CHECK/);
  });

  it("riceve_comunicazioni sta sull'associato ed è attivo di default", () => {
    const db = creaDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.equal(conta(db, 'SELECT riceve_comunicazioni n FROM associati WHERE id = 1'), 1);
  });

  it("un tag senza tipo finisce in 'varie'", () => {
    const db = creaDatabase();
    db.exec("INSERT INTO tag (id, nome, creato_da) VALUES (1, 'Proposta', 'capo@example.org')");
    const r = db.prepare('SELECT tipo_id FROM tag WHERE id = 1').get() as { tipo_id: string };
    assert.equal(r.tipo_id, 'varie');
  });
});

describe('seed demo', () => {
  const db = creaDatabase({ demo: true });

  it('si applica dopo il seed base', () => {
    assert.ok(conta(db, 'SELECT count(*) n FROM associati') >= 40);
  });

  it('copre ogni unità attiva', () => {
    assert.equal(
      conta(
        db,
        "SELECT count(*) n FROM unita u WHERE attiva = 1 AND NOT EXISTS (SELECT 1 FROM associati a WHERE a.unita_id = u.id AND a.stato = 'attivo')",
      ),
      0,
    );
  });

  it('contiene solo dati finti', () => {
    assert.equal(
      conta(
        db,
        "SELECT count(*) n FROM associati WHERE email IS NOT NULL AND email NOT LIKE '%@example.org'",
      ),
      0,
    );
    assert.equal(
      conta(db, "SELECT count(*) n FROM tutori WHERE email NOT LIKE '%@example.org'"),
      0,
    );
    assert.equal(
      conta(db, "SELECT count(*) n FROM utenti WHERE email NOT LIKE '%@example.org'"),
      0,
    );
    assert.equal(
      conta(
        db,
        "SELECT count(*) n FROM associati WHERE codice_fiscale IS NOT NULL AND codice_fiscale NOT LIKE 'DEMO%'",
      ),
      0,
    );
    assert.equal(
      conta(db, "SELECT count(*) n FROM tutori WHERE codice_fiscale NOT LIKE 'DEMO%'"),
      0,
    );
  });

  it('ogni relazione ha la sua inversa', () => {
    assert.equal(
      conta(
        db,
        'SELECT count(*) n FROM relazioni r WHERE NOT EXISTS (SELECT 1 FROM relazioni i WHERE i.associato_id = r.altro_associato_id AND i.altro_associato_id = r.associato_id)',
      ),
      0,
    );
  });

  it('i tutori dei maggiorenni sono archiviati', () => {
    assert.equal(
      conta(
        db,
        "SELECT count(*) n FROM tutori t JOIN associati a ON a.id = t.associato_id WHERE a.data_nascita <= date('2026-11-12', '-18 years') AND t.archiviato = 0",
      ),
      0,
    );
  });

  it('ha un utente per ogni ruolo', () => {
    for (const ruolo of [
      'accesso_completo',
      'buona_strada',
      'webmaster',
      'beta_tester',
      'escluso',
    ]) {
      assert.ok(conta(db, `SELECT count(*) n FROM utenti WHERE ${ruolo} = 1`) >= 1, ruolo);
    }
    assert.ok(conta(db, 'SELECT count(*) n FROM utenti_unita') >= 1);
    assert.ok(conta(db, 'SELECT count(*) n FROM utenti WHERE buona_strada = 1') >= 2);
  });

  it('ha la progressione dal catalogo risolta', () => {
    assert.equal(
      conta(db, 'SELECT count(*) n FROM progressione WHERE catalogo_id IS NOT NULL'),
      10,
    );
  });

  it('ha modifiche da riportare su Buona Strada', () => {
    assert.ok(
      conta(db, "SELECT count(*) n FROM modifiche WHERE stato_buona_strada = 'da_riportare'") >= 1,
    );
  });

  it('rispetta il flag esclusivo dei tag', () => {
    assert.equal(
      conta(
        db,
        `SELECT count(*) n FROM (SELECT at.associato_id, t.tipo_id, at.anno_scout_id FROM associati_tag at
        JOIN tag t ON t.id = at.tag_id WHERE t.esclusivo = 1 AND at.rimosso_il IS NULL
        GROUP BY 1, 2, 3 HAVING count(*) > 1)`,
      ),
      0,
    );
  });
});

describe('catalogo di progressione', () => {
  it('ogni voce del seed base ha la versione del regolamento', () => {
    const db = creaDatabase();
    assert.equal(
      conta(db, 'SELECT count(*) n FROM catalogo_progressione WHERE versione IS NULL'),
      0,
    );
    assert.equal(conta(db, 'SELECT count(*) n FROM versioni_regolamento'), 1);
  });

  it('una nuova versione può ripetere le stesse voci', () => {
    const db = creaDatabase();
    db.exec("INSERT INTO versioni_regolamento (data, nome) VALUES ('2028-06-01', 'Prova')");
    db.exec(
      "INSERT INTO catalogo_progressione (versione, branca_id, tipo, nome) VALUES ('2028-06-01', 'eg', 'tappa', 'Scoperta')",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO catalogo_progressione (versione, branca_id, tipo, nome) VALUES ('2028-06-01', 'eg', 'tappa', 'Scoperta')",
      ),
    );
  });
});

describe('documentazione', () => {
  it('docs/catalogo-progressione.md coincide con il seed del catalogo', () => {
    const testo = readFileSync(
      new URL('../../docs/catalogo-progressione.md', import.meta.url),
      'utf8',
    );
    const versione = testo.match(/^\*\*Versione:\*\* `([\d-]+)`/m)?.[1];
    const dalDocumento: string[] = [];
    let branca = '';
    for (const riga of testo.split('\n')) {
      const titolo = riga.match(/^## .*\(`(\w+)`\)$/);
      if (titolo) branca = titolo[1] ?? '';
      const voce = riga.match(/^\| (\d+) \| (\S+) \| (.+) \|$/);
      if (branca && voce)
        dalDocumento.push(`${versione}|${branca}|${voce[2]}|${voce[3]}|${voce[1]}`);
    }
    const db = creaDatabase();
    const dalSeed = (
      db
        .prepare(
          "SELECT versione || '|' || branca_id || '|' || tipo || '|' || nome || '|' || ordine v FROM catalogo_progressione",
        )
        .all() as { v: string }[]
    ).map((r) => r.v);
    assert.deepEqual(dalDocumento.sort(), dalSeed.sort());
  });
});
