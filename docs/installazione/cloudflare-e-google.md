# Installazione: Cloudflare, Google Cloud e GitHub

Guida passo passo per la prima installazione di PPU. Serve una persona con accesso amministrativo all'account Cloudflare del gruppo, un account del dominio Google Workspace e i permessi di amministrazione sul repository GitHub.

Nessun segreto passa da una chat o da un computer personale: tutto si inserisce nelle dashboard di Cloudflare, Google e GitHub.

Negli esempi il dominio del gruppo è `example.org` e il team di Cloudflare Access è `esempio`. Sostituiscili con i valori reali.

## Indirizzi

Il Worker di beta e produzione risponde su un dominio personalizzato del gruppo, che Cloudflare crea al primo deploy (il dominio deve essere già gestito da Cloudflare):

| Ambiente | Indirizzo del Worker (esempio) |
| --- | --- |
| beta | `ppu-api-beta.example.org` |
| produzione | `ppu-api.example.org` |

Su ogni indirizzo:

- `/api/*` è l'API della PWA, protetta da **Cloudflare Access**;
- `/mcp/*`, `/oauth/*`, `/authorize` e `/.well-known/*` sono l'MCP, protetto dall'**OAuth Google** del Worker. Questi percorsi **non** vanno messi dietro Access, altrimenti gli assistenti AI non riescono a collegarsi.

In entrambi i casi il Worker verifica l'identità a ogni chiamata: un'applicazione Access configurata male non apre l'API.

---

## 1. Google Cloud Console

Servono due client OAuth nello stesso progetto: uno per il login MCP del Worker, uno per Cloudflare Access. Nessuna API Google viene usata e nessun privilegio amministrativo sul dominio è richiesto.

### 1.1 Progetto e schermata di consenso

