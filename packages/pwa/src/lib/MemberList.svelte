<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiError, api, type ListEntry, type Unit } from './api.ts';
  import { initials } from './format.ts';

  let units = $state<Unit[]>([]);
  let list = $state<ListEntry[] | null>(null);
  let error = $state<string | null>(null);
  // Filters kept in the session, so they survive a trip to the card and back.
  let q = $state(sessionStorage.getItem('ppu.q') ?? '');
  let selectedUnit = $state(sessionStorage.getItem('ppu.unit') ?? '');

  let currentRequest = 0;
  let pending: ReturnType<typeof setTimeout> | undefined;

  async function load() {
    const n = ++currentRequest;
    sessionStorage.setItem('ppu.q', q);
    sessionStorage.setItem('ppu.unit', selectedUnit);
    try {
      const result = await api.members({ q: q.trim(), unit: selectedUnit });
      if (n === currentRequest) {
        list = result;
        error = null;
      }
    } catch (e) {
      if (n === currentRequest) error = e instanceof ApiError ? e.message : 'Errore inatteso.';
    }
  }

  function search() {
    clearTimeout(pending);
    pending = setTimeout(load, 250);
  }

  function filter(id: string) {
    selectedUnit = selectedUnit === id ? '' : id;
    load();
  }

  onMount(() => {
    api
      .units()
      .then((u) => {
        units = u;
      })
      .catch(() => {});
    load();
    return () => clearTimeout(pending);
  });
</script>

<section aria-labelledby="list-title">
  <h1 id="list-title" class="sr-only">Associati</h1>
  <div class="search">
    <label class="sr-only" for="search-field">Cerca per nome o cognome</label>
    <input
      id="search-field"
      type="search"
      placeholder="Cerca per nome o cognome"
      autocomplete="off"
      bind:value={q}
      oninput={search}
    />
  </div>

  <div class="filters" role="group" aria-label="Filtra per unità">
    <button type="button" class:active={selectedUnit === ''} onclick={() => filter('')}>Tutte</button>
    {#each units as u (u.id)}
      <button
        type="button"
        class:active={selectedUnit === u.id}
        aria-pressed={selectedUnit === u.id}
        onclick={() => filter(u.id)}
      >
        {u.name} <span class="count">{u.members}</span>
      </button>
    {/each}
  </div>

  <p class="read-only-note muted">Sola lettura: le modifiche arriveranno nelle prossime versioni.</p>

  {#if error}
    <p class="message error" role="alert">{error}</p>
  {:else if list === null}
    <p class="message">Caricamento…</p>
  {:else if list.length === 0}
    <p class="message">Nessun associato trovato.</p>
  {:else}
    <p class="muted total">{list.length} {list.length === 1 ? 'associato' : 'associati'}</p>
    <ul class="rows">
      {#each list as a (a.id)}
        <li>
          <a href={`#/member/${a.id}`} class="row">
            <span class="avatar" aria-hidden="true">{initials(a.lastName, a.firstName)}</span>
            <span class="body">
              <span class="name"><strong>{a.lastName}</strong> {a.firstName}</span>
              <span class="details muted">
                {[a.unit?.name ?? 'Senza unità', a.age !== null ? `${a.age} anni` : null, a.status === 'archiviato' ? 'archiviato' : null].filter(Boolean).join(' · ')}
              </span>
              {#if a.tags.length > 0}
                <span class="tags">
                  {#each a.tags as t (t)}<span class="chip">{t}</span>{/each}
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
  .search {
    position: sticky;
    top: 0;
    padding-top: 12px;
    background: var(--background);
  }
  input {
    width: 100%;
    font: inherit;
    font-size: 1rem;
    padding: 12px 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }
  input:focus {
    outline: 2px solid var(--primary);
    outline-offset: 1px;
  }
  .filters {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 12px 0 4px;
    scrollbar-width: none;
  }
  .filters button {
    flex: none;
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 999px;
    padding: 6px 12px;
    font-size: 0.9rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .filters button.active {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--on-primary);
  }
  .count {
    opacity: 0.7;
    font-size: 0.8rem;
  }
  .read-only-note {
    font-size: 0.8rem;
    margin: 6px 0;
  }
  .total {
    font-size: 0.85rem;
    margin: 8px 0 4px;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .rows li + li {
    border-top: 1px solid var(--border);
  }
  .row {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    color: inherit;
    text-decoration: none;
    align-items: flex-start;
  }
  .row:active {
    background: var(--primary-soft);
  }
  .avatar {
    flex: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .details {
    font-size: 0.85rem;
  }
  .tags {
    margin-top: 2px;
  }
</style>
