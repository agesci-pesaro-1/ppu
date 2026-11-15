import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupSeedSql, readGroupConfig } from '../../scripts/group-seed.ts';
import { createDatabase, sqlFiles } from './setup.ts';

const count = (db: ReturnType<typeof createDatabase>, sql: string): number =>
  Number((db.prepare(sql).get() as { n: number }).n);

describe('migrations and initial data', () => {
  it('apply to an empty database with the example configuration', () => {
    const db = createDatabase();
    assert.equal(count(db, 'SELECT count(*) n FROM unita'), 7);
    assert.equal(count(db, 'SELECT count(*) n FROM branche'), 4);
    assert.equal(count(db, 'SELECT count(*) n FROM tipi_tag'), 3);
  });

  it('configuration and base seed can be applied again', () => {
    const db = createDatabase();
    const before = count(db, 'SELECT count(*) n FROM catalogo_progressione');
    db.exec(groupSeedSql(readGroupConfig()));
    for (const s of sqlFiles('seed/base')) db.exec(s);
    assert.equal(count(db, 'SELECT count(*) n FROM unita'), 7);
    assert.equal(count(db, 'SELECT count(*) n FROM catalogo_progressione'), before);
  });

  it('an entry added to the configuration is inserted without touching the others', () => {
    const config = readGroupConfig();
    const db = createDatabase({ config });
    db.exec("UPDATE unita SET nome = 'Branco Seeonee' WHERE id = 'lupetti'");
    config.unita.push({ id: 'branco_misto', nome: 'Branco misto', branca: 'lc' });
    db.exec(groupSeedSql(config));
    assert.equal(count(db, 'SELECT count(*) n FROM unita'), 8);
    const r = db.prepare("SELECT nome FROM unita WHERE id = 'lupetti'").get() as { nome: string };
    assert.equal(r.nome, 'Branco Seeonee');
  });

  it('the catalogue is inserted only for configured branches', () => {
    const config = readGroupConfig();
    config.branche = config.branche.filter((b) => b.id === 'eg');
    config.unita = config.unita.filter((u) => u.branca === 'eg');
    const db = createDatabase({ config });
    assert.equal(
      count(db, "SELECT count(*) n FROM catalogo_progressione WHERE branca_id <> 'eg'"),
      0,
    );
    assert.ok(count(db, "SELECT count(*) n FROM catalogo_progressione WHERE branca_id = 'eg'") > 0);
  });

  it('an invalid configuration is rejected with a clear message', () => {
    const config = readGroupConfig();
    config.unita.push({ id: 'reparto', nome: 'Reparto', branca: 'unknown' });
    config.tipi_tag = config.tipi_tag.filter((t) => t.id !== 'varie');
    assert.throws(() => groupSeedSql(config), /unknown branch[\s\S]*missing type "varie"/);
  });

  it('Noviziato belongs to the R/S branch and the clan is called Clan/Fuoco', () => {
    const db = createDatabase();
    const r = db.prepare("SELECT branca_id FROM unita WHERE id = 'noviziato'").get() as {
      branca_id: string;
    };
    assert.equal(r.branca_id, 'rs');
    const c = db.prepare("SELECT nome FROM unita WHERE id = 'clan'").get() as { nome: string };
    assert.equal(c.nome, 'Clan/Fuoco');
  });
});

