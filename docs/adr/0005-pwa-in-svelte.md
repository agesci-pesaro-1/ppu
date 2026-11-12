# 0005. PWA in Svelte, non Next.js né AppSheet

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

Serve un'interfaccia installabile su telefono per consultare, modificare e presentare i dati, servita gratuitamente e protetta da Cloudflare Access. Il backend è già un Worker separato.

## Decisione

La PWA è una build statica in Svelte + Vite con `vite-plugin-pwa`, pubblicata su Cloudflare Pages dietro Access. Tutti i dati passano dall'API REST del Worker.

## Alternative scartate

- **Next.js:** pensato per rendering lato server; su Cloudflare richiede adattatori; peso e complessità superflui per una build statica.
- **AppSheet o strumenti no-code:** costi per utente, permessi e registri non controllabili dal nostro backend, non replicabile come progetto open source.
- **App native:** due piattaforme, store, costi; la PWA basta.

## Conseguenze

- Build statica semplice da ospitare e da cachare; nessun segreto nel client.
- Il client non contiene logica di sicurezza: la UI nasconde, ma è il backend che decide.
- Test E2E con Playwright sulla build reale.
