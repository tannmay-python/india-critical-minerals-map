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

## L2 Magnets and rare earths (2026-10-23)

- 12 site records in `data/magnets.yml`; REPM and ECMS in `data/schemes.yml`. Drafts are written compactly in `research/drafts/*.src.yml` and expanded by `scripts/research/build_entities.py`, which refuses to build unless every quoted excerpt is found in the archived raw text (97 excerpts checked for L2, 13 for schemes).
- Anchors: REPM bids received = 20 (PIB 2299078 lists all 20, so the playbook's "unidentified 20th bidder" is resolved: BaRupOn–IRP Consortium and Keystone–Huebox are separate entries). Beneficiaries: none announced by 23 Oct 2026. RFP date confirmed as 20 Mar 2026 (PIB; All India Radio).
- Operating: IREL REEP (11,200 tpa mixed RE chloride), IREL RED Aluva (separated oxides, output curtailed FY2024-25), IREL REPM Vizag (SmCo, completed 31 Dec 2024, Rs 196.50 cr), Toyotsu Rare Earths India (APSEZ, since Oct 2013). Pilot: IREL Bhopal theme park, ARCI NdFeB line (20 Mar 2026). Approved: Midwest (TDB, May 2024), NAN MagneTech and Proterial (AP G.O.Ms. 136/137, 25 Jun 2026), LOHUM (ECMS, 30 Mar 2026). MoU: Nexon Geochem (Kakinada, Oct 2026), IREL–TAMIN (JV, 2024).
- Not mapped (no published site): 15 REPM bidders, Sona Comstar. Attero's REE recycling is left to L5 with its Roorkee plant to avoid a duplicate. Quantum Magnetics (ECMS REPM, Aug 2026) site not found; to research in L3 with the ECMS list.
- Geocoding lesson: Nominatim resolved "Atchutapuram" to a same-named village in Srikakulam district; corrected to Atchutapuram, Anakapalli (PIN 531011). Always pass the district when a town name is common.
- `fetch.py` now sends `--compressed`; one SMM page had been archived gzip-encoded and was re-fetched.

## L3 Battery and advanced materials (2026-10-24)

- 15 site records in `data/materials.yml` (80 excerpts checked against raw text). Built on the L3a/L3b agents' logs and archived ECMS releases (rounds 1-5, PIB 2182986, 2190872, 2210864, 2247040, 2300625).
- Anchor: ECMS 5 rounds, 106 projects, 15 states, Rs 69,548 crore; outlay Rs 22,919 crore raised to Rs 40,000 crore (PIB 2222519). Battery-material approvals: Epsilon C2GR (anode), NPSPL Advanced Materials (anode), PCBL (acetylene black), Acutaas (electrolyte additives).
- Operating or expanding: Himadri anode (Mahistikry, 200 MTPA, Apr 2026), GFCL EV complex (Jolva: LiPF6, electrolyte, LFP, PVDF), Neogen Ionics Dahej (electrolyte 2,000 MT; salts), Acutaas Jhagadia (VC, FEC), Hindalco battery foil (Sambalpur, Jan 2026). Under construction: Himadri LFP (Odisha, 40,000 MTPA), Altmin LFP (Divitipally), TACC anode (Dewas, 20,000 MTPA), Neogen Pakhajan (30,000 MT electrolyte). Pilot: Epsilon EAM-ONE, Altmin Balapur, Sudeep pCAM. Approved: NPSPL cathode (Chittoor). MoU: Epsilon LFP (Karnataka). Announced: LOHUM Krishnagiri CAM.
- Minerals: LFP and LiPF6 tagged Lithium and Phosphorus; graphite anode Graphite. Foil, binders and electrolyte additives carry no canonical mineral and are kept with an empty mineral list, per the playbook's L3 scope.
- No site published (kept off the map, OPEN_QUESTIONS 10): PCBL acetylene black, NPSPL anode, Himadri CNT, TCPL separator film. No operating separator or copper-foil plant found in India. Rejected leads: Tata Chemicals (no current CAM plant; recycling goes to L5), Reliance (no named materials plant), Ola and Amara Raja (cells, L9), Rain Industries anode (lead only), Hindalco copper foil (market-research page only).
- Geocoding: Mahistikry, Jolva, Sirsoda and Gudupalle are missing from OpenStreetMap (or match same-named villages elsewhere); those records use district centroids.

## L4 Processing and refining (2026-10-24)

- 35 records in `data/processing.yml` (96 excerpts checked). Main registry: IBM Indian Minerals Yearbook 2023 (62nd edition, Jan 2025), archived whole at `research/raw/ibm.gov.in/imyb-2023-book` and searched chapter by chapter (copper, cadmium, antimony, cobalt, nickel, gallium, vanadium, selenium-tellurium, ilmenite-rutile, zircon, tin, tungsten, molybdenum, lithium).
- Copper: Hindalco Dahej (500,000 tpy; tellurium recovery), Kutch Copper Mundra (500,000 tpa, expanding; LME registration Jul 2026), Sterlite Thoothukudi (closed May 2018), HCL ICC Ghatsila (suspended since 2019), HCL KCC Khetri (suspended Dec 2008). Cadmium: IBM's capacity table (Chanderiya 468, Debari 250, Vizag 115 idle since 2002, Binanipuram 80 idle since 2014; no cadmium output reported since 2017-18). Antimony: HZL Pantnagar by-product (1,400 TPA). Nickel/cobalt: Vedanta Nicomet. Gallium: NALCO Damanjodi plan (pilot being set up, early 2026). Vanadium sludge: Hindalco Renukoot, Muri, Belagavi; BALCO Korba; Vedanta Lanjigarh (V2O5). Titanium: KMML (synthetic rutile, pigment, 500 tpy sponge), KMML-SAIL 10,000 tpy sponge MoU, TTPL, DCW, CMRL. Zirconium: NFC Palayakayal and Hyderabad. Lithium: Altmin-SCCL MoU (30,000 t Li2CO3), Manikaran (no news since 2020). Silicon: Adani Mundra (2 GW ingot-wafer, operating), Reliance Jamnagar (wafer pilot, polysilicon commissioning), Waaree Butibori (10 GW, under construction), ReNew Rambilli (6 GW, MoU), Tata Power Nellore (10 GW, announced). NCMM parks: Paradip, Dahej, Dighi, Andhra Pradesh (site open).
- No primary production found for tungsten, tin smelting, silicon metal or primary antimony; IBM confirms no tungsten lease or output in 2022-23. LOHUM's 1,000 tpa lithium refinery uses recycled feed and goes to L5; Rubamin (spent catalysts) to L5; UCIL Jaduguda by-product molybdenum to L6.
- HCL ICC status rests on Outlook Business (company website) plus HCL's 2025-26 BRSR, which lists ICC's activities as mining and beneficiation only.

## L5 Recycling (2026-10-24)

- 91 records in `data/recycling.yml`. Registry: CPCB Battery Waste Management EPR portal, public DataTables endpoint `user/recyclerview` (587 registered recyclers). Archived field-filtered (personal contact fields removed). 499 are lead-acid only (excluded, D-002); 88 are registered for non-lead-acid types R2 (black mass), R3 (refining to compounds) or R4 (integrated); 87 mapped (one placeholder entry skipped). Registry coordinates used as site points; 7 corrected (swapped, degree-minute, wrong state, missing). Proprietorships registered under a person's name are published without the name.
- Generator: `scripts/research/gen_l5_cpcb.py` (re-runnable when the registry changes); enrichments layered from Rocklink (rare earth magnet line, Sikandrabad). Minerals for registry units are those of Li-ion black mass (Li, Co, Ni); the registry does not name chemistries.
- Added from other sources: Recyclekaro Palghar (NCMM scheme eligible), NALCO fly ash and red mud pilots (Bhubaneswar, Aug 2026), Ravindra Heraeus PGM catalyst recycling (Udaipur; Vizag site acquired Sept 2024).
- Anchors: NCMM recycling scheme, 58 eligible (20 + 38), 850 KTPA, Rs 5,000 crore pledged (PIB 2256977); names unpublished. CPCB e-waste recycler count not verified (reported 322 in Feb 2025; source link did not archive). CPCB battery registry: 587 recyclers, 88 non-lead-acid (Oct 2026).
- Not found or deferred: base-metal spent-catalyst recyclers (no named plant beyond Rubamin, which is in the registry), e-waste metal-recovery units (list behind login), Attero's rare earth recycling site (claims without a named plant; Attero's Roorkee unit is in the registry).

