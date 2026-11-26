# PWA PPU

Interfaccia per i capi, in Svelte 5 + Vite, installabile sul telefono. È servita dallo stesso Worker dell'API (ADR 0012): stessa origine, nessun CORS.

## Cosa c'è

- **Elenco associati**: ricerca per nome o cognome, filtro per unità, tag dell'anno.
- **Scheda**: contatti, genitori e tutori, anagrafica, consensi privacy, relazioni, progressione, presenze, storico unità. Mai codici fiscali né residenza (campi sensibili).
- **Sola lettura** per ora: le modifiche (con anteprima e conferma) arriveranno nelle prossime versioni.
- **Scegli un ruolo**: solo in anteprima e in locale (modalità di test), per provare i diversi utenti dei dati demo. In beta e produzione il login lo fa Cloudflare Access.

## Aspetto e marchio

Tema "vetro liquido": superfici traslucide sfocate sopra macchie di colore del marchio, chiaro o scuro secondo il sistema, opaco con *trasparenze ridotte* o *contrasto elevato*. Segue il manuale d'immagine coordinata AGESCI (2016): scala del viola, colori di branca per avatar e filtri (giallo L/C, verde E/G, rosso R/S, lilla Co.Ca.), font Roboto e Roboto Slab inclusi nella PWA (nessuna richiesta a Google Fonts). Il logo del gruppo non si altera: sta sempre su fondo bianco.

Logo, colori e nome del gruppo non sono nel repository: li legge `brand.ts` durante la build dalle variabili `PPU_LOGO` (percorso o indirizzo https), `PPU_COLORS` e `PPU_GROUP_NAME` (vedi `docs/installazione/pipeline.md`). Senza variabili si usano un'icona generica e la palette predefinita.

```bash
PPU_LOGO=~/logo.jpg PPU_GROUP_NAME="Gruppo Esempio 1" pnpm --filter @ppu/pwa build
```

## Privacy

Il service worker mette in cache solo i file dell'app. Le chiamate a `/api` vanno sempre in rete: nessun dato personale resta sul telefono. L'interfaccia nasconde e mostra, ma i permessi li decide il Worker.

## Sviluppo

```bash
pnpm --filter @ppu/worker db:local   # D1 locale con dati demo
pnpm --filter @ppu/worker dev         # API su localhost:8787 (serve .dev.vars)
pnpm --filter @ppu/pwa dev            # PWA con ricaricamento, /api inoltrato al Worker
```

Oppure, come nei test E2E, il Worker che serve la build:

```bash
pnpm --filter @ppu/pwa build
pnpm --filter @ppu/worker dev
```

Controlli: `pnpm --filter @ppu/pwa typecheck` (svelte-check). Biome controlla i file `.ts`; i `.svelte` sono esclusi perché Biome non vede l'uso delle variabili nel markup.
