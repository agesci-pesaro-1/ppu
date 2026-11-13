<script lang="ts">
  import { scegliUtenteTest, type UtenteDemo } from './api.ts';

  interface Props {
    utenti: UtenteDemo[];
    messaggio?: string | undefined;
    onscelta: () => void;
  }

  let { utenti, messaggio, onscelta }: Props = $props();

  let errore = $state<string | null>(null);

  async function scegli(email: string) {
    try {
      await scegliUtenteTest(email);
      onscelta();
    } catch (e) {
      errore = e instanceof Error ? e.message : 'Errore inatteso.';
    }
  }
</script>

<section aria-labelledby="titolo-scelta">
  <h1 id="titolo-scelta">Scegli un ruolo</h1>
  <p class="tenue">
    Questa è un'anteprima con <strong>dati inventati</strong>. Scegli con quale utente provare
    PPU: ogni ruolo vede e può fare cose diverse.
  </p>
  {#if messaggio || errore}
    <p class="errore" role="alert">{errore ?? messaggio}</p>
  {/if}
  <ul class="elenco-ruoli">
    {#each utenti as u (u.email)}
      <li>
        <button type="button" onclick={() => scegli(u.email)}>
          <span class="nome">{u.etichetta}</span>
          <span class="tenue descrizione">{u.descrizione}</span>
          <span class="tenue email">{u.email}</span>
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
  .elenco-ruoli {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    display: grid;
    gap: 10px;
  }
  button {
    width: 100%;
    text-align: left;
    background: var(--superficie);
    border: 1px solid var(--bordo);
    border-radius: var(--raggio);
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    cursor: pointer;
  }
  button:active {
    background: var(--primario-tenue);
  }
  .nome {
    font-weight: 600;
  }
  .descrizione {
    font-size: 0.9rem;
  }
  .email {
    font-size: 0.75rem;
  }
</style>
