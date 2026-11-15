import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { HEADER_UTENTE_TEST } from '../src/identita/index.ts';

let id = 0;
async function rpc(metodo: string, params: unknown, email?: string, percorso = '/mcp/admin') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  };
  if (email) headers[HEADER_UTENTE_TEST] = email;
  return exports.default.fetch(
    new Request(`https://ppu.test${percorso}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: metodo, params }),
    }),
  );
}

const testo = (r: { result: { content: { text: string }[] } }) => r.result.content[0]?.text ?? '';

describe('MCP admin', () => {
  it('senza token risponde 401 con la sfida OAuth', async () => {
    const r = await rpc('tools/list', {});
    expect(r.status).toBe(401);
    expect(r.headers.get('WWW-Authenticate')).toMatch(/resource_metadata/);
  });

  it('pubblica i metadati OAuth del server', async () => {
    const r = await exports.default.fetch(
      new Request('https://ppu.test/.well-known/oauth-authorization-server'),
    );
    expect(r.status).toBe(200);
    const meta = (await r.json()) as { authorization_endpoint: string };
    expect(meta.authorization_endpoint).toBe('https://ppu.test/authorize');
  });

  it('elenca gli strumenti', async () => {
    const r = await rpc('tools/list', {}, 'webmaster@example.org');
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { result: { tools: { name: string }[] } };
    expect(corpo.result.tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'elenca_utenti',
        'imposta_utente',
        'elenca_unita',
        'imposta_unita',
        'elenca_tag',
        'cambia_stato_tag',
        'unisci_tag',
        'conferma_operazione',
        'annulla_operazione',
      ]),
    );
  });

  it('propone e conferma una modifica', async () => {
    const proposta = await rpc(
      'tools/call',
      { name: 'cambia_stato_tag', arguments: { tag_id: 8, stato: 'ufficiale' } },
      'webmaster@example.org',
    );
    const anteprima = JSON.parse(testo((await proposta.json()) as never)) as { id: string };
    expect(anteprima.id).toBeTruthy();
    const esito = await rpc(
      'tools/call',
      { name: 'conferma_operazione', arguments: { id: anteprima.id } },
      'webmaster@example.org',
    );
    expect(JSON.parse(testo((await esito.json()) as never))).toMatchObject({ id: anteprima.id });
  });

  it('chi non è webmaster riceve un errore dallo strumento', async () => {
    const r = await rpc(
      'tools/call',
      { name: 'elenca_utenti', arguments: {} },
      'capogruppo@example.org',
    );
    const corpo = (await r.json()) as { result: { isError: boolean; content: { text: string }[] } };
    expect(corpo.result.isError).toBe(true);
    expect(corpo.result.content[0]?.text).toMatch(/permesso_negato/);
  });

  it('un account escluso non entra', async () => {
    const r = await rpc('tools/list', {}, 'segreteria@example.org');
    expect(r.status).toBe(403);
  });

  it("l'endpoint per tutti i capi non è ancora attivo", async () => {
    const r = await rpc('tools/list', {}, 'webmaster@example.org', '/mcp');
    expect(r.status).toBe(404);
  });
});
