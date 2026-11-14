// Genera packages/worker/wrangler.generato.json per un ambiente pubblicato,
// partendo da wrangler.jsonc e dalle variabili d'ambiente della pipeline.
//
// Uso (in GitHub Actions):
//   PPU_AMBIENTE=beta PPU_DOMINIO=... node scripts/configura-wrangler.ts
//
// Variabili:
//   PPU_AMBIENTE            preview | beta | produzione (obbligatoria)
//   PPU_D1_NOME, PPU_D1_ID  database D1 (obbligatorie)
//   PPU_NOME_WORKER         nome del Worker (facoltativa; in preview, uno per PR)
//   PPU_DOMINIO             dominio Workspace (beta e produzione)
//   PPU_NOME_GRUPPO         nome del gruppo (facoltativa)
//   PPU_ACCESS_TEAM_DOMAIN  <team>.cloudflareaccess.com (beta e produzione)
//   PPU_ACCESS_AUD          audience dell'applicazione Access (beta e produzione)
//   PPU_KV_OAUTH_ID         id del KV namespace OAUTH_KV del provider OAuth (obbligatoria)
//   PPU_ROUTE               dominio personalizzato del Worker (facoltativa)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type AmbientePubblicato = 'preview' | 'beta' | 'produzione';

export interface Opzioni {
  ambiente: AmbientePubblicato;
  d1Nome: string;
  d1Id: string;
  kvOauthId: string;
  nomeWorker?: string | undefined;
  dominio?: string | undefined;
  nomeGruppo?: string | undefined;
  accessTeamDomain?: string | undefined;
  accessAud?: string | undefined;
  route?: string | undefined;
}

type Json = Record<string, unknown>;

/** Toglie i commenti su righe intere, l'unico tipo ammesso in wrangler.jsonc. */
export function togliCommenti(jsonc: string): string {
  return jsonc
    .split('\n')
    .filter((riga) => !riga.trimStart().startsWith('//'))
    .join('\n');
}

function richiesto(valore: string | undefined, nome: string): string {
  if (!valore?.trim()) throw new Error(`${nome} mancante`);
  return valore.trim();
}

export function generaConfig(base: Json, o: Opzioni): Json {
  const ambienti = base.env as Record<string, Json> | undefined;
  const sezione = ambienti?.[o.ambiente];
  if (!sezione) throw new Error(`Ambiente "${o.ambiente}" assente in wrangler.jsonc`);

  const vars = { ...(sezione.vars as Record<string, string>) };
  if (vars.AMBIENTE !== o.ambiente) {
    throw new Error(`vars.AMBIENTE di "${o.ambiente}" non corrisponde`);
  }

  if (o.ambiente === 'preview') {
    // La preview usa solo il seed demo: dominio example.org e identità simulata.
    if (vars.MODALITA_TEST !== 'attiva') throw new Error('La preview richiede MODALITA_TEST');
  } else {
    if ('MODALITA_TEST' in vars) {
      throw new Error(`MODALITA_TEST non consentita in "${o.ambiente}"`);
    }
    vars.DOMINIO = richiesto(o.dominio, 'PPU_DOMINIO').toLowerCase();
    vars.ACCESS_TEAM_DOMAIN = richiesto(o.accessTeamDomain, 'PPU_ACCESS_TEAM_DOMAIN');
    vars.ACCESS_AUD = richiesto(o.accessAud, 'PPU_ACCESS_AUD');
    if (o.nomeGruppo?.trim()) vars.NOME_GRUPPO = o.nomeGruppo.trim();
  }

  const [d1] = sezione.d1_databases as Json[];
  if (!d1) throw new Error(`d1_databases assente in "${o.ambiente}"`);

  const nuova: Json = {
    ...sezione,
    vars,
    // I binding KV non si ereditano tra ambienti: si dichiarano qui.
    kv_namespaces: [{ binding: 'OAUTH_KV', id: richiesto(o.kvOauthId, 'PPU_KV_OAUTH_ID') }],
    d1_databases: [
      {
        ...d1,
        database_name: richiesto(o.d1Nome, 'PPU_D1_NOME'),
        database_id: richiesto(o.d1Id, 'PPU_D1_ID'),
      },
    ],
  };
  if (o.nomeWorker?.trim()) nuova.name = o.nomeWorker.trim();
  if (o.route?.trim()) nuova.routes = [{ pattern: o.route.trim(), custom_domain: true }];

  // Nel file generato c'è solo l'ambiente richiesto.
  return { ...base, env: { [o.ambiente]: nuova } };
}

/** Controllo finale indipendente: nessuna identità simulata fuori dalla preview. */
export function verificaSenzaModalitaTest(config: Json, ambiente: AmbientePubblicato): void {
  if (ambiente === 'preview') return;
  if (JSON.stringify(config).includes('MODALITA_TEST')) {
    throw new Error(`La configurazione di "${ambiente}" contiene MODALITA_TEST`);
  }
}

function main(): void {
  const cartella = fileURLToPath(new URL('../packages/worker/', import.meta.url));
  const base = JSON.parse(togliCommenti(readFileSync(`${cartella}wrangler.jsonc`, 'utf8'))) as Json;
  const e = process.env;
  const ambiente = e.PPU_AMBIENTE as AmbientePubblicato;
  if (!['preview', 'beta', 'produzione'].includes(ambiente)) {
    throw new Error(`PPU_AMBIENTE non valido: "${e.PPU_AMBIENTE ?? ''}"`);
  }
  const config = generaConfig(base, {
    ambiente,
    d1Nome: e.PPU_D1_NOME ?? '',
    d1Id: e.PPU_D1_ID ?? '',
    kvOauthId: e.PPU_KV_OAUTH_ID ?? '',
    nomeWorker: e.PPU_NOME_WORKER,
    dominio: e.PPU_DOMINIO,
    nomeGruppo: e.PPU_NOME_GRUPPO,
    accessTeamDomain: e.PPU_ACCESS_TEAM_DOMAIN,
    accessAud: e.PPU_ACCESS_AUD,
    route: e.PPU_ROUTE,
  });
  verificaSenzaModalitaTest(config, ambiente);
  // Il file sta nella stessa cartella di wrangler.jsonc: i percorsi relativi restano validi.
  writeFileSync(`${cartella}wrangler.generato.json`, `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Scritto wrangler.generato.json per "${ambiente}"`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
