# MCP admin: configurazione e collegamento

L'MCP admin permette al webmaster di gestire utenti, ruoli, unità e tag parlando con il proprio assistente AI. È un endpoint del Worker PPU (`/mcp/admin`) protetto da OAuth: l'assistente apre una pagina di consenso, poi il login Google con un account del dominio del gruppo.

Ogni modifica passa da un'anteprima prima/dopo e da una conferma esplicita; tutto finisce nel registro `modifiche` con canale `admin`. I permessi sono controllati dal Worker: un capo che non è webmaster può collegarsi ma ogni strumento gli risponde "permesso negato".

## 1. Client OAuth su Google Cloud Console

Serve solo per il login: nessuna API Google viene usata e nessun privilegio sul dominio è richiesto.

1. Apri [Google Cloud Console](https://console.cloud.google.com/) con un account del dominio e crea un progetto (per esempio "PPU").
2. **API e servizi → Schermata consenso OAuth**: tipo di utente **Interno** (solo account del dominio), nome dell'app "PPU", email di assistenza del gruppo. Ambiti: `openid` ed `email`.
3. **API e servizi → Credenziali → Crea credenziali → ID client OAuth**:
   - tipo: **Applicazione web**;
   - **URI di reindirizzamento autorizzati**: `https://<host-del-worker>/oauth/google/callback` (uno per ambiente: produzione, beta, preview se serve).
4. Annota **ID client** e **segreto client**.

Il tipo "Interno" e il controllo del Worker sul claim `hd` garantiscono che entrino solo account del dominio configurato in `DOMINIO`.

## 2. Risorse e segreti Cloudflare

| Nome | Tipo | Valore |
| --- | --- | --- |
| `OAUTH_KV` | KV namespace | Token e client OAuth (salvati come hash o cifrati). Crealo con `wrangler kv namespace create OAUTH_KV` e metti l'id in `wrangler.jsonc` |
| `GOOGLE_CLIENT_ID` | segreto | ID client del passo 1 |
| `GOOGLE_CLIENT_SECRET` | segreto | Segreto client del passo 1 |

I segreti si impostano dalla pipeline di deploy (segreti del repository GitHub), mai da una macchina locale. Senza `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` l'endpoint resta protetto ma il login non è disponibile.

Non serve una chiave per i cookie: consenso e `state` sono legati al browser dalla libreria `@cloudflare/workers-oauth-provider` con cookie `__Host-`.

## 3. Sessioni e revoca

- I token di accesso durano un'ora; il rinnovo è possibile per 30 giorni.
- A ogni richiesta il Worker rilegge la tabella `utenti`: un account marcato `escluso` perde l'accesso subito.
- A ogni rinnovo il Worker verifica con Google che l'account sia ancora attivo: un account sospeso o rimosso dal dominio non ottiene nuovi token.

## 4. Collegare Claude

Il webmaster, con il proprio account Claude:

1. **Impostazioni → Connettori → Aggiungi connettore personalizzato**.
2. Nome: "PPU admin". URL: `https://<host-del-worker>/mcp/admin`.
3. Avvia il collegamento: si apre la pagina di consenso di PPU, poi il login Google. Scegli l'account del gruppo.
4. In una chat, chiedi per esempio "Chi sono su PPU?" oppure "Elenca i tag liberi con il loro utilizzo".

Prima di usarlo con dati reali, disattiva nelle impostazioni di Claude l'uso delle chat per l'addestramento.

### Strumenti disponibili

| Strumento | Cosa fa |
| --- | --- |
| `chi_sono` | Email e ruoli dell'utente collegato |
| `elenca_utenti` | Capi registrati con unità e ruoli |
| `imposta_utente` | Propone la creazione o modifica di un utente (unità, ruoli, esclusione, scheda associato) |
| `elenca_unita` | Unità con stato, associati attivi e numero di capi |
| `imposta_unita` | Propone l'aggiunta, la rinomina o l'attivazione/disattivazione di un'unità |
| `elenca_tag` | Tag con tipo, stato e utilizzi |
| `cambia_stato_tag` | Propone di rendere un tag ufficiale, archiviarlo o riportarlo a libero |
| `unisci_tag` | Propone l'unione di due tag |
| `conferma_operazione` | Applica un'operazione proposta, dopo il "sì" esplicito |
| `annulla_operazione` | Annulla un'operazione proposta |

Le anteprime scadono dopo 15 minuti. Le operazioni di massa (per esempio unire due squadriglie) chiedono di ripetere nella conferma il numero di elementi mostrato nell'anteprima.

## Preview e sviluppo locale

In `locale` e `preview` (con `MODALITA_TEST=attiva`) l'endpoint accetta anche l'header `X-Ppu-Utente-Test: webmaster@example.org`, senza OAuth, per i test automatici. In beta e produzione questa modalità è rifiutata dalla configurazione.
