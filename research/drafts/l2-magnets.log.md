# L2 magnets: research log (researcher, started 2026-10-23)

Layer L2: rare-earth separation, RE metals/alloys, permanent magnets, REPM scheme, magnet recycling.
Data target: `magnets.yml` (layer: magnets). Drafts in `research/drafts/l2-magnets.*`.

## Tool / access notes
- 2026-10-23 00:30 IST: WebSearch and WebFetch both returned "session limit, resets 3:50am". All discovery after this point uses curl-based RSS search (Google News RSS with a link decoder, Bing web RSS, Bing News RSS) run from this machine; every fact is read from raw text fetched with `scripts/research/fetch.py`.
- Lok Sabha index (`sansad_index.py`) covers the 18th LS sessions; PDFs fetched from `sansad.in/getFile/lsapps/...` without issue.

## Queries and registries (date, channel, query, yield)

| # | Date | Type | Query / registry | Yield (new in-scope entities) |
|---|---|---|---|---|
| 1 | 2026-10-23 | registry | `sansad_index.py search "rare earth|magnet|IREL|monazite|neodymium"` → 21 hits; all 21 + 4 related (ECMS, NCMM) fetched | IREL REPM plant Vizag (AU1710: completed 2024, ₹196.50 cr), IREL SmCo plant (AU303, AU1474), IREL extraction/refining facilities (AU5177, AU2283). REPM scheme dates (AU460, AU2603, AU442). 2030 demand 8,220 MTPA (AU442) |
| 2 | 2026-10-23 | registry | `sansad_index.py search "rare|magnet|monazite|samarium|lanthan|beach sand|mineral sand|heavy mineral|IREL"` | 0 (health "rare disease" noise) |
| 3 | 2026-10-23 | registry | `sansad_index.py search "critical mineral|electronics component|ECMS|component manufacturing"` → 29 hits | 0 new (context only) |
| 4 | 2026-10-23 | registry | PIB PRID 2299078 (13 Aug 2026), MHI list of 20 REPM bidders | 20 bidders (see l2-repm-bidders.yml) |
| 5 | 2026-10-23 | discovery (WebSearch, before limit) | "REPM scheme bidders selected beneficiaries sintered rare earth permanent magnet Ministry of Heavy Industries result" | 0 new; no selection result found |
| 6 | 2026-10-23 | discovery (Bing News RSS) | "rare earth magnet scheme beneficiaries" | 0 new |
| 7 | 2026-10-23 | discovery (GN RSS) | "rare earth magnet scheme" | Nexon Geochem AP plant; Midwest Energy Hyderabad magnet plant; NAN GreenMet NdFeB plant; Proterial India NdFeB plant; "next ECMS tranche may greenlight RE magnet plants" (leads) |
| 8 | 2026-10-23 | snowball (GN RSS) | "Nexon Geochem rare earth magnet Andhra" | Nexon Geochem Kakinada (lead confirmed by 5 outlets) |
