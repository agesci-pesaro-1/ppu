import { env } from 'cloudflare:workers';
import type { Utente } from '../src/identita/index.ts';
import type { Contesto } from '../src/servizi/contesto.ts';
// I tipi di operazione si registrano all'import.
import '../src/servizi/admin/tag.ts';
import '../src/servizi/admin/unita.ts';
import '../src/servizi/admin/utenti.ts';

export const utente = (u: Partial<Utente> = {}): Utente => ({
  email: 'webmaster@example.org',
  associatoId: null,
  unita: [],
  accessoCompleto: false,
  buonaStrada: false,
  webmaster: true,
  betaTester: false,
  ...u,
});

export const contesto = (u: Partial<Utente> = {}, adesso?: Date): Contesto => ({
  db: env.DB,
  utente: utente(u),
  canale: 'admin',
  dominio: 'example.org',
  ...(adesso ? { adesso: () => adesso } : {}),
});
