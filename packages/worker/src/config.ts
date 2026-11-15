import type { Env } from './env.ts';

export type Ambiente = 'locale' | 'preview' | 'beta' | 'produzione' | 'demo';

const AMBIENTI: readonly Ambiente[] = ['locale', 'preview', 'beta', 'produzione', 'demo'];

/** Ambienti in cui l'identità simulata può essere attivata. */
const AMBIENTI_CON_MODALITA_TEST: readonly Ambiente[] = ['locale', 'preview'];

export interface Config {
  ambiente: Ambiente;
  dominio: string;
  nomeGruppo: string;
  modalitaTest: boolean;
  access: { teamDomain: string; aud: string } | null;
  google: { clientId: string; clientSecret: string } | null;
}

export class ErroreConfigurazione extends Error {}

/**
 * Legge e valida la configurazione. Fallisce in modo esplicito se la modalità
 * di test è attiva fuori da locale e preview: è la protezione principale
 * contro un'identità simulata in beta o produzione.
 */
export function leggiConfig(env: Env): Config {
  const ambiente = env.AMBIENTE as Ambiente;
  if (!AMBIENTI.includes(ambiente)) {
    throw new ErroreConfigurazione(`AMBIENTE non valido: "${env.AMBIENTE}"`);
  }
  const dominio = (env.DOMINIO ?? '').trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(dominio)) {
    throw new ErroreConfigurazione('DOMINIO mancante o non valido');
  }
  const modalitaTest = env.MODALITA_TEST === 'attiva';
  if (modalitaTest && !AMBIENTI_CON_MODALITA_TEST.includes(ambiente)) {
    throw new ErroreConfigurazione(`MODALITA_TEST non consentita in "${ambiente}"`);
  }
  const access =
    env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD
      ? { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD }
      : null;
  if (!access && !modalitaTest && ambiente !== 'demo') {
    throw new ErroreConfigurazione('ACCESS_TEAM_DOMAIN e ACCESS_AUD sono obbligatori');
  }
  // Login Google per l'MCP: facoltativo (senza, l'endpoint MCP accetta solo la modalità di test).
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : null;
  return {
    ambiente,
    dominio,
    nomeGruppo: env.NOME_GRUPPO ?? 'PPU',
    modalitaTest,
    access,
    google,
  };
}
