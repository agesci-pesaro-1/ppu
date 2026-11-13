<script lang="ts">
  import { onMount } from 'svelte';
  import { api, ErroreApi, type Scheda } from './api.ts';
  import { data, iniziali, relazione, telefonoHref } from './formato.ts';

  interface Props {
    id: number;
  }

  let { id }: Props = $props();
  let scheda = $state<Scheda | null>(null);
  let errore = $state<string | null>(null);

  onMount(() => {
    api
      .scheda(id)
      .then((s) => {
        scheda = s;
        document.title = `${s.nome} ${s.cognome} · PPU`;
      })
      .catch((e) => {
        errore = e instanceof ErroreApi ? e.message : 'Errore inatteso.';
      });
  });

  const STATO_PRESENZA: Record<string, string> = {
    presente: 'Presente',
    assente: 'Assente',
    giustificato: 'Giustificato',
  };
</script>

<a class="indietro" href="#/">← Elenco</a>

{#if errore}
  <p class="messaggio errore" role="alert">{errore}</p>
{:else if scheda === null}
  <p class="messaggio">Caricamento…</p>
{:else}
  {@const s = scheda}
  <section class="intestazione">
    <span class="avatar" aria-hidden="true">{iniziali(s.cognome, s.nome)}</span>
    <div>
      <h1>{s.nome} {s.cognome}</h1>
      <p class="tenue">
        {[s.unita?.nome ?? 'Senza unità', s.eta !== null ? `${s.eta} anni` : null, s.eCapo ? 'capo' : null].filter(Boolean).join(' · ')}
        {#if s.stato === 'archiviato'}<span class="chip archiviato">archiviato</span>{/if}
      </p>
      {#if s.tag.length > 0}
        <p>{#each s.tag as t (t.nome)}<span class="chip" title={t.tipo}>{t.nome}</span>{/each}</p>
      {/if}
    </div>
  </section>

  <p class="nota-lettura tenue">
    Sola lettura{#if s.puoModificare} · potrai modificare questa scheda quando arriveranno le modifiche{/if}.
  </p>

  <div class="scheda-card">
    <h2>Contatti</h2>
    {#if !s.contatti.cellulare && !s.contatti.telefonoCasa && !s.contatti.email}
      <p class="tenue">Nessun contatto personale.</p>
    {/if}
    <dl>
      {#if s.contatti.cellulare}
        <dt>Cellulare</dt>
        <dd><a href={telefonoHref(s.contatti.cellulare)}>{s.contatti.cellulare}</a></dd>
      {/if}
      {#if s.contatti.telefonoCasa}
        <dt>Telefono casa</dt>
        <dd><a href={telefonoHref(s.contatti.telefonoCasa)}>{s.contatti.telefonoCasa}</a></dd>
      {/if}
      {#if s.contatti.email}
        <dt>Email</dt>
        <dd><a href={`mailto:${s.contatti.email}`}>{s.contatti.email}</a></dd>
      {/if}
    </dl>
  </div>

  {#if s.tutori.length > 0}
    <div class="scheda-card">
      <h2>Genitori e tutori</h2>
      {#each s.tutori as t (t.id)}
        <div class="tutore">
          <p>
            <strong>{t.nome} {t.cognome}</strong>
            <span class="tenue">· {t.relazione}</span>
            {#if t.riceveComunicazioni}<span class="chip">riceve comunicazioni</span>{/if}
          </p>
          <p class="contatti-tutore">
            {#if t.cellulare}<a href={telefonoHref(t.cellulare)}>{t.cellulare}</a>{/if}
            {#if t.email}<a href={`mailto:${t.email}`}>{t.email}</a>{/if}
            {#if t.associatoCollegatoId}<a href={`#/associato/${t.associatoCollegatoId}`}>scheda</a>{/if}
          </p>
        </div>
      {/each}
    </div>
  {/if}

  <div class="scheda-card">
    <h2>Anagrafica</h2>
    <dl>
      {#if s.dataNascita}
        <dt>Nascita</dt>
        <dd>{data(s.dataNascita)}{#if s.luogoNascita}, {s.luogoNascita}{/if}</dd>
      {/if}
      {#if s.residenza.indirizzo || s.residenza.comune}
        <dt>Residenza</dt>
        <dd>
          {[
            s.residenza.indirizzo,
            [s.residenza.cap, s.residenza.comune].filter(Boolean).join(' '),
          ]
            .filter(Boolean)
            .join(', ')}{s.residenza.provincia ? ` (${s.residenza.provincia})` : ''}
        </dd>
      {/if}
      {#if s.codiceCensimento}
        <dt>Codice censimento</dt>
        <dd>{s.codiceCensimento}</dd>
      {/if}
    </dl>
  </div>

  <div class="scheda-card">
    <h2>Privacy</h2>
    <ul class="consensi">
      <li class:si={s.privacy.informativa} class:no={!s.privacy.informativa}>
        Informativa {s.privacy.informativa ? 'sì' : 'no'}{s.privacy.informativaData ? ` (${data(s.privacy.informativaData)})` : ''}
      </li>
      <li class:si={s.privacy.consenso2a} class:no={!s.privacy.consenso2a}>2A {s.privacy.consenso2a ? 'sì' : 'no'}</li>
      <li class:si={s.privacy.consenso2b} class:no={!s.privacy.consenso2b}>2B {s.privacy.consenso2b ? 'sì' : 'no'}</li>
      <li class:si={s.privacy.consenso2c} class:no={!s.privacy.consenso2c}>2C {s.privacy.consenso2c ? 'sì' : 'no'}</li>
    </ul>
    {#if s.privacy.note}<p class="tenue">{s.privacy.note}</p>{/if}
  </div>

  {#if s.relazioni.length > 0}
    <div class="scheda-card">
      <h2>Relazioni</h2>
      <ul class="semplice">
        {#each s.relazioni as r (`${r.tipo}-${r.associatoId}`)}
          <li class="in-riga">{relazione(r.tipo)}{' '}<a href={`#/associato/${r.associatoId}`}>{r.nome} {r.cognome}</a></li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="scheda-card">
    <h2>Progressione</h2>
    {#if s.progressione.length === 0}
      <p class="tenue">Nessuna voce.</p>
    {:else}
      <ul class="semplice">
        {#each s.progressione as p, i (i)}
          <li>
            <strong>{p.descrizione}</strong>
            <span class="tenue">{[p.tipo, p.data ? data(p.data) : null].filter(Boolean).join(' · ')}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="scheda-card">
    <h2>Presenze dell'anno</h2>
    <p>
      <span class="chip">{s.presenze.conteggi.presente} presenze</span>
      <span class="chip">{s.presenze.conteggi.assente} assenze</span>
      <span class="chip">{s.presenze.conteggi.giustificato} giustificate</span>
    </p>
    {#if s.presenze.ultime.length > 0}
      <ul class="semplice">
        {#each s.presenze.ultime as p, i (i)}
          <li>
            <span class="in-riga">{`${data(p.data)} · ${p.tipo} ${p.unita.toLowerCase()} · `}<strong>{STATO_PRESENZA[p.stato] ?? p.stato}</strong>{#if p.motivazione}<span class="tenue">{` (${p.motivazione})`}</span>{/if}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if s.storicoUnita.length > 0}
    <div class="scheda-card">
      <h2>Storico unità</h2>
      <ul class="semplice">
        {#each s.storicoUnita as st, i (i)}
          <li class="in-riga"><span class="tenue">{st.anno}</span>{' · '}{st.unita}</li>
        {/each}
      </ul>
    </div>
  {/if}
{/if}

<style>
  .indietro {
    display: inline-block;
    margin: 12px 0 0;
    text-decoration: none;
    font-weight: 600;
  }
  .intestazione {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-top: 12px;
  }
  .intestazione h1 {
    font-size: 1.35rem;
    margin: 0;
  }
  .intestazione p {
    margin: 2px 0;
  }
  .avatar {
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primario-tenue);
    color: var(--primario);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1.2rem;
  }
  .archiviato {
    background: var(--avviso-sfondo);
    color: var(--avviso);
  }
  .nota-lettura {
    font-size: 0.8rem;
    margin: 8px 0 0;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 6px 12px;
    margin: 0;
  }
  dt {
    color: var(--testo-tenue);
    font-size: 0.9rem;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .tutore + .tutore {
    border-top: 1px solid var(--bordo);
    margin-top: 8px;
    padding-top: 8px;
  }
  .tutore p {
    margin: 2px 0;
  }
  .contatti-tutore {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    overflow-wrap: anywhere;
  }
  .consensi {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .consensi li {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.85rem;
    border: 1px solid currentColor;
  }
  .si {
    color: var(--si);
  }
  .no {
    color: var(--no);
  }
  .semplice {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .semplice li {
    display: flex;
    flex-direction: column;
  }
  .semplice li.in-riga {
    display: block;
  }
</style>
