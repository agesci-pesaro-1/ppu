# 0011. Licenza AGPL-3.0 per il codice

- **Stato:** Accettata
- **Data:** 2026-11-12

## Contesto

PPU è open source e pensato per essere installato da altri gruppi (ADR 0010). Vogliamo che i miglioramenti restino disponibili a tutti, anche quando qualcuno offre PPU come servizio online invece di distribuirne il codice.

## Decisione

Il codice è distribuito con licenza GNU Affero General Public License v3.0 (AGPL-3.0-only), per ora. Il titolare del copyright è AGESCI Pesaro 1. I contributi sono accettati con firma DCO nei commit, senza cessione del copyright.

## Alternative scartate

- **MIT o Apache-2.0:** chiunque potrebbe offrire una versione modificata come servizio senza condividere le modifiche.
- **GPL-3.0:** l'obbligo di pubblicare scatta solo con la distribuzione del software, non con l'uso in rete.
- **CLA (cessione dei diritti):** barriera per chi contribuisce; il DCO basta.

## Conseguenze

- L'uso commerciale è permesso, ma chi offre il servizio a terzi deve pubblicare le proprie modifiche.
- Le dipendenze devono avere licenze compatibili con AGPL-3.0.
- Con il DCO e senza CLA, un cambio di licenza futuro richiederebbe il consenso dei contributori.
- La licenza della documentazione per gli utenti è ancora un punto aperto.