describe('domain constraints', () => {
  it('only one current scout year', () => {
    const db = createDatabase();
    db.exec(
      "INSERT INTO anni_scout (nome, data_inizio, attuale) VALUES ('2025/26', '2025-10-05', 1)",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO anni_scout (nome, data_inizio, attuale) VALUES ('2026/27', '2026-10-04', 1)",
      ),
    );
  });

  it('whoever confirms on Buona Strada cannot be the author', () => {
    const db = createDatabase();
    assert.throws(() =>
      db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
        stato_buona_strada, confermata_da, confermata_il)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', 'riportata', 'a@example.org', '2026-01-01')`),
    );
    db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
      stato_buona_strada, confermata_da, confermata_il)
      VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', 'riportata', 'b@example.org', '2026-01-01')`);
  });

  it('a change marked as copied must record who confirmed it', () => {
    const db = createDatabase();
    assert.throws(() =>
      db.exec(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, stato_buona_strada)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'riportata')`),
    );
  });

  it('user emails are lowercase', () => {
    const db = createDatabase();
    assert.throws(() => db.exec("INSERT INTO utenti (email) VALUES ('Capo@Example.org')"));
    db.exec("INSERT INTO utenti (email) VALUES ('capo@example.org')");
  });

  it('archived requires the archiving date', () => {
    const db = createDatabase();
    assert.throws(() =>
      db.exec("INSERT INTO associati (cognome, nome, stato) VALUES ('Prova', 'Uno', 'archiviato')"),
    );
  });

  it('a relationship cannot link a member to themselves', () => {
    const db = createDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.throws(() =>
      db.exec(
        "INSERT INTO relazioni (associato_id, altro_associato_id, tipo) VALUES (1, 1, 'altro')",
      ),
    );
  });

  it('a free progression entry requires type and description', () => {
    const db = createDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.throws(() =>
      db.exec(
        "INSERT INTO progressione (associato_id, tipo, creato_da) VALUES (1, 'nota', 'x@example.org')",
      ),
    );
  });

  it('an active tag cannot be assigned twice in the same year', () => {
    const db = createDatabase();
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
    // after removal it can be assigned again
    db.exec("UPDATE associati_tag SET rimosso_il = '2026-01-01', rimosso_da = 'x@example.org'");
    db.exec(
      "INSERT INTO associati_tag (associato_id, tag_id, creato_da) VALUES (1, 1, 'x@example.org')",
    );
  });

  it('two active tags cannot share name and type (case-insensitive)', () => {
    const db = createDatabase();
    db.exec(
      "INSERT INTO tag (nome, tipo_id, creato_da) VALUES ('Aquile', 'squadriglia', 'x@example.org')",
    );
    assert.throws(() =>
      db.exec(
        "INSERT INTO tag (nome, tipo_id, creato_da) VALUES ('aquile', 'squadriglia', 'x@example.org')",
      ),
    );
  });

  it('foreign keys are enforced', () => {
    const db = createDatabase();
    assert.throws(() =>
      db.exec("INSERT INTO associati (cognome, nome, unita_id) VALUES ('Prova', 'Uno', 'unknown')"),
    );
  });

  describe('date-only columns accept only valid YYYY-MM-DD dates', () => {
    const columns: [string, string, string][] = [
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
    const valid = ['2026-11-14', '2024-02-29'];
    const invalid = [
      '2026-02-30',
      '2025-02-29',
      '2026-13-01',
      '2026-1-5',
      '14/11/2026',
      '2026-11-14 10:00',
      '2026-11-14T10:00:00Z',
      '',
    ];

    for (const [table, column, sql] of columns) {
      it(`${table}.${column}`, () => {
        const db = createDatabase();
        db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
        for (const v of valid) {
          db.exec('SAVEPOINT s');
          assert.doesNotThrow(() => db.prepare(sql).run(v), v);
          db.exec('ROLLBACK TO s');
        }
        for (const v of invalid) {
          assert.throws(() => db.prepare(sql).run(v), /CHECK/, `${v} should be rejected`);
        }
      });
    }
  });
});

describe('append-only logs', () => {
  const insertChange = (db: ReturnType<typeof createDatabase>, status: string | null) =>
    db
      .prepare(`INSERT INTO modifiche (operazione, autore_email, canale, entita, entita_id, campo,
        valore_prima, valore_dopo, stato_buona_strada)
        VALUES ('op', 'a@example.org', 'pwa', 'associati', '1', 'cap', '"00000"', '"00001"', ?)`)
      .run(status).lastInsertRowid;

  it('a change cannot be deleted', () => {
    const db = createDatabase();
    const id = insertChange(db, null);
    assert.throws(
      () => db.prepare('DELETE FROM modifiche WHERE id = ?').run(id),
      /cannot be deleted/,
    );
  });

  it('the Buona Strada confirmation is the only allowed update', () => {
    const db = createDatabase();
    const id = insertChange(db, 'da_riportare');
    const confirm = db.prepare(`UPDATE modifiche SET stato_buona_strada = 'riportata',
      confermata_da = ?, confermata_il = '2026-11-14T10:00:00.000Z' WHERE id = ?`);
    confirm.run('b@example.org', id);
    // once copied it cannot go back, nor can the confirmer change
    assert.throws(
      () =>
        db
          .prepare(
            "UPDATE modifiche SET stato_buona_strada = 'da_riportare', confermata_da = NULL, confermata_il = NULL WHERE id = ?",
          )
          .run(id),
      /only the Buona Strada confirmation/,
    );
    assert.throws(() => confirm.run('c@example.org', id), /only the Buona Strada confirmation/);
  });

  it('the confirmation cannot change the content of the change', () => {
    const db = createDatabase();
    const id = insertChange(db, 'da_riportare');
    assert.throws(
      () =>
        db
          .prepare(`UPDATE modifiche SET stato_buona_strada = 'riportata', confermata_da = 'b@example.org',
          confermata_il = '2026-11-14T10:00:00.000Z', valore_dopo = '"99999"' WHERE id = ?`)
          .run(id),
      /only the Buona Strada confirmation/,
    );
  });

  it('a change without Buona Strada cannot be updated', () => {
    const db = createDatabase();
    const id = insertChange(db, null);
    assert.throws(
      () => db.prepare(`UPDATE modifiche SET valore_dopo = '"x"' WHERE id = ?`).run(id),
      /only the Buona Strada confirmation/,
    );
  });

  it('an access record cannot be updated or deleted', () => {
    const db = createDatabase();
    const id = db
      .prepare(
        "INSERT INTO accessi (email, canale, entita) VALUES ('a@example.org', 'pwa', 'associati')",
      )
      .run().lastInsertRowid;
    assert.throws(
      () => db.prepare("UPDATE accessi SET motivo = 'x' WHERE id = ?").run(id),
      /cannot be updated/,
    );
    assert.throws(
      () => db.prepare('DELETE FROM accessi WHERE id = ?').run(id),
      /cannot be deleted/,
    );
  });
});

describe('guardians and tags', () => {
  it('the guardian role is an allowed value', () => {
    const db = createDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    const sql = db.prepare(
      "INSERT INTO tutori (associato_id, ruolo, cognome, nome) VALUES (1, ?, 'Prova', 'Due')",
    );
    for (const r of ['madre', 'padre', 'tutore', 'affidatario', 'altro']) sql.run(r);
    assert.throws(() => sql.run('nonna'), /CHECK/);
  });

  it('riceve_comunicazioni is on the member and on by default', () => {
    const db = createDatabase();
    db.exec("INSERT INTO associati (id, cognome, nome) VALUES (1, 'Prova', 'Uno')");
    assert.equal(count(db, 'SELECT riceve_comunicazioni n FROM associati WHERE id = 1'), 1);
  });

  it("a tag without a type goes to 'varie'", () => {
    const db = createDatabase();
    db.exec("INSERT INTO tag (id, nome, creato_da) VALUES (1, 'Proposta', 'capo@example.org')");
    const r = db.prepare('SELECT tipo_id FROM tag WHERE id = 1').get() as { tipo_id: string };
    assert.equal(r.tipo_id, 'varie');
  });
});

describe('demo seed', () => {
  const db = createDatabase({ demo: true });

  it('applies after configuration and base seed', () => {
    assert.ok(count(db, 'SELECT count(*) n FROM associati') >= 40);
  });

  it('covers every active unit', () => {
    assert.equal(
      count(
        db,
        "SELECT count(*) n FROM unita u WHERE attiva = 1 AND NOT EXISTS (SELECT 1 FROM associati a WHERE a.unita_id = u.id AND a.stato = 'attivo')",
      ),
      0,
    );
  });

  it('contains only fake data', () => {
    assert.equal(
      count(
        db,
        "SELECT count(*) n FROM associati WHERE email IS NOT NULL AND email NOT LIKE '%@example.org'",
      ),
      0,
    );
    assert.equal(
      count(db, "SELECT count(*) n FROM tutori WHERE email NOT LIKE '%@example.org'"),
      0,
    );
    assert.equal(
      count(db, "SELECT count(*) n FROM utenti WHERE email NOT LIKE '%@example.org'"),
      0,
    );
    assert.equal(
      count(
        db,
        "SELECT count(*) n FROM associati WHERE codice_fiscale IS NOT NULL AND codice_fiscale NOT LIKE 'DEMO%'",
      ),
      0,
    );
    assert.equal(
      count(db, "SELECT count(*) n FROM tutori WHERE codice_fiscale NOT LIKE 'DEMO%'"),
      0,
    );
  });

  it('every relationship has its inverse', () => {
    assert.equal(
      count(
        db,
        'SELECT count(*) n FROM relazioni r WHERE NOT EXISTS (SELECT 1 FROM relazioni i WHERE i.associato_id = r.altro_associato_id AND i.altro_associato_id = r.associato_id)',
      ),
      0,
    );
  });

  it('guardians of adults are archived', () => {
    assert.equal(
      count(
        db,
        "SELECT count(*) n FROM tutori t JOIN associati a ON a.id = t.associato_id WHERE a.data_nascita <= date('2026-11-12', '-18 years') AND t.archiviato = 0",
      ),
      0,
    );
  });

  it('has a user for every role', () => {
    for (const role of [
      'accesso_completo',
      'buona_strada',
      'webmaster',
      'beta_tester',
      'escluso',
    ]) {
      assert.ok(count(db, `SELECT count(*) n FROM utenti WHERE ${role} = 1`) >= 1, role);
    }
    assert.ok(count(db, 'SELECT count(*) n FROM utenti_unita') >= 1);
    assert.ok(count(db, 'SELECT count(*) n FROM utenti WHERE buona_strada = 1') >= 2);
  });

  it('resolves progression entries from the catalogue', () => {
    assert.equal(
      count(db, 'SELECT count(*) n FROM progressione WHERE catalogo_id IS NOT NULL'),
      10,
    );
  });

  it('has changes to copy to Buona Strada', () => {
    assert.ok(
      count(db, "SELECT count(*) n FROM modifiche WHERE stato_buona_strada = 'da_riportare'") >= 1,
    );
  });

  it('respects the exclusive flag of tags', () => {
    assert.equal(
      count(
        db,
        `SELECT count(*) n FROM (SELECT at.associato_id, t.tipo_id, at.anno_scout_id FROM associati_tag at
        JOIN tag t ON t.id = at.tag_id WHERE t.esclusivo = 1 AND at.rimosso_il IS NULL
        GROUP BY 1, 2, 3 HAVING count(*) > 1)`,
      ),
      0,
    );
  });
});

describe('progression catalogue', () => {
  it('every base seed entry has a Regolamento version', () => {
    const db = createDatabase();
    assert.equal(
      count(db, 'SELECT count(*) n FROM catalogo_progressione WHERE versione IS NULL'),
      0,
    );
    assert.equal(count(db, 'SELECT count(*) n FROM versioni_regolamento'), 1);
  });

  it('a new version can repeat the same entries', () => {
    const db = createDatabase();
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
