# Research log

Queries, registries pulled, decisions, inclusion calls and dead ends. Newest entries at the bottom of each section. Per-task query logs from subagents live in `research/drafts/*.log.md` and are summarised here when merged.

## Decisions

| ID | Date | Decision | By |
|---|---|---|---|
| D-000 | 2026-10-22 | Canonical list = the 51 minerals on indiacriticalminerals.com (data files archived in `research/raw/indiacriticalminerals.com/`). They equal the Ministry of Mines list of 30 (PIB PRID 1942027, 24 Jul 2023) with REE and PGE expanded. Mapping: glauconite → Potash; rock phosphate / phosphorite → Phosphorus. | Orchestrator (from source) |
| D-001 | 2026-10-23 | When a source says only "REE" or "PGE" without naming elements, tag the umbrella `Rare earths (unspecified)` / `PGEs (unspecified)`. The mineral lens for any member element also lights these, marked "unspecified". Element tags only when a source names the element. | Owner |
| D-002 | 2026-10-23 | Exclude four large classes, logged with counts in `EXCLUDED.md`: secondary copper scrap refiners, ferro-silicon smelters, lead-acid recyclers making antimonial lead, phosphoric-acid / fertilizer plants. Primary copper, silicon metal, polysilicon and ingot/wafer stay in. | Owner |
| D-003 | 2026-10-23 | Manganese, chromium, bauxite, zinc and lead are not canonical. Exclude ferro-Mn / ferro-Cr plants and Mn / Cr / bauxite mines. Keep zinc-lead mines and smelters only as Cadmium (and any Ge / In) by-product streams; keep alumina refineries only where gallium is recovered or piloted. This resolves the ferro-alloy question flagged in LAYER_PLAYBOOKS L4. | Owner |
| D-004 | 2026-10-23 | Coking coal (reported added to MMDR Part D in Jan 2026) is excluded: it is not on the dashboard list. | Owner |
| D-005 | 2026-10-23 | Promethium has no natural supply chain; it stays in `minerals.yml` but the chain matrix does not flag its empty cells as gaps. | Orchestrator |
| D-006 | 2026-10-23 | Dashboard groups follow the live site as of 2026-10-22. A pending dashboard update (D8–D10) moves three minerals between groups; re-run `scripts/build-minerals.py` after it ships. | Orchestrator |
| D-007 | 2026-10-23 | Schema addition: `commodity_as_stated` (free text, exactly as the source prints the commodity) on every record, so tagging decisions can be revisited without re-research. | Orchestrator |

## Phase 0: foundations (2026-10-22 / 23)

- Fetched dashboard `minerals_data.json`, `group_assignments.json`, `criteria_data.json`, `app.js` from indiacriticalminerals.com → 51 minerals, 7 groups (incl. id 0 "Outlier" = Promethium). Symbols from the dashboard's own `PT_ELEMENTS` table.
- Official lists: PIB PRID 1942027 (24 Jul 2023) and 1944963 (2 Aug 2023) print the 30 names; PIB 1936083 (28 Jun 2023) is the unveiling. Part D: Lok Sabha USQ 442, 24 Jul 2024, Annexure-I tabulates 24 entries. Not in Part D: Antimony, Bismuth, Copper, Germanium, Hafnium, Silicon, Strontium.
- Network: `eparlib.sansad.in` / `eparlib.nic.in` unreachable from this machine; the same PDFs are served by `sansad.in/getFile/...` (see `research/TOOLING.md`). `indiacode.nic.in` returned 504 for the consolidated MMDR Act (3 tries). `web.archive.org` availability API returned 429.
- Built a local index of Lok Sabha questions (sansad.in API ignores filters, so whole sessions are pulled and searched locally).

## L1 Blocks (2026-10-23)

- Research moved in-house after the owner asked to stop running parallel subagents (2026-10-23). Drafts left by the stopped agents (Centre T1–T5 registry, state registry, geodata) were re-checked rather than re-done: every preferred bidder was cross-checked against the MSTC results pages, and unique-block counts against PIB 2277041 (88 / 56) and the NCMM note (34 Centre / 25 state).
- Registries extracted: MSTC Centre tranche listings (T1–T8 NITs, block summaries, notices), EL Tranches I–II, Offshore Tranches I–II, all 336 MSTC document sections (11,427 documents), MSTC results pages (Centre, EL, all sellers, FY2023-24..2026-27), Ministry of Mines successful-auction list (to May 2025), state NITs (MP, CG, UP, JH, OD, MH, RJ, KA, AP, TN, BR, GJ).
- Geometry: polygons parsed from every block summary and accepted only when the polygon area is within 25% of the stated area; 6 recovered by OCR (macOS Vision) or from corrigenda (Biarpalli, Dudhiasol, West Sewell Ridge Block-1).
- Decision D-008: ISA areas use status "Licence / lease executed" for signed ISA exploration contracts and "Identified" for applications not yet granted (the block vocabulary has no "applied" state). Locations without published contract coordinates use IHO-IOC GEBCO gazetteer feature positions at precision "state".
- Decision D-009: state offerings with no published result are recorded as outcome "Offered" (status "Offered" / "Re-offered", confidence medium) rather than inferring an annulment.
- Verification (2026-10-23): `scripts/research/verify_l1.py --all` re-read the archived raw text of every cited source for all 191 block records and confirmed 604/604 checks (district, preferred bidder, final offer, block name). It surfaced one transcription error (Endolin-Isholin district "Uppar" → "Upper Dibang Valley") and two districts entered without a linked source (Bagwadi, Ghanpewadi; now sourced to their block summaries, value unchanged). This is a programmatic check by the same researcher, not an independent agent (owner asked for no parallel subagents); field-level evidence lines are in research/evidence/blocks.jsonl with checked_by "verifier".
- Post-auction status: Lok Sabha USQ 623/2814/3923 and company filings moved 10 blocks beyond "Preferred bidder" (see OPEN_QUESTIONS 2 for the rest).
- Saturation run (2026-10-23), web queries after the registry extraction, each yielding no new in-scope block: state critical-mineral auctions 2026; Odisha/Jharkhand/Tamil Nadu/Gujarat graphite; Tranche IX / EL Tranche III; Odisha 7 non-ferrous blocks (2019 Jagdalpur, already held); Hindi "graphite block auction"; Odia/Kannada/Telugu graphite auction; AP/Telangana/TN REE blocks; state copper auctions 2026; lithium/tungsten state auctions; Rajasthan potash; Vedanta, Hindustan Zinc, Coal India, NLC, Oil India block filings (status updates only). Registry channels: full MSTC section map (336 sections), MSTC results (all sellers FY2023-24..2026-27), MoM successful-auction list, ISA contractor records.
