<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiError, api, type DemoUser, leaveTestUser, type Me } from './lib/api.ts';
  import MemberCard from './lib/MemberCard.svelte';
  import MemberList from './lib/MemberList.svelte';
  import RolePicker from './lib/RolePicker.svelte';

  type View =
    | { kind: 'loading' }
    | { kind: 'ready'; me: Me }
    | { kind: 'pick'; users: DemoUser[]; message?: string }
    | { kind: 'error'; message: string };

  let view = $state<View>({ kind: 'loading' });
  // Hash navigation: #/ list, #/member/12 card.
  let route = $state(location.hash || '#/');

  const cardId = $derived.by(() => {
    const m = /^#\/member\/(\d+)$/.exec(route);
    return m ? Number(m[1]) : null;
  });

  async function start() {
    view = { kind: 'loading' };
    try {
      view = { kind: 'ready', me: await api.me() };
      document.title = `PPU · ${view.me.group}`;
    } catch (e) {
      const error = e instanceof ApiError ? e : new ApiError(0, 'error', 'Errore inatteso.');
      // In preview (test mode) the user picks a fake user; elsewhere Cloudflare
      // Access does the login before the request even gets here.
      if (error.status === 401 || error.status === 403) {
        try {
          const users = await api.demoUsers();
          view = {
            kind: 'pick',
            users,
            ...(error.status === 403 ? { message: error.message } : {}),
          };
          return;
        } catch {
          // test mode not on
        }
      }
      view = { kind: 'error', message: error.message };
    }
  }

  async function switchUser() {
    await leaveTestUser().catch(() => {});
    location.hash = '#/';
    start();
  }

  onMount(() => {
    const update = () => {
      route = location.hash || '#/';
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    start();
    return () => window.removeEventListener('hashchange', update);
  });

  function describeRoles(me: Me): string {
    const r: string[] = [];
    if (me.roles.fullAccess) r.push('accesso completo');
    else if (me.units.length > 0) r.push(`modifica: ${me.units.join(', ')}`);
    if (me.roles.buonaStrada) r.push('Buona Strada');
    if (me.roles.webmaster) r.push('webmaster');
    return r.join(' · ') || 'sola lettura';
  }
</script>

<header class="topbar">
  <div class="topbar-row">
    <a class="brand" href="#/">
      <img src="/icon.svg" alt="" width="28" height="28" />
      <span>{view.kind === 'ready' ? view.me.group : 'PPU'}</span>
    </a>
    {#if view.kind === 'ready'}
      <div class="user">
        <span class="email">{view.me.email}</span>
        <span class="roles">{describeRoles(view.me)}</span>
      </div>
    {/if}
  </div>
  {#if view.kind === 'ready' && view.me.testMode}
    <div class="test-band">
      Anteprima con dati inventati ·
      <button type="button" onclick={switchUser}>cambia utente</button>
    </div>
  {/if}
</header>

<main class="container">
  {#if view.kind === 'loading'}
    <p class="message">Caricamento…</p>
  {:else if view.kind === 'pick'}
    <RolePicker users={view.users} message={view.message} onpick={start} />
  {:else if view.kind === 'error'}
    <div class="message">
      <p class="error">{view.message}</p>
      <button type="button" class="retry" onclick={start}>Riprova</button>
    </div>
  {:else if cardId !== null}
    {#key cardId}
      <MemberCard id={cardId} />
    {/key}
  {:else}
    <MemberList />
  {/if}
</main>

<style>
  .topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--primary);
    color: var(--on-primary);
    padding-top: env(safe-area-inset-top);
  }
  .topbar-row {
    max-width: 720px;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.05rem;
    min-width: 0;
  }
  .brand span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .brand img {
    border-radius: 7px;
    flex: none;
  }
  .user {
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
  .roles {
    opacity: 0.85;
  }
  .test-band {
    background: var(--warning-bg);
    color: var(--warning);
    font-size: 0.8rem;
    text-align: center;
    padding: 4px 16px;
  }
  .test-band button {
    background: none;
    border: 0;
    padding: 0;
    text-decoration: underline;
    cursor: pointer;
    color: inherit;
  }
  .retry {
    margin-top: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
  }
</style>
