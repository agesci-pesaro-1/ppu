// MCP tools reserved to the webmaster. Every tool calls the services, which
// check the permissions: this file decides nothing on its own.
//
// Tool descriptions are read by the model; the texts the user reads (preview
// descriptions, error messages) come from the services, in Italian.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { CfWorkerJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/cfworker';
import { z } from 'zod';
import { AppError } from '../errors.ts';
import { listTags } from '../services/admin/tags.ts';
import { listUnits } from '../services/admin/units.ts';
import { ensureWebmaster, listUsers } from '../services/admin/users.ts';
import type { Context } from '../services/context.ts';
import { cancel, confirm, propose } from '../services/previews.ts';

const CONFIRMATION_NOTE =
  'Changes nothing: returns a before/after preview with an id. Show it to the user and call confirm_operation only after their explicit "yes".';

const TAG_STATUS = z.enum(['libero', 'ufficiale', 'archiviato']);

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await fn();
    return { content: [{ type: 'text', text: JSON.stringify(result ?? { ok: true }) }] };
  } catch (e) {
    if (e instanceof AppError) {
      return { isError: true, content: [{ type: 'text', text: `${e.code}: ${e.message}` }] };
    }
    throw e;
  }
}

export function createAdminServer(ctx: Context): McpServer {
  const server = new McpServer(
    { name: 'ppu-admin', version: '0.1.0' },
    {
      jsonSchemaValidator: new CfWorkerJsonSchemaValidator(),
      instructions:
        'PPU administration tools, reserved to the webmaster. Every change goes through a preview and an explicit confirmation. Talk to the user in Italian.',
    },
  );

  server.registerTool(
    'whoami',
    {
      description: 'Shows the email and roles of the connected user.',
      annotations: { readOnlyHint: true },
    },
    () =>
      run(async () => ({
        email: ctx.user.email,
        webmaster: ctx.user.webmaster,
        fullAccess: ctx.user.fullAccess,
      })),
  );

  server.registerTool(
    'list_users',
    {
      description: 'Lists the leaders in the utenti table with their units and roles.',
      annotations: { readOnlyHint: true },
    },
    () => run(() => listUsers(ctx)),
  );

  server.registerTool(
    'set_user',
    {
      description: `Creates a user or changes their units, roles or member record. Omitted fields stay unchanged; "units" replaces the list. ${CONFIRMATION_NOTE}`,
      inputSchema: {
        email: z.string().describe("Leader's Workspace email"),
        units: z.array(z.string()).optional().describe('Ids of the units where they can edit'),
        fullAccess: z.boolean().optional(),
        buonaStrada: z.boolean().optional(),
        webmaster: z.boolean().optional(),
        betaTester: z.boolean().optional(),
        excluded: z.boolean().optional().describe('Excludes a domain account that is not a leader'),
        memberId: z.number().int().nullable().optional().describe("Leader's member record"),
      },
    },
    (args) => run(() => propose(ctx, 'user.set', args)),
  );

  server.registerTool(
    'list_units',
    {
      description: 'Lists the units with their state, active members and number of leaders.',
      annotations: { readOnlyHint: true },
    },
    () => run(() => listUnits(ctx)),
  );

  server.registerTool(
    'set_unit',
    {
      description: `Adds a unit or changes its name, branch, order or active state. Units are never deleted: they are deactivated. ${CONFIRMATION_NOTE}`,
      inputSchema: {
        id: z.string().describe('Identifier, e.g. "lupetti" or "branco_misto"'),
        name: z.string().optional(),
        branchId: z.string().optional().describe('Id of a configured branch, e.g. "lc"'),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      },
    },
    (args) => run(() => propose(ctx, 'unit.set', args)),
  );

  server.registerTool(
    'list_tags',
    {
      description: 'Lists the tags with type, status and number of active uses, for the review.',
      inputSchema: { status: TAG_STATUS.optional(), type: z.string().optional() },
      annotations: { readOnlyHint: true },
    },
    (args) => run(() => listTags(ctx, args)),
  );

  server.registerTool(
    'set_tag_status',
    {
      description: `Makes a tag official (ufficiale), archives it (archiviato) or sets it back to free (libero). ${CONFIRMATION_NOTE}`,
      inputSchema: { tagId: z.number().int(), status: TAG_STATUS },
    },
    (args) => run(() => propose(ctx, 'tag.status', args)),
  );

  server.registerTool(
    'merge_tags',
    {
      description: `Merges tag "fromId" into tag "toId": the assignments move to the second, the first is archived. ${CONFIRMATION_NOTE}`,
      inputSchema: { fromId: z.number().int(), toId: z.number().int() },
    },
    (args) => run(() => propose(ctx, 'tag.merge', args)),
  );

  server.registerTool(
    'confirm_operation',
    {
      description:
        'Applies a proposed operation, after the user\'s explicit "yes". For mass operations also pass "count" with the number shown in the preview.',
      inputSchema: { id: z.string(), count: z.number().int().optional() },
      annotations: { destructiveHint: false },
    },
    (args) =>
      run(async () => {
        ensureWebmaster(ctx);
        return confirm(ctx, args.id, { count: args.count });
      }),
  );

  server.registerTool(
    'cancel_operation',
    {
      description: 'Cancels a proposed operation that has not been confirmed yet.',
      inputSchema: { id: z.string() },
    },
    (args) =>
      run(async () => {
        ensureWebmaster(ctx);
        await cancel(ctx, args.id);
        return { cancelled: args.id };
      }),
  );

  return server;
}
