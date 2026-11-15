import { Hono } from 'hono';
import { ErroreConfigurazione, leggiConfig } from './config.ts';
import type { Env } from './env.ts';
import { ErrorePpu } from './errori.ts';
import { api } from './rest/index.ts';

const app = new Hono<{ Bindings: Env }>();

/** Controllo di salute, senza autenticazione e senza dati. */
app.get('/salute', (c) => {
  const config = leggiConfig(c.env);
  return c.json({ stato: 'ok', ambiente: config.ambiente });
});

app.route('/api', api);

app.onError((err, c) => {
  if (err instanceof ErrorePpu) {
    return c.json({ errore: { codice: err.codice, messaggio: err.message } }, err.statoHttp as 400);
  }
  if (err instanceof ErroreConfigurazione) {
    console.error('Configurazione non valida:', err.message);
    return c.json(
      { errore: { codice: 'configurazione', messaggio: 'Configurazione del server non valida.' } },
      500,
    );
  }
  // Mai dati nei log: solo il tipo di errore.
  console.error('Errore inatteso:', err instanceof Error ? err.name : typeof err);
  return c.json({ errore: { codice: 'interno', messaggio: 'Errore interno.' } }, 500);
});

app.notFound((c) => c.json({ errore: { codice: 'non_trovato', messaggio: 'Non trovato.' } }, 404));

export default app satisfies ExportedHandler<Env>;