1. Apri [console.cloud.google.com](https://console.cloud.google.com/) con un account del dominio del gruppo.
2. In alto, selettore dei progetti → **Nuovo progetto** → nome `PPU` → organizzazione del dominio → **Crea**.
3. Menu → **Google Auth Platform** (o **API e servizi → Schermata consenso OAuth**) → **Inizia**:
   - nome dell'app: `PPU`;
   - email di assistenza: un indirizzo del gruppo;
   - **Pubblico: Interno**. Così possono accedere solo gli account del dominio;
   - contatto dello sviluppatore: un indirizzo del gruppo.
4. **Accesso ai dati → Aggiungi o rimuovi ambiti**: seleziona `openid` e `.../auth/userinfo.email`. Salva.

### 1.2 Client per il login MCP

1. **Client → Crea client**:
   - tipo di applicazione: **Applicazione web**;
   - nome: `PPU MCP`;
   - **URI di reindirizzamento autorizzati**:
     - `https://ppu-api-beta.example.org/oauth/google/callback`
     - `https://ppu-api.example.org/oauth/google/callback`
2. **Crea**, poi copia **ID client** e **Client secret**. Serviranno in GitHub (passo 3) come `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

### 1.3 Client per Cloudflare Access

1. **Client → Crea client** → **Applicazione web**, nome `PPU Access`.
2. **URI di reindirizzamento autorizzati**: `https://esempio.cloudflareaccess.com/cdn-cgi/access/callback` (con il nome del team scelto al passo 2.4).
3. Copia ID client e Client secret: si inseriscono in Cloudflare al passo 2.5.

---

## 2. Cloudflare

### 2.1 ID dell'account

Dashboard → **Workers e Pages** (o la home dell'account): l'**Account ID** è nella colonna a destra. Servirà come `CLOUDFLARE_ACCOUNT_ID`.

### 2.2 Token API per GitHub Actions

1. In alto a destra → **Profilo → Token API → Crea token → Token personalizzato**.
2. Nome: `PPU GitHub Actions`.
3. Autorizzazioni:

   | Ambito | Risorsa | Permesso |
   | --- | --- | --- |
   | Account | Workers Scripts | Modifica |
   | Account | D1 | Modifica |
   | Account | Workers KV Storage | Modifica |
   | Zona | Workers Routes | Modifica |
   | Zona | DNS | Modifica |

4. Risorse dell'account: solo l'account del gruppo. Risorse della zona: solo il dominio del gruppo.
5. **Continua → Crea token** e copia il valore: si vede una sola volta. Servirà come `CLOUDFLARE_API_TOKEN`.

### 2.3 Database D1 e KV

1. **Archiviazione e database → D1 → Crea database**:
   - nome: `ppu`;
   - **Località: Giurisdizione → UE**. ⚠️ La giurisdizione si sceglie **solo alla creazione**: se sbagli, devi creare un nuovo database.
2. Copia il **Database ID**: servirà come `PPU_D1_ID` (e `PPU_D1_NOME` = `ppu`).
3. **Archiviazione e database → KV → Crea namespace**, nome `ppu-oauth`. Copia l'**ID**: servirà come `PPU_KV_OAUTH_ID`. Contiene solo token e client OAuth (cifrati o sotto hash), nessun dato degli associati.

Non applicare migrazioni né seed a mano: lo fa la pipeline al primo rilascio.

### 2.4 Zero Trust (Access)

1. Dashboard → **Zero Trust**. Al primo accesso scegli il **nome del team** (per esempio `esempio`): il team domain sarà `esempio.cloudflareaccess.com` e servirà come `PPU_ACCESS_TEAM_DOMAIN`.
2. Scegli il piano **Free** (fino a 50 utenti). Se la procedura chiede un metodo di pagamento anche per il piano gratuito, è una richiesta di Cloudflare: il piano Free non ha addebiti.

### 2.5 Metodo di accesso Google

1. **Zero Trust → Impostazioni → Autenticazione → Metodi di accesso → Aggiungi nuovo → Google**.
   Usa **Google**, non "Google Workspace": quest'ultimo chiede l'Admin SDK per leggere i gruppi, che PPU non usa (ADR 0003).
2. Incolla ID client e Client secret del client `PPU Access` (passo 1.3) → **Salva** → **Test**.

### 2.6 Applicazioni Access per l'API

Crea due applicazioni: **Zero Trust → Accesso → Applicazioni → Aggiungi un'applicazione → Self-hosted**.

**Produzione**

- Nome: `PPU API`.
- Durata della sessione: breve, per esempio 12 ore.
- Dominio pubblico: sottodominio `ppu-api`, dominio `example.org`, **percorso `api`**.
- Metodi di accesso: solo **Google**; attiva "Accetta istantaneamente" se è l'unico metodo.
- Criterio: nome `Capi`, azione **Consenti**, regola **Includi → Email che terminano con → `@example.org`**.

**Beta**

- Nome: `PPU API beta`, dominio `ppu-api-beta.example.org`, **percorso `api`**.
- Criterio: azione **Consenti**, regola **Includi → Email** con l'elenco dei tester. Il Worker in beta controlla comunque il flag `beta_tester` della tabella `utenti`.

Per ciascuna, dopo il salvataggio: **Panoramica → Application Audience (AUD) Tag**. Copialo: servirà come `PPU_ACCESS_AUD` nell'environment GitHub corrispondente.

---

## 3. GitHub

Repository → **Settings**.

### 3.1 Segreti del repository

**Secrets and variables → Actions → Secrets → New repository secret**:

| Nome | Valore |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | token del passo 2.2 |
| `CLOUDFLARE_ACCOUNT_ID` | ID del passo 2.1 |
| `GOOGLE_CLIENT_ID` | ID client `PPU MCP` (passo 1.2) |
| `GOOGLE_CLIENT_SECRET` | Client secret `PPU MCP` (passo 1.2) |

### 3.2 Variabili del repository

**Secrets and variables → Actions → Variables → New repository variable**:

| Nome | Valore |
| --- | --- |
| `PPU_DOMINIO` | `example.org` |
| `PPU_NOME_GRUPPO` | nome del gruppo (facoltativa) |
| `PPU_ACCESS_TEAM_DOMAIN` | `esempio.cloudflareaccess.com` |
| `PPU_D1_NOME` | `ppu` |
| `PPU_D1_ID` | ID del passo 2.3 |
| `PPU_KV_OAUTH_ID` | ID del KV del passo 2.3 |
| `PPU_WEBMASTER_INIZIALE` | email del primo webmaster, per esempio `webmaster@example.org` |

`PPU_WEBMASTER_INIZIALE` serve solo alla prima installazione: il rilascio lo registra come webmaster **solo se nella tabella `utenti` non c'è ancora nessun webmaster**. Dopo, ruoli e utenti si gestiscono dall'MCP admin; la variabile si può lasciare o cancellare.

### 3.3 Environments

**Environments → New environment**:

| Nome | Protezione | Variabili |
| --- | --- | --- |
| `beta` | *Deployment branches*: solo `main` | `PPU_ACCESS_AUD` = AUD dell'app beta; `PPU_ROUTE` = `ppu-api-beta.example.org` |
| `produzione` | *Deployment branches*: solo `main`; **Required reviewers**: chi dà il via libera dopo i tester | `PPU_ACCESS_AUD` = AUD dell'app di produzione; `PPU_ROUTE` = `ppu-api.example.org` |

---

## 4. Primo rilascio

1. Fai il merge su `main`. Il workflow **Rilascio**:
   - applica le migrazioni e il seed base al D1 di produzione;
   - registra il primo webmaster;
   - pubblica la beta su `ppu-api-beta.example.org`;
   - carica i segreti del login Google.
2. Controlla: `https://ppu-api-beta.example.org/salute` risponde `{"stato":"ok","ambiente":"beta"}`.
3. Il webmaster collega l'MCP admin a Claude (vedi [mcp-admin.md](mcp-admin.md)) con l'URL `https://ppu-api-beta.example.org/mcp/admin`, e assegna unità e ruoli ai capi. Ricorda di segnare come `beta_tester` chi deve provare la beta.
4. Import dal foglio: [import.md](import.md).
5. Quando i tester danno il via libera: **Actions → Rilascio → Run workflow → produzione**. Il revisore dell'environment approva e la produzione va su `ppu-api.example.org`.

## Problemi frequenti

| Sintomo | Causa probabile |
| --- | --- |
| Il rilascio è "saltato" con un avviso | mancano `CLOUDFLARE_API_TOKEN` o `CLOUDFLARE_ACCOUNT_ID` |
| `PPU_KV_OAUTH_ID mancante` (o un'altra variabile) | variabile del repository o dell'environment non impostata |
| Errore di autorizzazione nel deploy | permessi del token (passo 2.2), in particolare sulla zona per il dominio personalizzato |
| `/api/io` risponde 401 anche dopo il login | `PPU_ACCESS_AUD` dell'environment diverso dall'AUD dell'applicazione Access |
| Google: `redirect_uri_mismatch` | URI di reindirizzamento del client `PPU MCP` diverso dall'indirizzo del Worker |
| L'MCP risponde "permesso negato" | l'utente non è webmaster nella tabella `utenti` |
