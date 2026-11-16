// MCP endpoint (Streamable HTTP, stateless: one server and one transport per
// request, no Durable Object). The identity comes from the OAuth token (or from
// the test header in local and preview) and goes through the same checks as the
// PWA: loadUser on every request, permissions in the services.

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import type { Config } from '../config.ts';
import { createDb } from '../db/index.ts';
import type { Env } from '../env.ts';
import { AppError } from '../errors.ts';
import { loadUser } from '../identity/index.ts';
import type { Context } from '../services/context.ts';
import { createAdminServer } from './admin.ts';
// Operation types register themselves on import.
import '../services/admin/tags.ts';
import '../services/admin/units.ts';
import '../services/admin/users.ts';

export const MCP_PATH = '/mcp';
export const MCP_ADMIN_PATH = '/mcp/admin';

function jsonRpcError(e: AppError): Response {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message: e.message }, id: null },
    { status: e.httpStatus },
  );
}

export async function handleMcp(
  request: Request,
  env: Env,
  config: Config,
  email: string,
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  if (path !== MCP_ADMIN_PATH) {
    // The endpoint for every leader (/mcp) comes in phase 1.
    return jsonRpcError(new AppError('not_found', 'Endpoint MCP non disponibile.'));
  }
  let ctx: Context;
  try {
    const db = createDb(env.DB);
    const user = await loadUser(db, email, config);
    // Changes made through the MCP admin are logged with channel 'admin'.
    ctx = { db, user, channel: 'admin', domain: config.domain };
  } catch (e) {
    if (e instanceof AppError) return jsonRpcError(e);
    throw e;
  }
  const server = createAdminServer(ctx);
  // Without sessionIdGenerator the transport is stateless.
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}
