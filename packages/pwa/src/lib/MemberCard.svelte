<script lang="ts">
  import { onMount } from 'svelte';
  import { ApiError, api, type MemberCard } from './api.ts';
  import { date, initials, phoneHref, relationshipLabel } from './format.ts';

  interface Props {
    id: number;
  }

  let { id }: Props = $props();
  let card = $state<MemberCard | null>(null);
  let error = $state<string | null>(null);

  onMount(() => {
    api
      .member(id)
      .then((c) => {
        card = c;
        document.title = `${c.firstName} ${c.lastName} · PPU`;
      })
      .catch((e) => {
        error = e instanceof ApiError ? e.message : 'Errore inatteso.';
      });
  });

  // Labels shown to the user, by `presenze.stato`.
  const ATTENDANCE_LABELS: Record<string, string> = {
    presente: 'Presente',
    assente: 'Assente',
    giustificato: 'Giustificato',
  };
</script>

<a class="back" href="#/">← Elenco</a>

{#if error}
  <p class="message error" role="alert">{error}</p>
{:else if card === null}
  <p class="message">Caricamento…</p>
{:else}
  {@const c = card}
  <section class="heading">
    <span class="avatar" aria-hidden="true">{initials(c.lastName, c.firstName)}</span>
    <div>
      <h1>{c.firstName} {c.lastName}</h1>
      <p class="muted">
        {[c.unit?.name ?? 'Senza unità', c.age !== null ? `${c.age} anni` : null, c.isLeader ? 'capo' : null].filter(Boolean).join(' · ')}
        {#if c.status === 'archiviato'}<span class="chip archived">archiviato</span>{/if}
      </p>
      {#if c.tags.length > 0}
        <p>{#each c.tags as t (t.name)}<span class="chip" title={t.type}>{t.name}</span>{/each}</p>
      {/if}
    </div>
  </section>

  <p class="read-only-note muted">
    Sola lettura{#if c.canEdit} · potrai modificare questa scheda quando arriveranno le modifiche{/if}.
  </p>

  <div class="card">
    <h2>Contatti</h2>
    {#if !c.contacts.mobile && !c.contacts.email}
      <p class="muted">Nessun contatto personale.</p>
    {/if}
    <dl>
      {#if c.contacts.mobile}
        <dt>Cellulare</dt>
        <dd><a href={phoneHref(c.contacts.mobile)}>{c.contacts.mobile}</a></dd>
      {/if}
      {#if c.contacts.email}
        <dt>Email</dt>
        <dd><a href={`mailto:${c.contacts.email}`}>{c.contacts.email}</a></dd>
      {/if}
    </dl>
    {#if !c.contacts.receivesCommunications}
      <p><span class="chip">non riceve le comunicazioni</span></p>
    {/if}
  </div>

  {#if c.guardians.length > 0}
    <div class="card">
      <h2>Genitori e tutori</h2>
      {#each c.guardians as g (g.id)}
        <div class="guardian">
          <p>
            <strong>{g.firstName} {g.lastName}</strong>
            <span class="muted">· {g.role}</span>
          </p>
          <p class="guardian-contacts">
            {#if g.mobile}<a href={phoneHref(g.mobile)}>{g.mobile}</a>{/if}
            {#if g.email}<a href={`mailto:${g.email}`}>{g.email}</a>{/if}
            {#if g.linkedMemberId}<a href={`#/member/${g.linkedMemberId}`}>scheda</a>{/if}
          </p>
        </div>
      {/each}
    </div>
  {/if}

  <div class="card">
    <h2>Anagrafica</h2>
    <dl>
      {#if c.birthDate}
        <dt>Nascita</dt>
        <dd>{date(c.birthDate)}{#if c.birthPlace}, {c.birthPlace}{/if}</dd>
      {/if}
      {#if c.censusCode}
        <dt>Codice censimento</dt>
        <dd>{c.censusCode}</dd>
      {/if}
    </dl>
  </div>

  <div class="card">
    <h2>Privacy</h2>
    <ul class="consents">
      <li class:yes={c.privacy.privacyNotice} class:no={!c.privacy.privacyNotice}>
        Informativa {c.privacy.privacyNotice ? 'sì' : 'no'}{c.privacy.privacyNoticeDate ? ` (${date(c.privacy.privacyNoticeDate)})` : ''}
      </li>
      <li class:yes={c.privacy.consent2a} class:no={!c.privacy.consent2a}>2A {c.privacy.consent2a ? 'sì' : 'no'}</li>
      <li class:yes={c.privacy.consent2b} class:no={!c.privacy.consent2b}>2B {c.privacy.consent2b ? 'sì' : 'no'}</li>
      <li class:yes={c.privacy.consent2c} class:no={!c.privacy.consent2c}>2C {c.privacy.consent2c ? 'sì' : 'no'}</li>
    </ul>
    {#if c.privacy.notes}<p class="muted">{c.privacy.notes}</p>{/if}
  </div>

  {#if c.relationships.length > 0}
    <div class="card">
      <h2>Relazioni</h2>
      <ul class="plain">
        {#each c.relationships as r (`${r.type}-${r.memberId}`)}
          <li class="inline">{relationshipLabel(r.type)}{' '}<a href={`#/member/${r.memberId}`}>{r.firstName} {r.lastName}</a></li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="card">
    <h2>Progressione</h2>
    {#if c.progression.length === 0}
      <p class="muted">Nessuna voce.</p>
    {:else}
      <ul class="plain">
        {#each c.progression as p, i (i)}
          <li>
            <strong>{p.description}</strong>
            <span class="muted">{[p.type, p.date ? date(p.date) : null].filter(Boolean).join(' · ')}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="card">
    <h2>Presenze dell'anno</h2>
    <p>
      <span class="chip">{c.attendance.counts.presente} presenze</span>
      <span class="chip">{c.attendance.counts.assente} assenze</span>
      <span class="chip">{c.attendance.counts.giustificato} giustificate</span>
    </p>
    {#if c.attendance.latest.length > 0}
      <ul class="plain">
        {#each c.attendance.latest as p, i (i)}
          <li>
            <span class="inline">{`${date(p.date)} · ${p.type} ${p.unit.toLowerCase()} · `}<strong>{ATTENDANCE_LABELS[p.status] ?? p.status}</strong>{#if p.reason}<span class="muted">{` (${p.reason})`}</span>{/if}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if c.unitHistory.length > 0}
    <div class="card">
      <h2>Storico unità</h2>
      <ul class="plain">
        {#each c.unitHistory as h, i (i)}
          <li class="inline"><span class="muted">{h.year}</span>{' · '}{h.unit}</li>
        {/each}
      </ul>
    </div>
  {/if}
{/if}

<style>
  .back {
    display: inline-block;
    margin: 12px 0 0;
    text-decoration: none;
    font-weight: 600;
  }
  .heading {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-top: 12px;
  }
  .heading h1 {
    font-size: 1.35rem;
    margin: 0;
  }
  .heading p {
    margin: 2px 0;
  }
  .avatar {
    flex: none;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary-soft);
    color: var(--primary);
    display: grid;
    place-items: center;
    font-weight: 700;
    font-size: 1.2rem;
  }
  .archived {
    background: var(--warning-bg);
    color: var(--warning);
  }
  .read-only-note {
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
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .guardian + .guardian {
    border-top: 1px solid var(--border);
    margin-top: 8px;
    padding-top: 8px;
  }
  .guardian p {
    margin: 2px 0;
  }
  .guardian-contacts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    overflow-wrap: anywhere;
  }
  .consents {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .consents li {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.85rem;
    border: 1px solid currentColor;
  }
  .yes {
    color: var(--yes);
  }
  .no {
    color: var(--no);
  }
  .plain {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
  }
  .plain li {
    display: flex;
    flex-direction: column;
  }
  .plain li.inline {
    display: block;
  }
</style>
