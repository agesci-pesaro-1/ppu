import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { TEST_USER_HEADER } from '../src/identity/index.ts';

let id = 0;
async function rpc(method: string, params: unknown, email?: string, path = '/mcp/admin') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  };
  if (email) headers[TEST_USER_HEADER] = email;
  return exports.default.fetch(
    new Request(`https://ppu.test${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    }),
  );
}

const text = (r: { result: { content: { text: string }[] } }) => r.result.content[0]?.text ?? '';

describe('MCP admin', () => {
  it('without a token answers 401 with the OAuth challenge', async () => {
    const r = await rpc('tools/list', {});
    expect(r.status).toBe(401);
    expect(r.headers.get('WWW-Authenticate')).toMatch(/resource_metadata/);
  });

  it("publishes the server's OAuth metadata", async () => {
    const r = await exports.default.fetch(
      new Request('https://ppu.test/.well-known/oauth-authorization-server'),
    );
    expect(r.status).toBe(200);
    const meta = (await r.json()) as { authorization_endpoint: string };
    expect(meta.authorization_endpoint).toBe('https://ppu.test/authorize');
  });

  it('lists the tools', async () => {
    const r = await rpc('tools/list', {}, 'webmaster@example.org');
    expect(r.status).toBe(200);
    const body = (await r.json()) as { result: { tools: { name: string }[] } };
    expect(body.result.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'whoami',
        'list_users',
        'set_user',
        'list_units',
        'set_unit',
        'list_tags',
        'set_tag_status',
        'merge_tags',
        'confirm_operation',
        'cancel_operation',
      ]),
    );
  });

  it('proposes and confirms a change', async () => {
    const proposal = await rpc(
      'tools/call',
      { name: 'set_tag_status', arguments: { tagId: 8, status: 'ufficiale' } },
      'webmaster@example.org',
    );
    const preview = JSON.parse(text((await proposal.json()) as never)) as { id: string };
    expect(preview.id).toBeTruthy();
    const outcome = await rpc(
      'tools/call',
      { name: 'confirm_operation', arguments: { id: preview.id } },
      'webmaster@example.org',
    );
    expect(JSON.parse(text((await outcome.json()) as never))).toMatchObject({ id: preview.id });
  });

  it('who is not a webmaster gets an error from the tool', async () => {
    const r = await rpc(
      'tools/call',
      { name: 'list_users', arguments: {} },
      'capogruppo@example.org',
    );
    const body = (await r.json()) as { result: { isError: boolean; content: { text: string }[] } };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0]?.text).toMatch(/forbidden/);
  });

  it('an excluded account is rejected', async () => {
    const r = await rpc('tools/list', {}, 'segreteria@example.org');
    expect(r.status).toBe(403);
  });

  it('a domain account not enabled in utenti is rejected', async () => {
    const r = await rpc('tools/list', {}, 'nuovo.capo@example.org');
    expect(r.status).toBe(403);
  });

  it('the endpoint for every leader is not active yet', async () => {
    const r = await rpc('tools/list', {}, 'webmaster@example.org', '/mcp');
    expect(r.status).toBe(404);
  });
});
