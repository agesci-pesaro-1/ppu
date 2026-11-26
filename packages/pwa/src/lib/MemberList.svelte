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

  // Branch colour (AGESCI manual) for avatars and filters.
  const branchOf = $derived(new Map(units.map((u) => [u.id, u.branch])));
  const KNOWN_BRANCHES = new Set(['lc', 'eg', 'rs', 'coca']);
  function branchColor(unitId: string | undefined): string {
    const b = unitId ? branchOf.get(unitId) : undefined;
    return b && KNOWN_BRANCHES.has(b) ? `var(--branch-${b})` : 'var(--primary)';
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
        style:--branch={branchColor(u.id)}
      >
        <span class="dot" aria-hidden="true"></span>{u.name} <span class="count">{u.members}</span>
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
    <ul class="rows glass">
      {#each list as a (a.id)}
        <li>
          <a href={`#/member/${a.id}`} class="row">
            <span class="avatar" aria-hidden="true" style:--branch={branchColor(a.unit?.id)}>{initials(a.lastName, a.firstName)}</span>
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
    padding-top: 12px;
  }
  input {
    width: 100%;
    font: inherit;
    font-size: 1rem;
    padding: 13px 18px 13px 44px;
    border-radius: 999px;
    border: 1px solid var(--glass-border);
    background: var(--glass)
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23857aa0' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E")
      no-repeat 16px center / 18px;
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow:
      inset 0 1px 0 var(--glass-highlight),
      var(--glass-shadow);
    color: var(--text);
  }
  input::placeholder {
    color: var(--text-muted);
  }
  input:focus {
    outline: 3px solid var(--focus-ring);
    outline-offset: 1px;
  }
  .filters {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 14px 2px 6px;
    margin: 0 -2px;
    scrollbar-width: none;
  }
  .filters button {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--glass-border);
    background: var(--glass);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
    border-radius: 999px;
    padding: 7px 14px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.2s,
      color 0.2s,
      transform 0.15s;
  }
  .filters button:active {
    transform: scale(0.96);
  }
  .filters button.active {
    background: var(--filled);
    border-color: transparent;
    color: var(--on-filled);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 0.25),
      0 6px 16px -6px color-mix(in srgb, var(--brand-primary) 70%, transparent);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--branch);
    box-shadow: 0 0 0 2px rgb(255 255 255 / 0.6);
  }
  .count {
    opacity: 0.7;
    font-size: 0.78rem;
  }
  .read-only-note {
    font-size: 0.78rem;
    margin: 6px 2px;
  }
  .total {
    font-size: 0.82rem;
    margin: 10px 4px 6px;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    border-radius: var(--radius);
    overflow: hidden;
  }
  .rows li + li {
    border-top: 1px solid var(--separator);
  }
  .row {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    color: inherit;
    text-decoration: none;
    align-items: center;
    transition: background 0.15s;
  }
  .row:hover {
    background: var(--primary-soft);
  }
  .row:active {
    background: color-mix(in srgb, var(--brand-primary) 16%, transparent);
  }
  .avatar {
    flex: none;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 25%, var(--glass-highlight), transparent 60%),
      color-mix(in srgb, var(--branch) 30%, var(--glass-strong));
    border: 2px solid var(--branch);
    color: var(--text);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 0.85rem;
  }
  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .details {
    font-size: 0.84rem;
  }
  .tags {
    margin-top: 3px;
  }
</style>
