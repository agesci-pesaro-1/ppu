# 0012. Strumenti di sviluppo: Node 26, pnpm, Biome

- **Stato:** Proposta
- **Data:** 2026-11-12

## Contesto

Il repository conterrà più parti (Worker, PWA, codice condiviso) sviluppate da volontari, anche in GitHub Codespaces. Servono un runtime, un gestore di pacchetti e strumenti di qualità del codice semplici da installare e veloci in pipeline.

## Decisione

- **Node.js 26** (LTS) per sviluppo, build e test, fissato in `.nvmrc` e `engines`.
- **pnpm** come gestore di pacchetti, con versione fissata in `packageManager` (Corepack) e workspace in `packages/*`.
- **Biome** per lint e formattazione di TypeScript, JSON e CSS, con `pnpm check` in pipeline. I file Markdown non sono formattati automaticamente.

## Alternative scartate

- **npm o Yarn:** workspace meno rigorosi (npm) o configurazione più pesante (Yarn PnP).
- **ESLint + Prettier:** due strumenti e più configurazione per lo stesso risultato; da riconsiderare se servissero regole specifiche per Svelte non coperte da Biome.

## Conseguenze

- Un solo comando (`pnpm check`) per lint e formattazione.
- Le versioni degli strumenti sono fissate nel repository e aggiornate con pull request dedicate.
- Il supporto di Biome ai componenti Svelte va verificato quando nasce la PWA.
