# PWA PPU

Interfaccia per i capi, in Svelte 5 + Vite, installabile sul telefono. È servita dallo stesso Worker dell'API (ADR 0014): stessa origine, nessun CORS.

## Cosa c'è

- **Elenco associati**: ricerca per nome o cognome, filtro per unità, tag dell'anno.
- **Scheda**: contatti, genitori e tutori, anagrafica, consensi privacy, relazioni, progressione, presenze, storico unità. Mai codici fiscali.
- **Sola lettura** per ora: le modifiche (con anteprima e conferma) arriveranno nelle prossime versioni.
- **Scegli un ruolo**: solo in anteprima e in locale (modalità di test), per provare i diversi utenti del seed demo. In beta e produzione il login lo fa Cloudflare Access.

## Privacy

Il service worker mette in cache solo i file dell'app. Le chiamate a `/api` vanno sempre in rete: nessun dato personale resta sul telefono. L'interfaccia nasconde e mostra, ma i permessi li decide il Worker.

## Sviluppo

```bash
pnpm --filter @ppu/worker db:locale   # D1 locale con dati demo
pnpm --filter @ppu/worker dev         # API su localhost:8787 (serve .dev.vars)
pnpm --filter @ppu/pwa dev            # PWA con ricaricamento, /api inoltrato al Worker
```

Oppure, come nei test E2E, il Worker che serve la build:

```bash
pnpm --filter @ppu/pwa build
pnpm --filter @ppu/worker dev
```

Controlli: `pnpm --filter @ppu/pwa typecheck` (svelte-check). Biome controlla i file `.ts`; i `.svelte` sono esclusi perché Biome non vede l'uso delle variabili nel markup.
