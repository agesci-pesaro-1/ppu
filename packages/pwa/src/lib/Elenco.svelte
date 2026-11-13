<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ErroreApi, type Unita, type VoceElenco } from './api.ts';
  import { iniziali } from './formato.ts';

  let unita = $state<Unita[]>([]);
  let elenco = $state<VoceElenco[] | null>(null);
  let errore = $state<string | null>(null);
  // Filtri ricordati nella sessione, così tornando dalla scheda non si perdono.
  let q = $state(sessionStorage.getItem('ppu.q') ?? '');
  let unitaScelta = $state(sessionStorage.getItem('ppu.unita') ?? '');

  let richiestaCorrente = 0;
  let attesa: ReturnType<typeof setTimeout> | undefined;

  async function carica() {
    const n = ++richiestaCorrente;
    sessionStorage.setItem('ppu.q', q);
    sessionStorage.setItem('ppu.unita', unitaScelta);
    try {
      const risultato = await api.associati({ q: q.trim(), unita: unitaScelta });
      if (n === richiestaCorrente) {
        elenco = risultato;
        errore = null;
      }
    } catch (e) {
      if (n === richiestaCorrente) errore = e instanceof ErroreApi ? e.message : 'Errore inatteso.';
    }
  }

  function cerca() {
    clearTimeout(attesa);
    attesa = setTimeout(carica, 250);
  }

  function filtra(id: string) {
    unitaScelta = unitaScelta === id ? '' : id;
    carica();
  }

  onMount(() => {
    api
      .unita()
      .then((u) => {
        unita = u;
      })
      .catch(() => {});
    carica();
    return () => clearTimeout(attesa);
  });
</script>

<section aria-labelledby="titolo-elenco">
  <h1 id="titolo-elenco" class="sr-only">Associati</h1>
  <div class="cerca">
    <label class="sr-only" for="campo-cerca">Cerca per nome o cognome</label>
    <input
      id="campo-cerca"
      type="search"
      placeholder="Cerca per nome o cognome"
      autocomplete="off"
      bind:value={q}
      oninput={cerca}
    />
  </div>

  <div class="filtri" role="group" aria-label="Filtra per unità">
    <button type="button" class:attivo={unitaScelta === ''} onclick={() => filtra('')}>Tutte</button>
    {#each unita as u (u.id)}
      <button
        type="button"
        class:attivo={unitaScelta === u.id}
        aria-pressed={unitaScelta === u.id}
        onclick={() => filtra(u.id)}
      >
        {u.nome} <span class="conteggio">{u.associati}</span>
      </button>
    {/each}
  </div>

  <p class="nota-lettura tenue">Sola lettura: le modifiche arriveranno nelle prossime versioni.</p>

  {#if errore}
    <p class="messaggio errore" role="alert">{errore}</p>
  {:else if elenco === null}
    <p class="messaggio">Caricamento…</p>
  {:else if elenco.length === 0}
    <p class="messaggio">Nessun associato trovato.</p>
  {:else}
    <p class="tenue totale">{elenco.length} {elenco.length === 1 ? 'associato' : 'associati'}</p>
    <ul class="lista">
      {#each elenco as a (a.id)}
        <li>
          <a href={`#/associato/${a.id}`} class="riga">
            <span class="avatar" aria-hidden="true">{iniziali(a.cognome, a.nome)}</span>
            <span class="corpo">
              <span class="nome"><strong>{a.cognome}</strong> {a.nome}</span>
              <span class="dettagli tenue">
                {[a.unita?.nome ?? 'Senza unità', a.eta !== null ? `${a.eta} anni` : null, a.stato === 'archiviato' ? 'archiviato' : null].filter(Boolean).join(' · ')}
              </span>
              {#if a.tag.length > 0}
                <span class="tag">
                  {#each a.tag as t (t)}<span class="chip">{t}</span>{/each}
                </span>
              {/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .cerca {
    position: sticky;
    top: 0;
    padding-top: 12px;
    background: var(--sfondo);
  }
  input {
    width: 100%;
    font: inherit;
    font-size: 1rem;
    padding: 12px 16px;
    border-radius: 999px;
    border: 1px solid var(--bordo);
    background: var(--superficie);
    color: var(--testo);
  }
  input:focus {
    outline: 2px solid var(--primario);
    outline-offset: 1px;
  }
  .filtri {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 12px 0 4px;
    scrollbar-width: none;
  }
  .filtri button {
    flex: none;
    border: 1px solid var(--bordo);
    background: var(--superficie);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .filtri button.attivo {
    background: var(--primario);
    border-color: var(--primario);
    color: var(--sul-primario);
  }
  .conteggio {
    opacity: 0.7;
    font-size: 0.8rem;
  }
  .nota-lettura {
    font-size: 0.8rem;
    margin: 6px 0;
  }
  .totale {
    font-size: 0.85rem;
    margin: 8px 0 4px;
  }
  .lista {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--superficie);
    border: 1px solid var(--bordo);
    border-radius: var(--raggio);
    overflow: hidden;
  }
  .lista li + li {
    border-top: 1px solid var(--bordo);
  }
  .riga {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    color: inherit;
    text-decoration: none;
    align-items: flex-start;
  }
  .riga:active {
    background: var(--primario-tenue);
  }
  .avatar {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primario-tenue);
    color: var(--primario);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .corpo {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .dettagli {
    font-size: 0.85rem;
  }
  .tag {
    margin-top: 2px;
  }
</style>
