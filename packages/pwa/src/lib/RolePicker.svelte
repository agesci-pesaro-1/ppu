<script lang="ts">
  import { type DemoUser, pickTestUser } from './api.ts';

  interface Props {
    users: DemoUser[];
    message?: string | undefined;
    onpick: () => void;
  }

  let { users, message, onpick }: Props = $props();

  let error = $state<string | null>(null);

  async function pick(email: string) {
    try {
      await pickTestUser(email);
      onpick();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Errore inatteso.';
    }
  }
</script>

<section aria-labelledby="pick-title">
  {#if __BRAND__.logo}
    <div class="emblem"><img src={__BRAND__.logo} alt={__BRAND__.groupName ?? ''} /></div>
  {/if}
  <h1 id="pick-title">Scegli un ruolo</h1>
  <p class="muted">
    Questa è un'anteprima con <strong>dati inventati</strong>. Scegli con quale utente provare
    PPU: ogni ruolo vede e può fare cose diverse.
  </p>
  {#if message || error}
    <p class="error" role="alert">{error ?? message}</p>
  {/if}
  <ul class="role-list">
    {#each users as u (u.email)}
      <li>
        <button type="button" class="glass" onclick={() => pick(u.email)}>
          <span class="name">{u.label}</span>
          <span class="muted description">{u.description}</span>
          <span class="muted email">{u.email}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  /* Group logo on a neutral white background, unaltered (AGESCI manual). */
  .emblem {
    width: 132px;
    height: 132px;
    margin: 24px auto 4px;
    padding: 12px;
    border-radius: 36px;
    background: #ffffff;
    box-shadow:
      0 0 0 6px var(--glass-border),
      0 18px 40px -16px color-mix(in srgb, var(--brand-primary) 60%, transparent);
  }
  .emblem img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  h1 {
    font-size: 1.6rem;
    margin: 20px 0 6px;
    color: var(--primary);
  }
  .role-list {
    list-style: none;
    padding: 0;
    margin: 18px 0;
    display: grid;
    gap: 12px;
  }
  button {
    width: 100%;
    text-align: left;
    border-radius: var(--radius);
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
    transition:
      transform 0.15s,
      background 0.2s;
  }
  button:hover {
    background: var(--glass-strong);
  }
  button:active {
    transform: scale(0.985);
  }
  .name {
    font-weight: 600;
    color: var(--primary);
  }
  .description {
    font-size: 0.9rem;
  }
  .email {
    font-size: 0.75rem;
  }
</style>
