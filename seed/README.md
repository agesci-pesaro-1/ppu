# Seed

- `base/`: dati standard AGESCI (branche, unità, catalogo di progressione, tipi di tag). Si applicano a ogni installazione, in ordine, dopo le migrazioni. Sono idempotenti.
- `demo/`: dati **inventati** per preview, test E2E e demo pubblica. Si applicano dopo `base/`. Mai in produzione.

`demo/demo.sql` è generato da `scripts/genera-seed-demo.ts`: non modificarlo a mano.

```bash
pnpm seed:demo
```

Nessun dato reale: nomi, indirizzi, telefoni, email e codici fiscali sono finti (email su `example.org`, codici fiscali con prefisso `DEMO`, comune e provincia inesistenti).
