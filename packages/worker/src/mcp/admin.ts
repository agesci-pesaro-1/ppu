// Strumenti MCP riservati al webmaster. Ogni strumento chiama i servizi, che
// controllano i permessi: questo file non decide nulla da solo.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import { ErrorePpu } from '../errori.ts';
import { elencaTag } from '../servizi/admin/tag.ts';
import { elencaUnita } from '../servizi/admin/unita.ts';
import { elencaUtenti, richiediWebmaster } from '../servizi/admin/utenti.ts';
import { annulla, conferma, proponi } from '../servizi/anteprime.ts';
import type { Contesto } from '../servizi/contesto.ts';

const NOTA_CONFERMA =
  'Non modifica nulla: restituisce un\'anteprima prima/dopo con un id. Mostrala all\'utente e, solo dopo il suo esplicito "sì", chiama conferma_operazione.';

async function esegui(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const risultato = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(risultato ?? { ok: true }) }] };
  } catch (e) {
    if (e instanceof ErrorePpu) {
      return { isError: true, content: [{ type: 'text', text: `${e.codice}: ${e.message}` }] };
    }
    throw e;
  }
}

export function creaServerAdmin(ctx: Contesto): McpServer {
  const server = new McpServer(
    { name: 'ppu-admin', version: '0.1.0' },
    {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
      instructions:
        'Strumenti di amministrazione di PPU, riservati al webmaster. Ogni modifica passa da anteprima e conferma esplicita.',
    },
  );

  server.registerTool(
    'chi_sono',
    {
      description: "Mostra email e ruoli dell'utente collegato.",
      annotations: { readOnlyHint: true },
    },
    () =>
      esegui(async () => ({
        email: ctx.utente.email,
        webmaster: ctx.utente.webmaster,
        accessoCompleto: ctx.utente.accessoCompleto,
      })),
  );

  server.registerTool(
    'elenca_utenti',
    {
      description: 'Elenca i capi registrati nella tabella utenti con unità e ruoli.',
      annotations: { readOnlyHint: true },
    },
    () => esegui(() => elencaUtenti(ctx)),
  );

  server.registerTool(
    'imposta_utente',
    {
      description: `Crea un utente o ne cambia unità, ruoli o scheda associato. I campi omessi restano invariati; "unita" sostituisce l'elenco. ${NOTA_CONFERMA}`,
      inputSchema: {
        email: z.string().describe('Email Workspace del capo'),
        unita: z.array(z.string()).optional().describe('Id delle unità in cui può modificare'),
        accesso_completo: z.boolean().optional(),
        buona_strada: z.boolean().optional(),
        webmaster: z.boolean().optional(),
        beta_tester: z.boolean().optional(),
        escluso: z
          .boolean()
          .optional()
          .describe('Esclude un account del dominio che non è un capo'),
        associato_id: z.number().int().nullable().optional().describe('Scheda associato del capo'),
      },
    },
    (args) => esegui(() => proponi(ctx, 'utente.imposta', args)),
  );

  server.registerTool(
    'elenca_unita',
    {
      description: 'Elenca le unità con stato, associati attivi e numero di capi.',
      annotations: { readOnlyHint: true },
    },
    () => esegui(() => elencaUnita(ctx)),
  );

  server.registerTool(
    'imposta_unita',
    {
      description: `Aggiunge un'unità o ne cambia nome, branca, ordine o stato attivo. Le unità non si cancellano: si disattivano. ${NOTA_CONFERMA}`,
      inputSchema: {
        id: z.string().describe('Identificativo, per esempio "lupetti" o "branco_misto"'),
        nome: z.string().optional(),
        branca_id: z.enum(['lc', 'eg', 'rs', 'coca']).optional(),
        attiva: z.boolean().optional(),
        ordine: z.number().int().optional(),
      },
    },
    (args) => esegui(() => proponi(ctx, 'unita.imposta', args)),
  );

  server.registerTool(
    'elenca_tag',
    {
      description: 'Elenca i tag con tipo, stato e numero di utilizzi attivi, per la revisione.',
      inputSchema: {
        stato: z.enum(['libero', 'ufficiale', 'archiviato']).optional(),
        tipo: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    (args) => esegui(() => elencaTag(ctx, args)),
  );

  server.registerTool(
    'cambia_stato_tag',
    {
      description: `Rende un tag ufficiale, lo archivia o lo riporta a libero. ${NOTA_CONFERMA}`,
      inputSchema: {
        tag_id: z.number().int(),
        stato: z.enum(['libero', 'ufficiale', 'archiviato']),
      },
    },
    (args) => esegui(() => proponi(ctx, 'tag.stato', args)),
  );

  server.registerTool(
    'unisci_tag',
    {
      description: `Unisce il tag "da_id" nel tag "a_id": le assegnazioni passano al secondo, il primo viene archiviato. ${NOTA_CONFERMA}`,
      inputSchema: { da_id: z.number().int(), a_id: z.number().int() },
    },
    (args) => esegui(() => proponi(ctx, 'tag.unisci', args)),
  );

  server.registerTool(
    'conferma_operazione',
    {
      description:
        'Applica un\'operazione proposta, dopo il "sì" esplicito dell\'utente. Per le operazioni di massa passa anche "conteggio" con il numero mostrato nell\'anteprima.',
      inputSchema: { id: z.string(), conteggio: z.number().int().optional() },
      annotations: { destructiveHint: false },
    },
    (args) =>
      esegui(async () => {
        richiediWebmaster(ctx);
        return conferma(ctx, args.id, { conteggio: args.conteggio });
      }),
  );

  server.registerTool(
    'annulla_operazione',
    {
      description: "Annulla un'operazione proposta e non ancora confermata.",
      inputSchema: { id: z.string() },
    },
    (args) =>
      esegui(async () => {
        richiediWebmaster(ctx);
        await annulla(ctx, args.id);
        return { annullata: args.id };
      }),
  );

  return server;
}
