import type { Utente } from '../identita/index.ts';
import type { Canale } from './registro.ts';

/** Chi sta agendo, da dove, su quale database. Lo passano REST e MCP ai servizi. */
export interface Contesto {
  db: D1Database;
  utente: Utente;
  canale: Exclude<Canale, 'import' | 'sistema'>;
  /** Dominio Google Workspace configurato. */
  dominio: string;
  /** Istante corrente; sostituibile nei test. */
  adesso?: () => Date;
}

export const adesso = (ctx: Contesto): Date => (ctx.adesso ? ctx.adesso() : new Date());
