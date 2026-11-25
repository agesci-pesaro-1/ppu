import type { z } from 'zod';
import { AppError } from '../errors.ts';

/** Validates with zod and turns the error into bad_request (message shown to the user). */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) {
    const detail = r.error.issues
      .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
      .join('; ');
    throw new AppError('bad_request', `Richiesta non valida (${detail}).`);
  }
  return r.data;
}