## L6 Operating mines (2026-10-24)

- 28 records in `data/mines.yml` (70 excerpts checked). Sources: IBM Indian Minerals Yearbook 2023 producer tables (graphite, rock phosphate, tin, zircon, lead-zinc, copper) and LS USQ 3828 (Hindustan Copper mine status, Dec 2024); HCL BRSR 2025-26; IREL AR 2024-25.
- Copper: Malanjkhand, Khetri, Kolihan, Surda (operational); Kendadih and Rakha (stalled). Zinc-lead as cadmium streams (D-003): Rampura Agucha, Sindesar Khurd, Rajpura Dariba, Zawar group, Kayad. Graphite: TAMIN Sivaganga plus four IBM-listed producers. Rock phosphate: RSMML Jhamarkotra, MPSMCL Meghnagar and Hirapur, Khajuraho Stones. Tin: two Dantewada producers. Beach sands: IREL Chavara, Manavalakurichi, OSCOM; IREL Brahmagiri (LoI 2023); KMML Chavara. By-product molybdenum: UCIL Jaduguda (district precision, atomic facility).
- No production found for tungsten, nickel, cobalt, lithium, beryl, potash or primary antimony in India (IBM 2023). Auctioned blocks in production would sit in L1; none reported yet.

## L7 R&D and Centres of Excellence (2026-10-24)

