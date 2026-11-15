import type { z } from 'zod';
import { ErrorePpu } from '../errori.ts';

/** Valida con zod e traduce l'errore in richiesta_non_valida. */
export function analizza<S extends z.ZodType>(schema: S, valore: unknown): z.infer<S> {
  const r = schema.safeParse(valore);
  if (!r.success) {
    const dettaglio = r.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    throw new ErrorePpu('richiesta_non_valida', `Richiesta non valida (${dettaglio}).`);
  }
  return r.data;
}
