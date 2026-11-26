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
  <div class="topbar-row glass">
    <a class="brand" href="#/">
      <span class="logo" class:group-logo={!!__BRAND__.logo}>
        <img src={__BRAND__.logo ?? __BRAND__.icon} alt="" />
      </span>
      <span class="brand-text">
        <span class="title">{view.kind === 'ready' ? view.me.group : (__BRAND__.groupName ?? 'PPU')}</span>
        <span class="subtitle">Progressione Personale Unitaria</span>
      </span>
    </a>
    {#if view.kind === 'ready'}
      <div class="user" title={view.me.email}>
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
      <button type="button" class="retry glass" onclick={start}>Riprova</button>
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
    max-width: 752px;
    margin: 0 auto;
    padding: calc(10px + env(safe-area-inset-top)) 16px 4px;
  }
  .topbar-row {
    border-radius: var(--radius);
    padding: 8px 14px 8px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--glass-strong);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
    min-width: 0;
  }
  /* The group logo must not be altered (AGESCI manual): it sits on a neutral white background. */
  .logo {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    overflow: hidden;
    display: grid;
    place-items: center;
    box-shadow: 0 2px 8px -2px rgb(33 22 56 / 0.25);
  }
  .group-logo {
    background: #ffffff;
    padding: 3px;
  }
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    font-family: var(--font-heading);
    font-weight: 700;
    font-size: 1.1rem;
    line-height: 1.15;
    color: var(--primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .subtitle {
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .user {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.72rem;
    min-width: 0;
    text-align: right;
  }
  .email {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 42vw;
  }
  .roles {
    color: var(--text-muted);
  }
  .test-band {
    margin-top: 8px;
    border-radius: 999px;
    background: var(--warning-bg);
    -webkit-backdrop-filter: var(--glass-blur);
    backdrop-filter: var(--glass-blur);
    border: 1px solid color-mix(in srgb, var(--brand-accent) 50%, transparent);
    color: var(--warning);
    font-size: 0.78rem;
    font-weight: 500;
    text-align: center;
    padding: 5px 16px;
  }
  .test-band button {
    background: none;
    border: 0;
    padding: 0;
    text-decoration: underline;
    cursor: pointer;
    color: inherit;
    font-weight: 700;
  }
  .retry {
    margin-top: 8px;
    padding: 10px 20px;
    border-radius: 999px;
    cursor: pointer;
  }
  @media (max-width: 420px) {
    .subtitle {
      display: none;
    }
  }
</style>