- 13 records in `data/rnd.yml`. Anchor: NCMM CoEs = 9 (seven recognised 1 Aug 2025, PIB 2151287: IIT Bombay, IIT Hyderabad, IIT-ISM Dhanbad, IIT Roorkee, CSIR-IMMT, CSIR-NML, NFTDC; IISc Bengaluru and C-MET Hyderabad added 24-25 Oct 2025). The playbook's guessed seven matched PIB exactly. No further CoE found for 2026.
- Also mapped: JNARDDC Nagpur (recycling-scheme PMA; NCMM residue pilots), BARC Trombay (rare earth metal processes behind IREL's Bhopal pilots; SmCo testing), AMD Hyderabad, CSIR-NIIST (IRELTDC rare-earth aluminium alloys).
- ANRF Critical Raw Materials programme (CoE-only call, portal Jan 2026): no awardee list published as of 24 Oct 2026.
- IRELTDC's 10 ongoing projects (Mar 2026) are mostly small lab projects; only NIIST is mapped as an institution, and IREL RED's terbium and europium oxide pilots are added to the Aluva record in L2. Excluded: single small projects (NIT Warangal ceria coatings, GCECT garnet tiles, AMPRI red clay shielding, IIT Delhi methane reforming).

## L8 Overseas assets (2026-10-25)

- 20 records in `data/overseas.yml` (76 excerpts checked). Main source: Lok Sabha Standing Committee on Coal, Mines and Steel, 29th Report, "KABIL: India's quest for Global Critical Minerals" (presented 12 Aug 2026). Found through the sansad.in committee API (`api_ls/committee/lsRSAllReports`, committeeCode 46); the PDF is a scan, so its text was extracted with macOS Vision OCR (`scripts/research/ocr.swift`). Also LS USQ 827 (Feb 2026) and USQ 1510 (Jul 2024).
- KABIL and PSU consortia: Catamarca five blocks (exploration rights Jan 2024, drilling permit Apr 2026, first lithium Dec 2030 from Sept 2029); seven more Catamarca blocks, Jujuy talks, San Jorge (with Oil India) and Rio Grande-NOA (with IOCL) under evaluation; Salta 20% stake bid not selected (Jan-Feb 2026); Mt Marion and Wodgina lost to POSCO; Mt Holland and Andover sale reopened Feb 2026 and under evaluation; Vietnam REE (Trident Zoetics, Lai Chau) withdrawn by the seller.
- Private: LOHUM Zimbabwe (10 blocks, first ore Sept 2026); Lloyds Metals 49% of the Chemaf buyer (Etoile operating, Mutoshi under construction; DRC); Vedanta KCM (79.4%, Zambia); Epsilon Brunswick County anode plant (approved, no ground-breaking report after Aug 2025) and Moosburg LFP centre; Altmin 33% CBL refinery stake (announced Feb 2026, reported near cancellation Jul 2026); Greenko two lithium blocks (Catamarca).
- Government: Zambia 9,000 sq km copper-cobalt exploration allocation (2025), mining-rights talks stalled (Apr 2026).
- Not recorded: see EXCLUDED (L8) and OPEN_QUESTIONS 15. The committee notes that private overseas investments need not be disclosed to the ministry, so the private list is incomplete by design.
- Builder: `build_entities.py` now passes `geo.country` to the geocoder for overseas points.

## L9 Demand anchors (2026-10-25)

- 12 records in `data/demand.yml` (40 excerpts checked). ACC PLI (MHI Lok Sabha answers, Feb-Jul 2026): 40 of 50 GWh awarded to four firms; only Ola has capacity (1.4 GWh, pilot output since Mar 2024); ACC Energy Storage (Dharwad, 5 GWh), Reliance (Jamnagar, 5 + 10 GWh); no incentive paid yet; 10 GWh earmarked for grid storage and retendered.
- Other cell plants: Exide Devanahalli (6 GWh, commissioned 23 Sept 2026), Agratas Sanand (20 GWh, under construction, NMC early 2027), Amara Raja Divitipally (60 MWh qualification plant, 2 GWh due June 2027, 16 GWh planned), Waaree Rambilli (16 GWh, AP in-principle approval), ChemVolt (5 GWh MoU, AP), GODI (12.5 GWh MoU 2024, Telangana; low confidence), JSW Odisha (on hold, no LFP technology partner).
- Gallium users from the India Semiconductor Tracker: Crystal Matrix GaN fab, Dholera (Cabinet approval 5 May 2026) and DRDO's GAETEC, Hyderabad. Records point to the tracker through `see_also`.
- Anchors: MHI says at least 10 makers have announced about 178 GWh outside the PLI; Mercom counts a 110 GWh cell pipeline (30 Sept 2026). India's Li-ion cell imports rose 64% to Rs 41,667 crore in FY26, 84% from China (Business Today, citing commerce ministry data).

## L10 Schemes and exploration aggregates (2026-10-25)

- `data/schemes.yml` now 14 records (11 added, 37 excerpts). NCMM parent: Rs 16,300 crore plus Rs 18,000 crore expected from PSUs (PIB 2097309, 29 Jan 2025); outlay heads from the ministry's NCMM note (10 Jan 2026); output targets (1,200 exploration projects, 50 foreign mines, 4 parks, 5 stockpiles, 400 kt recycled) from LS USQ 1884; Rs 410 crore allocated in 2025-26. Sub-schemes: recycling (existing), CoEs (nine, linked), processing parks (Rs 500 crore, four linked), recovery pilots (Rs 100 crore, guidelines 14 Nov 2025), stockpile (Rs 500 crore, none announced).
- Also: ACC PLI (Rs 18,100 crore; 40 of 50 GWh awarded; 1.4 GWh installed; nothing disbursed), ISM (Rs 76,000 crore; 12 projects; only the GaN fab linked), REE corridors (Budget 2026-27: Odisha, AP, TN, Kerala), lithium-nickel processing incentive (proposed, not notified by 23 Sept 2026), customs exemptions (Budgets 2024-25 to 2026-27), MMDR amendments 2023 and 2025.
- `data/gsi_exploration.yml`: 6 rows. GSI critical-mineral projects 195 (2024-25), 230 (2025-26), 300 planned (2026-27); NMEDT 62 and 84; target 1,200 by 2030-31. State-wise counts only for Rajasthan (35, 40). See OPEN_QUESTIONS 17.

- L4 addendum (2026-10-25): IREUK Titanium slag JV (IREL 51%, UKTMP JSC), Odisha; JV agreement 4 Nov 2024, company incorporated 5 Aug 2025; site not announced.

## Research pass, October 2026 (2026-10-25)

- L1: post-auction status from company filings and trade press for listed and PSU winners. Upgraded: Govindpur and Parvathapur (NLC, LoI 31 Aug 2026), Nawatola-Laband (HZL, composite licence deed 27 Jun 2026), Genjana (Vedanta, successful bidder 10 Dec 2025; BSE filing retrieved, OQ 6 closed), Devadurga (SCCL, exploration licence agreement 6 Aug 2026), Bhalukona-Jamnidih (Deccan Gold, LoI 5 Oct 2023). No filings found for Vedanta's other preferred-bidder blocks, Coal India's three, Hindalco Minzhari, Oil India Jorkian or Sunflag Surajpura. Lok Sabha answers give no block-level status. New tool: `scripts/research/apply_updates.py` (sourced field updates to existing records, excerpts checked).
- Privacy: four blocks won by individuals now show "Individual bidder (name withheld)", matching the rule applied to CPCB proprietorships.
- L3: SRF Altech battery aluminium foil, Jetapur (board approval 21 Oct 2026, 12,000 MTPA phase I). No separator or copper-foil plant with a verifiable approval found; Hindalco copper foil left in OQ 10.
- L2: no new magnet plant since L2; REPM beneficiaries still unannounced.
- OCR: the KABIL report was read with the existing `scripts/research/ocr.swift`; a duplicate script was removed.

## App and QA (2026-10-25)

- Editorial decisions recorded in `docs/BUILD_SPEC.md` §0: one map with an In India / Abroad switch, an About page, light-only Takshashila style; analysis views left out for now.
- QA (`scripts/qa.mjs`, dev and production builds): all panel counts, 11 filter links, 11 record links, search, view switch and the About page pass with zero console errors or warnings; screenshots at 1440, 768 and 375 px; boundary close-ups of J&K, Ladakh and Arunachal in both framings show only the official outline.
- Link check (`scripts/linkcheck.py`): 504 source URLs; 491 resolve, 10 PIB pages refuse scripted bursts (open in a browser), 1 transient error, 1 dead (Manufacturing Plant India on LOHUM Krishnagiri), now carrying a Wayback copy.
- Size: entities.json 155 KB gzipped; site JS 304 KB gzipped including MapLibre.

## Timelines: mines (2026-11-02)

- Opening dates for 26 of 28 mines, mostly from the "First opening date" or "Date of opening of mine" field of IBM inspection (MCDR) reports; HCL, UCIL, IREL and KMML pages for the rest. Drafts `t1-mines.src.yml` (15 records) and `t1-mines-2.src.yml` (10 records, 50 excerpts).
- New date field `dates.reopened` (validate.py, build_entities.py): a closed or idle site's latest restart. For such a site the expected-completion fields track the restart, so a promise can be read against the restart rather than the first opening.
- Singhbhum copper: Kendadih opened 1957, closed Feb 2000, reopened Dec 2017, restarted 15 Jan 2026 under a 20-year lease (status Stalled to Operational; HCL had said "this year" in Oct 2024 and "within 15-20 days" of the lease in Sept 2025). Surda opened 1956, closure notice June 2003, resumed June 2022, stopped in 2023-24 for want of a lease deed, resumed 5 Oct 2024. Rakha opened 1972, idle since July 2001; MDO South West Mining (agreement 9 Jan 2025, Rs 2,700 crore capex), 20-year lease 19 Sept 2025, first ore targeted 16-18 months after the lease (status Stalled to Approved). Surda's 2007 reopening and the 1997-2003 closure list are in a Lok Sabha answer on eparlib, which timed out from here.
- Smaller mines: TAMIN Sivaganga 1982, Khajuraho Stones (Luhani) 2016, MPSMCL Maddeora 1978 and Tigoda 1998, Betla 1996 (lessee Parijat Mining Industries), Gandabahali 2005 and Gandabahali-Kirikita 2006 (individual lessees, names withheld), Pradhan Industries Bandhamandi 1992 (reopened 2018) and Bainibasa 2019, both in Rayagada. OQ 14's graphite part resolved.
- No start date found for the two Dantewada tin operations (CMDC buys hand-dug cassiterite from tribal cooperatives; no single opening).
- Privacy: `scripts/research/scrub_contacts.py` removes email addresses and phone numbers from archived text (2,476 removed across the archive; files are left alone if a cited excerpt would break). `fetch.py` and `archive_text.py` now scrub on download. The two Gandabahali reports' individual lessees' names and home address are withheld in the archived copies. Earlier commits still hold the unscrubbed text in git history.

## Timelines: processing (2026-11-02)

- 17 of 36 records dated from company pages and filings (`t1-processing.src.yml`, `t1-processing-2.src.yml`): HZL Debari 1967 (foundation 1966), Vizag 1978, Chanderiya 1989, Pantnagar 2012 (HZL timeline); Hindalco Renukoot 1962, Muri Feb 1948, Belagavi 1969, Birla Copper Dahej 1998 (amalgamated 2002); KMML TiO2 plant 1984 (construction 1979; sponge plant inaugurated 27 Feb 2011); CMRL 1993 (incorporated 18 Aug 1989); DCW synthetic rutile 1970; Kutch Copper first unit 28 Mar 2024.
- Correction: DCW's synthetic rutile plant had first_public 1986, read from a column-garbled investor-deck timeline; 1986 is the year of the name change. DCW's own milestones page gives 1970. Stale evidence line removed.
- Promises: Manikaran lithium refinery (MoU with Gujarat Jan 2022, plant "in the next 3-4 years", nothing since; now MoU signed, target 2026); KMML-SAIL titanium sponge MoU 4 Apr 2013, stuck on technology by Dec 2014 (LS USQ 4612, via Wayback; the ministry's file has moved); NALCO gallium (Chalieco R&D agreement Dec 2015, BARC MoU May 2016, pilot still "being set up" in 2026); Waaree Nagpur ingot-wafer 10 GW by FY27 (management via Nuvama); Tata Power board approval 30 Apr 2026.
- Not dated (no primary source found yet): Sterlite Thoothukudi start, Binani Zinc (1967 in secondary sources), TTPL (incorporated 1946), NFC Hyderabad and Zirconium Complex, ICC and KCC smelters (1974-76 in secondary sources), Nicomet, Lanjigarh, BALCO; Reliance has no dated polysilicon promise (the 2022 AGM's "by 2024" was for cells and modules); NCMM parks and IREUK have no published target.

## Timelines: battery materials and magnets (2026-11-02)

- Materials (16) already carried announcement, target and commissioning dates from L3. Added the promise trail: Himadri LFP (Dec 2023: phase 1 within 27-36 months; now Q3 FY27), GFCL EV (LFP promised for Q3 2024; sales still pending in Aug 2026), Acutaas (expansion due H1 FY26; supplying from Jul 2026).
- Magnets: IREL's Bhopal Rare Earth & Titanium Theme Park was due by Sept 2025 under its DAE sanction (IREL AR 2024-25) and was inaugurated in May 2026 (AL Circle says 10 May; an IANS preview said Saturday 9 May; recorded to the month). Its record no longer shows the annual report's publication date as its only date. MAM Hyderabad: first magnets promised by Dec 2025; no production report found.

## Timelines: demand, overseas, research (2026-11-02)

- Demand: six cell plants had first_public set to the date of the source that listed them (mostly MHI answers of Feb 2026). Now: ACC PLI programme agreements of Jul 2022 for Ola (20 GWh), Reliance (5 GWh; a second 10 GWh agreement Feb 2025) and Rajesh Exports' ACC Energy Storage (5 GWh), each due "within two years from the appointed date" (target recorded as Jul 2024); Agratas MoU with Gujarat Jun 2023; Amara Raja MoU Dec 2022 and groundbreaking 6 May 2023; Exide foundation Sept 2022 with operations promised by end-2024, then end-FY26, commissioned 23 Sept 2026.
- Overseas: five consortium bids now carry their offer dates from the Standing Committee's 29th report (Mt Marion and Wodgina NBO 17 Dec 2024, revised 27 Sept 2025; Salta NBO Jan 2026, revised Feb 2026; Mt Holland and Andover sale paused Jun 2025, reopened Feb 2026). KABIL's San Jorge, Rio Grande, Jujuy, Lai Chau and the seven extra Catamarca blocks have no date beyond the report.
- Research: BARC from Jan 1954 (AEET). AMD, JNARDDC and CSIR-NIIST pages did not load or carry no founding date; left as found.
- Promise check (29 records with a promised date, as of 2 Nov 2026): 4 delivered late (Exide +21 months, Kendadih +13, IREL Bhopal park +8, Hindalco foil +6); 7 past their first date with no delivery (the three 2022 PLI cell plants by 28 months, Rakha, MAM magnets, LOHUM Krishnagiri, Neogen Pakhajan); 18 not yet due. "Original" is the earliest dated promise found, which for some (Amara Raja, Agratas) is already a revised one.

## App: profiles and year filter (2026-11-02)

- Full profile page per project record (`src/ui/profile.ts`, route `#/p/<id>`), opened from the drawer's "Full profile" link; blocks and recyclers fall back to the map. Shared drawer/profile pieces moved to `src/ui/parts.ts`.
- First-public year range in both panel views (`from`/`to` in the link). Pages no longer pick up map state in their URL, and searching from a page returns to the map.
- `apply_updates.py` now stamps `last_verified` on the records it updates; the 59 records updated in today's timeline pass were stamped 2 Nov 2026.
- QA: year links (4) and profile checks (one per layer, drawer link, back link, block fallback, year select) added; all pass.
