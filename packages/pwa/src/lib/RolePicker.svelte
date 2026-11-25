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
        <button type="button" onclick={() => pick(u.email)}>
          <span class="name">{u.label}</span>
          <span class="muted description">{u.description}</span>
          <span class="muted email">{u.email}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  h1 {
    font-size: 1.4rem;
    margin: 20px 0 6px;
  }
  .role-list {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    display: grid;
    gap: 10px;
  }
  button {
    width: 100%;
    text-align: left;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
  }
  button:active {
    background: var(--primary-soft);
  }
  .name {
    font-weight: 600;
  }
  .description {
    font-size: 0.9rem;
  }
  .email {
    font-size: 0.75rem;
  }
</style>
