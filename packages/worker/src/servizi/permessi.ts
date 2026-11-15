// Regole di permesso. Sono l'unico posto in cui si decide chi può fare cosa:
// REST e MCP chiamano i servizi, i servizi chiamano queste funzioni.

import { ErrorePpu } from '../errori.ts';
import type { Utente } from '../identita/index.ts';

/** Associato visto dal punto di vista dei permessi. */
export interface AssociatoPerPermessi {
  id: number;
  unitaId: string | null;
  /** true se l'associato è un capo (ha una riga in `utenti`). */
  eCapo: boolean;
}

/** Ogni capo del dominio (non escluso) legge tutto. */
export function puoLeggere(_utente: Utente): boolean {
  return true;
}

export function puoModificareUnita(utente: Utente, unitaId: string): boolean {
  return utente.accessoCompleto || utente.unita.includes(unitaId);
}

/**
 * I dati di un capo li modifica il capo stesso o chi ha accesso completo.
 * Gli altri associati li modifica chi può modificare la loro unità attuale.
 */
export function puoModificareAssociato(utente: Utente, associato: AssociatoPerPermessi): boolean {
  if (utente.accessoCompleto) return true;
  if (associato.eCapo) return utente.associatoId === associato.id;
  return associato.unitaId !== null && puoModificareUnita(utente, associato.unitaId);
}

/** Chi conferma su Buona Strada deve avere il ruolo e non essere l'autore. Vale per tutti. */
export function puoConfermareBuonaStrada(utente: Utente, autoreEmail: string): boolean {
  return utente.buonaStrada && utente.email !== autoreEmail.toLowerCase();
}

export function puoAmministrare(utente: Utente): boolean {
  return utente.webmaster;
}

/** Lancia permesso_negato se la condizione è falsa. */
export function richiedi(condizione: boolean, messaggio: string): void {
  if (!condizione) throw new ErrorePpu('permesso_negato', messaggio);
}
