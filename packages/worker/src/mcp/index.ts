// Endpoint MCP (Streamable HTTP, senza stato: un server e un trasporto per
// richiesta, nessun Durable Object). L'identità arriva dal token OAuth (o
// dall'header di test in locale e preview) e passa dagli stessi controlli
// della PWA: caricaUtente a ogni richiesta, permessi nei servizi.

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Config } from '../config.ts';
import type { Env } from '../env.ts';
import { ErrorePpu } from '../errori.ts';
import { caricaUtente } from '../identita/index.ts';
import type { Contesto } from '../servizi/contesto.ts';
import { creaServerAdmin } from './admin.ts';
// I tipi di operazione si registrano all'import.
import '../servizi/admin/tag.ts';
import '../servizi/admin/unita.ts';
import '../servizi/admin/utenti.ts';

export const PERCORSO_MCP = '/mcp';
export const PERCORSO_MCP_ADMIN = '/mcp/admin';

function erroreJson(e: ErrorePpu): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message: e.message }, id: null },
    { status: e.statoHttp },
  );
}

export async function gestisciMcp(
  request: Request,
  env: Env,
  config: Config,
  email: string,
): Promise<Response> {
  const percorso = new URL(request.url).pathname.replace(/\/+$/, '');
  if (percorso !== PERCORSO_MCP_ADMIN) {
    // L'endpoint per tutti i capi (/mcp) arriva nella fase 1.
    return erroreJson(new ErrorePpu('non_trovato', 'Endpoint MCP non disponibile.'));
  }
  let ctx: Contesto;
  try {
    const utente = await caricaUtente(env.DB, email, config);
    // Le modifiche fatte dall'MCP admin finiscono nel registro con canale 'admin'.
    ctx = { db: env.DB, utente, canale: 'admin', dominio: config.dominio };
  } catch (e) {
    if (e instanceof ErrorePpu) return erroreJson(e);
    throw e;
  }
  const server = creaServerAdmin(ctx);
  // Senza sessionIdGenerator il trasporto è senza stato.
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
