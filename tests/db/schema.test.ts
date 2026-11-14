import assert from 'node:assert/strict';
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
    assert.equal(conta(db, 'SELECT count(*) n FROM progressione WHERE catalogo_id IS NOT NULL'), 8);
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
