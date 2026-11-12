export type CodiceErrore =
  | 'non_autenticato'
  | 'dominio_non_ammesso'
  | 'escluso'
  | 'non_beta_tester'
  | 'permesso_negato'
  | 'non_trovato'
  | 'richiesta_non_valida'
  | 'conflitto'
  | 'anteprima_non_valida'
  | 'configurazione';

const STATO_HTTP: Record<CodiceErrore, number> = {
  non_autenticato: 401,
  dominio_non_ammesso: 403,
  escluso: 403,
  non_beta_tester: 403,
  permesso_negato: 403,
  non_trovato: 404,
  richiesta_non_valida: 400,
  conflitto: 409,
  anteprima_non_valida: 409,
  configurazione: 500,
};

/** Errore di dominio, con messaggio in italiano mostrabile all'utente. */
export class ErrorePpu extends Error {
  readonly codice: CodiceErrore;
  constructor(codice: CodiceErrore, messaggio: string) {
    super(messaggio);
    this.codice = codice;
  }
  get statoHttp(): number {
    return STATO_HTTP[this.codice];
  }
}
