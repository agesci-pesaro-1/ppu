# 0004. Un solo backend con endpoint MCP e API REST

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

I capi usano PPU in due modi: dalla PWA e dal proprio assistente AI tramite un server MCP. Le regole (permessi, anteprima e conferma, registro, risposte minime) devono essere identiche nei due casi. Un modello linguistico non è un confine di sicurezza affidabile.

## Decisione

Un solo Worker con due ingressi sullo stesso livello di servizi:

- endpoint MCP remoto (Streamable HTTP) con OAuth Google tramite `workers-oauth-provider`, limitato al dominio configurato;
- API REST per la PWA, che verifica il JWT di Cloudflare Access su ogni chiamata.

Permessi, conferme e registro sono applicati nel livello di servizi, che entrambi gli ingressi chiamano. Un MCP admin separato, riservato al webmaster, gestisce utenti, ruoli, unità e tag.

## Alternative scartate

- **Due backend separati:** regole duplicate che prima o poi divergono.
- **Controlli nel prompt o nella UI:** aggirabili; il modello o il client non sono affidabili.
- **PWA che parla con l'MCP:** protocollo pensato per assistenti, scomodo per un'interfaccia.

## Conseguenze

- Ogni funzionalità nasce come funzione di servizio testabile, poi si espone su MCP e REST.
- Il registro `modifiche` annota il canale (MCP o PWA).
- Due meccanismi di autenticazione da mantenere (OAuth MCP e Access), che producono la stessa identità per il livello di servizi.
