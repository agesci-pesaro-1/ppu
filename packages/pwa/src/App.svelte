<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ErroreApi, esciUtenteTest, type Io, type UtenteDemo } from './lib/api.ts';
  import Elenco from './lib/Elenco.svelte';
  import SceltaRuolo from './lib/SceltaRuolo.svelte';
  import Scheda from './lib/Scheda.svelte';

  type Stato =
    | { tipo: 'caricamento' }
    | { tipo: 'pronto'; io: Io }
    | { tipo: 'scelta'; utenti: UtenteDemo[]; messaggio?: string }
    | { tipo: 'errore'; messaggio: string };

  let stato = $state<Stato>({ tipo: 'caricamento' });
  // Navigazione con l'hash: #/ elenco, #/associato/12 scheda.
  let percorso = $state(location.hash || '#/');

  const idScheda = $derived.by(() => {
    const m = /^#\/associato\/(\d+)$/.exec(percorso);
    return m ? Number(m[1]) : null;
  });

  async function avvia() {
    stato = { tipo: 'caricamento' };
    try {
      stato = { tipo: 'pronto', io: await api.io() };
      document.title = `PPU · ${stato.io.gruppo}`;
    } catch (e) {
      const errore = e instanceof ErroreApi ? e : new ErroreApi(0, 'errore', 'Errore inatteso.');
      // In preview (modalità di test) si sceglie un utente finto; altrove il
      // login lo fa Cloudflare Access prima ancora di arrivare qui.
      if (errore.stato === 401 || errore.stato === 403) {
        try {
          const utenti = await api.utentiDemo();
          stato = {
            tipo: 'scelta',
            utenti,
            ...(errore.stato === 403 ? { messaggio: errore.message } : {}),
          };
          return;
        } catch {
          // modalità di test non attiva
        }
      }
      stato = { tipo: 'errore', messaggio: errore.message };
    }
  }

  async function cambiaUtente() {
    await esciUtenteTest().catch(() => {});
    location.hash = '#/';
    avvia();
  }

  onMount(() => {
    const aggiorna = () => {
      percorso = location.hash || '#/';
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', aggiorna);
    avvia();
    return () => window.removeEventListener('hashchange', aggiorna);
  });

  function descriviRuoli(io: Io): string {
    const r: string[] = [];
    if (io.ruoli.accessoCompleto) r.push('accesso completo');
    else if (io.unita.length > 0) r.push(`modifica: ${io.unita.join(', ')}`);
    if (io.ruoli.buonaStrada) r.push('Buona Strada');
    if (io.ruoli.webmaster) r.push('webmaster');
    return r.join(' · ') || 'sola lettura';
  }
</script>

<header class="testata">
  <div class="testata-riga">
    <a class="marchio" href="#/">
      <img src="/icona.svg" alt="" width="28" height="28" />
      <span>{stato.tipo === 'pronto' ? stato.io.gruppo : 'PPU'}</span>
    </a>
    {#if stato.tipo === 'pronto'}
      <div class="utente">
        <span class="email">{stato.io.email}</span>
        <span class="ruoli">{descriviRuoli(stato.io)}</span>
      </div>
    {/if}
  </div>
  {#if stato.tipo === 'pronto' && stato.io.modalitaTest}
    <div class="banda-test">
      Anteprima con dati inventati ·
      <button type="button" onclick={cambiaUtente}>cambia utente</button>
    </div>
  {/if}
</header>

<main class="contenitore">
  {#if stato.tipo === 'caricamento'}
    <p class="messaggio">Caricamento…</p>
  {:else if stato.tipo === 'scelta'}
    <SceltaRuolo utenti={stato.utenti} messaggio={stato.messaggio} onscelta={avvia} />
  {:else if stato.tipo === 'errore'}
    <div class="messaggio">
      <p class="errore">{stato.messaggio}</p>
      <button type="button" class="riprova" onclick={avvia}>Riprova</button>
    </div>
  {:else if idScheda !== null}
    {#key idScheda}
      <Scheda id={idScheda} />
    {/key}
  {:else}
    <Elenco />
  {/if}
</main>

<style>
  .testata {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--primario);
    color: var(--sul-primario);
    padding-top: env(safe-area-inset-top);
  }
  .testata-riga {
    max-width: 720px;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .marchio {
    display: flex;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.05rem;
    min-width: 0;
  }
  .marchio span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .marchio img {
    border-radius: 7px;
    flex: none;
  }
  .utente {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.75rem;
    min-width: 0;
    text-align: right;
  }
  .email {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 52vw;
  }
  .ruoli {
    opacity: 0.85;
  }
  .banda-test {
    background: var(--avviso-sfondo);
    color: var(--avviso);
    font-size: 0.8rem;
    text-align: center;
    padding: 4px 16px;
  }
  .banda-test button {
    background: none;
    border: 0;
    padding: 0;
    text-decoration: underline;
    cursor: pointer;
    color: inherit;
  }
  .riprova {
    margin-top: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid var(--bordo);
    background: var(--superficie);
  }
</style>
