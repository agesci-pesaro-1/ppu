# 0014. PWA servita dallo stesso Worker dell'API

- **Stato:** Proposta
- **Data:** 2026-11-13
- **Supera:** solo la parte di hosting dell'ADR 0005 (PWA su Cloudflare Pages). La scelta di Svelte resta valida.

## Contesto

L'ADR 0005 prevedeva la PWA come build statica su Cloudflare Pages e l'API sul Worker. Così PWA e API stanno su due origini diverse:

- servono CORS e cookie tra domini, o un'applicazione Access per ciascuno;
- ogni ambiente (preview per pull request, beta, produzione) va pubblicato due volte, con due indirizzi da tenere allineati;
- la preview della pull request non mostrerebbe l'interfaccia insieme all'API con i dati demo senza ulteriore configurazione.

Da quando l'ADR 0005 è stato scritto, i Workers servono anche file statici (Workers Static Assets) sul piano gratuito.

## Decisione

La build della PWA (`packages/pwa/dist`) è servita come asset statici dallo stesso Worker dell'API, configurati in `wrangler.jsonc`:

- fallback `single-page-application` per i percorsi della PWA;
- `run_worker_first` per `/api/*`, `/mcp`, `/mcp/*`, `/oauth/*`, `/authorize`, `/.well-known/*` e `/salute`: questi percorsi vanno sempre al codice del Worker.

In beta e produzione un'applicazione Access protegge l'intero indirizzo (PWA e API); un'applicazione Access di tipo Bypass, più specifica, lascia passare i percorsi dell'MCP, protetti dall'OAuth Google del Worker.

In modalità di test (solo `locale` e `preview`) la PWA mostra una schermata "Scegli un ruolo" con gli utenti del seed demo; il Worker imposta un cookie `HttpOnly` che accetta solo in quella modalità.

## Alternative scartate

- **PWA su Cloudflare Pages (ADR 0005):** due origini, CORS, due deploy per ambiente.
- **Worker che inoltra a Pages:** un salto in più, stessa complessità di deploy.

## Conseguenze

- Una sola origine: niente CORS; il JWT di Access arriva all'API con la stessa sessione della PWA.
- Un solo deploy per ambiente: la pipeline esegue la build della PWA prima di `wrangler deploy`.
- La preview di ogni pull request mostra l'interfaccia con i dati demo.
- Le applicazioni Access cambiano: tutto l'indirizzo protetto, più un'applicazione Bypass per l'MCP (`docs/installazione/cloudflare-e-google.md`).
- Il service worker della PWA mette in cache solo la "scocca"; le risposte di `/api` non vengono mai salvate sul dispositivo.
