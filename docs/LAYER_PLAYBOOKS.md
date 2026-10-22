# Layer Playbooks

One section per data layer, in the order you should research them. Each section covers:

- **Scope & inclusion rules**: what belongs in the layer and what does not.
- **Official registries to extract fully**: top-down discovery (`RESEARCH_PROTOCOL.md` §4.1).
- **Reconciliation anchors**: official aggregate counts for `COVERAGE.md` (§7.1).
- **Seed leads**: names and facts gathered on 2026-10-22. **These are leads to verify, not data.** Some came through model-summarised web pages and may be wrong or out of date. Re-verify every one against raw primary text before it enters a record.
- **Query hints and pitfalls.**

Scale target across all layers: **600+ records** (owner's decision: exhaustive, including recyclers and operating mines, overseas assets and demand anchors).

---

## L0. Reference data (Phase 0, before any research)

### Canonical mineral list
- Pull the canonical mineral names from **https://indiacriticalminerals.com**. It is the owner's dashboard, scoring 51 minerals.
- Inspect the site's JS/JSON bundle for the data, since the page itself is an app.
- Save it as `data/reference/minerals.yml` with these fields per mineral:
  - `name`, exactly as on the dashboard, including case and spelling
  - `symbol`
  - `dashboard_group` (id + label)
  - `synonyms`
  - `dashboard_url`, in the form `https://indiacriticalminerals.com/#mineral/<Name>`, e.g., `#mineral/Cobalt`
- Cross-check the result against the official Government of India critical minerals list (Ministry of Mines, 2023) and the critical/strategic minerals in Part D of the First Schedule to the MMDR Act. Note in `minerals.yml` which minerals are on which list.
- **If you cannot extract the 51-mineral list reliably, stop and ask the owner** for the file. Do not reconstruct it from memory.
- The owner's internal repo `github.com/tannmay-python/india-capability-map` (`capability_map.json`) also uses dashboard names and group ids. You may use it to cross-check names. **Do not** copy its internal estimates into this public-facing data. Its operator names are leads; cite the original sources, not the workbook.

### Boundaries
- **India and states:** the DataMeet composite used by Pranay. Get it from `github.com/pranaykotas/india-semiconductor-tracker` → `data/shp/datameet/india-composite.geojson`, or from the DataMeet maps repositories. Check DataMeet's licence and add attribution.
- **Districts:** DataMeet district boundaries, from the most recent vintage available. Districts are used for centroid fallback and choropleths.
- **World / globe:** Natural Earth Admin-0 countries in the **India point-of-view** variant. Natural Earth publishes POV editions; verify an IND edition exists and use it. If no suitable POV file exists, draw other countries from Natural Earth and replace India's polygon with the official India geometry.

### Value-chain stages
Write `data/reference/stages.yml` with the stage vocabulary from `SCHEMA.md` and a colour per stage. `BUILD_SPEC.md` covers choosing the palette.

---

## L1. Blocks: auctioned and offered mineral concessions (the geographic backbone)

**Data file:** `data/blocks.yml`, plus tranche metadata in `data/tranches.yml`.

### Scope & inclusion
Every critical-mineral block that has been **offered** in any of these channels:

1. **Central Government tranches** under the 2023 MMDR amendment. These are critical and strategic minerals in Part D of the First Schedule. Include every tranche from Tranche 1 (Nov 2023) onward, both mining leases (ML) and composite licences (CL).
2. **State Government auctions** of critical-mineral blocks (e.g., graphite, phosphorite, glauconite, REE, vanadium, nickel-chromium-PGE, tungsten, potash).
3. **Exploration licence (EL) auctions** for deep-seated and critical minerals, both by the Centre and by states.
4. **Offshore mineral blocks**, under the Offshore Areas Mineral (Development and Regulation) Act. Include only blocks whose minerals are on the canonical list (e.g., polymetallic nodules, heavy-mineral sands). Log construction-sand and lime-mud blocks in `EXCLUDED.md`.
5. **Deep-sea areas** held by India under International Seabed Authority (ISA) contracts, and any pending applications.

**Deduplication:** one record per block. A block that was annulled and re-offered is one record with a full `auction.history`. A block re-auctioned by a state after a central annulment is also one record. Check name variants plus district plus mineral.

### Official registries to extract fully
- **Each tranche's documents.** For every tranche:
  - the NIT
  - the block list with district, mineral, area, ML/CL and the geological report stage (G2/G3/G4)
  - the result notice, with preferred bidders and final offer percentages
  - annulments
- **Where to find them:**
  - the Ministry of Mines auction pages at `mines.gov.in`
  - the MSTC e-auction portal
  - PIB releases for each launch and each result
- **Tender documents and block summary reports.** These usually contain **block boundary coordinates**. Extract them into `geometry` polygons.
- **Parliament answers.** Lok Sabha and Rajya Sabha answers that tabulate blocks by tranche, state, district and mineral. Search `sansad.in` / `eparlib.sansad.in` for: critical mineral auction, tranche, graphite block, lithium block, rare earth block, glauconite, exploration licence, offshore mineral. Pranay Kotasthane's Parliament Committee Watch (parliamentcommittee.streamlit.app) is useful for Standing Committee on Coal, Mines and Steel reports.
- **State DMG portals.** These cover state-auctioned critical blocks for MP, Chhattisgarh, Odisha, UP, Karnataka, Arunachal Pradesh, Bihar, Jharkhand, Rajasthan, Tamil Nadu, Maharashtra, Andhra Pradesh, Gujarat, Telangana, West Bengal, Uttarakhand and Punjab.
- **Ministry of Mines annual reports** (2023-24, 2024-25 and 2025-26) and the monthly summaries to the Cabinet.
- **Offshore:** Ministry of Mines offshore auction pages; the first tranche of 28 Nov 2024 and later relaunches.
- **Deep-sea:** ISA contractor pages for India; Ministry of Earth Sciences (Deep Ocean Mission).

### Reconciliation anchors (verify each)
| Anchor | Seed value | Seed source |
|---|---|---|
| Unique blocks taken up for auction by the Centre, through Tranche 7 | 88 | PIB PRID 2277041, 23 Jun 2026 — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2277041 |
| Blocks successfully auctioned by the Centre, through Tranche 7 | 56 (≈63% success rate) | same |
| Tranche 7 | 19 offered (NIT 23 Mar 2026); 10 auctioned. First-time states: Gujarat, Uttarakhand, Telangana. Minerals: graphite, REE, vanadium, titanium, glauconite, rock phosphate | same |
| Tranche 8 | 20 blocks (13 new + 7 re-offered) in 9 states (AP, Bihar, Chhattisgarh, Maharashtra, Odisha, Punjab, Rajasthan, Telangana, WB). Minerals: REE, lithium, graphite, tungsten, vanadium. Launched 15 Jul 2026; technical bids due 21 Sep 2026. **Results not found as of 22 Oct 2026; search for them** | https://www.gktoday.in/government-offers-20-critical-mineral-blocks-in-eighth-auction-tranche/ ; Business Standard 15 Jul 2026 |
| EL blocks auctioned by the Centre (cumulative) | 11. The second EL tranche was completed, with first-time ELs in Arunachal Pradesh, UP and Odisha | PIB PRID 2277041 |
| All critical-mineral blocks auctioned, Centre + states, as of 10 Jan 2026 | 59 (13 ML, 46 CL) in 12 states: 34 by the Centre, 25 by states. By state: MP 15, Chhattisgarh 10, UP 7, Odisha 6, Karnataka 4, Arunachal 4, Bihar 3, Jharkhand 3, Rajasthan 2, Tamil Nadu 2, Maharashtra 2, Andhra Pradesh 1. Also 23 blocks were "under auction" at that date | Ministry of Mines NCMM status note, 10 Jan 2026 — https://mines.gov.in/admin/storage/ckeditor/NCMM'_1768030756.pdf |
| NCMM target | 100 blocks auctioned | same |
| Offshore first tranche | 13 blocks, 7 of them off Great Nicobar. Later relaunched after a failed attempt | https://scroll.in/latest/1076234/centre-to-auction-13-offshore-mineral-blocks-including-7-off-great-nicobar-island ; https://www.bairdmaritime.com/offshore/undersea-mining/india-tries-offshore-mineral-auction-again-after-failed-attempt |

Note: the NCMM note and PIB count differently. The NCMM figure covers "since April 2024 / total incl. states"; PIB counts "unique blocks by Centre". Reconcile both explicitly in `COVERAGE.md`.

### Seed leads: Tranche 5 and Tranche 6 block list
Source: Lok Sabha Unstarred Q. 535, answered 3 Dec 2025, Annexure II — https://eparlib.sansad.in/bitstream/123456789/3016121/1/AU535_rZga4s.pdf. The annexure also gives the **district** and ML/CL for each block. Extract those from the raw PDF.

**Tranche 5:**
1. Oranga-Revatipur Graphite & Vanadium (Chhattisgarh)
2. Katesar-Guneri Glauconite (Gujarat)
3. Salepali Graphite (Odisha)
4. Khobna & Agargaon Cluster Tungsten (Maharashtra)
5. Mincheri REE (Karnataka)
6. Ganacharpura Graphite (Karnataka)
7. Surajpura Phosphorite (MP)
8. Kelenda Glauconite (Chhattisgarh)
9. Raipura Phosphorite & Limestone (Chhattisgarh)
10. Semhardih Phosphorite & Limestone (Chhattisgarh)
11. Dombarahalli Phosphate & REE (Karnataka)
12. Holalkere-Doddaghatta Ni & PGE (Karnataka)
13. Jhandawali-Satipura Potash & Halite (Rajasthan)
14. Jorkian-Satipura-Khunja Potash & Halite (Rajasthan)
15. Nawatola-Laband REE (UP)

**Tranche 6:**
1. Laxmipuram Cobalt & Manganese (AP)
2. Pakro Vanadium & Graphite (Arunachal)
3. Sito Sikhe Vanadium & Graphite (Arunachal)
4. Chittalnar-Kumakoleng Tin/Ta/Nb (Chhattisgarh)
5. Siskari Pat Titanium & Bauxite (Jharkhand)
6. Gundlupet REE & Yttrium (Karnataka)
7. Kawalapur REE & RM (Maharashtra)
8. Bharatbahal Graphite-Mn-V (Odisha)
9. Kanaital Graphite-Mn-V-Co (Odisha)
10. Larambha Graphite-Mn-V-Co (Odisha)
11. Shergarh-Sherawala-Ramsara-Dalmirkhera Potash & Halite (Punjab)
12. Bhatikhera REE-Nb-Zr (Rajasthan)
13. Nimbli Rock Phosphate (Rajasthan)
14. RAMB Degana Tungsten & Lithium (Rajasthan)
15. SE of Gugrot REE & Nb (Rajasthan)
16. Govindpur V-Ti-Aluminous Laterite (Telangana)
17. Parvathapur V-Ti-Aluminous Laterite (Telangana)
18. Kathyur Phosphate (Uttarakhand)
19. Surharia-Basoha Ti-Bauxite (UP)
20. Beku Rare Metal, Cs-Li-Rb (WB)
21. Kalapathar-Raghudih REE & RM (WB)
22. Mincheri REE (Karnataka), re-offered from Tranche 5
23. Khobna & Agargaon Tungsten (Maharashtra), re-offered from Tranche 5

Mincheri and Khobna-Agargaon appearing in both tranches illustrates the re-offer pattern: each is one record with an auction history.

**Earlier tranches (1–4) and Tranche 7–8 block lists:** extract from PIB and tender documents. Tranche 1 was launched 29 Nov 2023.

**Other leads:**
- Coal India and HZL were among the successful bidders in Tranche 5: https://www.outlookbusiness.com/news/coal-india-hzl-among-successful-bidders-in-5th-round-of-critical-mineral-block-auction
- Lithium headline sites, each verified for current status:
  - Salal-Haimana, Reasi (J&K): auction annulled more than once
  - Katghora, Korba (Chhattisgarh): awarded in 2024
  - Degana, Nagaur (Rajasthan)
  - Marlagalla, Mandya (Karnataka): AMD find

### Fields specific to blocks
See `SCHEMA.md` → `auction` and `geology`. Capture:
- auction route
- tranche history
- ML/CL/EL
- area (sq km)
- exploration stage (G2/G3/G4)
- estimated resources as stated in the tender, with category and unit
- reserve price
- preferred bidder
- final offer (% of value of dispatched mineral)
- dates for LoI and for licence/lease execution
- whether production has started

### Pitfalls
- Block names are spelled inconsistently across documents.
- "Auctioned" in PIB parlance usually means a preferred bidder was declared, not that a lease was executed. Map statuses using `RESEARCH_PROTOCOL.md` §9.
- Annulment reasons, such as fewer than 3 technically qualified bidders, are analytically valuable. Capture them.

---

## L2. Rare-earth separation, metals and permanent magnets

**Data file:** `data/magnets.yml`

### Scope & inclusion
All of the following, at any status from `Announced` upward:
- rare-earth separation and refining
- rare-earth metal and alloy production
- NdFeB, SmCo and other rare-earth permanent magnet (REPM) manufacturing, sintered or bonded
- REPM scheme bidders and beneficiaries
- magnet recycling

### Official registries
- **Ministry of Heavy Industries: Scheme to Promote Manufacturing of Sintered REPM.**
  - Cabinet approval 26 Nov 2025; ₹7,280 crore.
  - Notified 15 Dec 2025.
  - RFP 20 Mar 2026; bids due 12 Aug 2026.
  - Technical bids opened 13 Aug 2026.
  - 6,000 MTPA total, up to 5 beneficiaries of up to 1,200 MTPA each.
  - **Find the selection result.**
- **MeitY ECMS approval lists.** These include magnet projects. The 31-project round reported in 2026 named Quantum Magnetics (REPM): https://www.autocarpro.in/news/govt-clears-31-new-projects-under-ecms-taking-total-approved-investment-to-rs-69548-crore-134154
- **IREL (India) Limited:** annual reports and the upcoming-projects page (https://www.irel.co.in/upcoming-projects). It lists an REPM plant at Visakhapatnam using indigenous technology.
- **DAE / BARC / NFTDC:** NFTDC supplied REPM technology (per the NCMM note).

### Anchors
| Anchor | Seed value | Source |
|---|---|---|
| REPM scheme bids received | 20 (3 of them joint bids) | https://psuwatch.com/newsupdates/coal-india-lt-neo-performance-among-20-bidders-under-rs-7280-cr-rare-earth-magnet-scheme-mhi (14 Aug 2026); Business Standard 13 Aug 2026 |
| REPM scheme beneficiaries | up to 5 | scheme notification |

### Seed leads: REPM bidders
19 bidders named in the press; the 20th is unidentified, so find it:
1. Coal India Ltd
2. Larsen & Toubro
3. NEO Performance Materials (Singapore)
4. Proterial (India)
5. Attero Recycling
6. Lohum Magnets & Energy Solutions
7. ReNew
8. 20 Microns
9. Jay Fe Cylinders
10. NAN Magnetech
11. Nexon Geochem
12. PrNd Metal and Magnets
13. Prozeal Green Energy
14. Ramp Metals & Minerals
15. Shankaranarayana Constructions
16. Solpro Greentech
17. Starteck Finance
18. BaRupOn–IRP Consortium (Keystone Infra + Huebox Interiors)
19. Midwest Energy + Midwest Advanced Materials JV

**A bidder becomes a record only if a location can be established.** Many bids name a proposed site. Otherwise, record the bidder in `schemes.yml` as a bidder without a map point, and log it in `OPEN_QUESTIONS`.

### Other leads to verify
- **IREL units:** OSCOM (Odisha), Chavara (Kerala), Manavalakurichi (Tamil Nadu), the Rare Earths Division at Aluva (Kerala), the Rare Earth Permanent Magnet plant at Visakhapatnam, and the Rare Earth Themed Park at Bhopal.
- **Toyotsu Rare Earths India** (Visakhapatnam).
- **Midwest Advanced Materials** (Hyderabad area).
- **Sona Comstar:** local magnet production announcement (S&P AutoTechInsight).
- **Nexon Geochem:** fully integrated 1,200 MTPA NdFeB facility targeted by FY2033 (pv-magazine India).
- **Uno Minda / Mahindra:** exploring magnet production.
- **Vedanta / JSW:** reported interest.
- **The "India's first rare earth magnet plant to be set up in Greater Noida" (KNN India):** identify the company.
- **Government targets:** about 5,000 t of magnets by 2030.

### Pitfalls
- Distinguish **separation** (oxides), **metal/alloy** and **magnet** stages. One company may span all three; split records by site, not by stage, and list multiple `stages` on a record where one site does several.
- Bonded and sintered magnets have very different difficulty. Record which.

---

## L3. Battery and advanced materials

**Data file:** `data/materials.yml`

### Scope & inclusion
Manufacturing (pilot scale or above) of:
- cathode active material (LFP, NMC, LMFP, LMO) and precursors (pCAM)
- anode materials (natural and synthetic graphite, silicon-carbon)
- electrolyte salts and solvents (LiPF6 and others)
- electrolyte additives
- separators
- battery-grade copper and aluminium foil
- conductive additives (acetylene black, carbon nanotubes)
- binders
- lithium salts: carbonate and hydroxide when made from intermediates. Lithium refining from ore or brine sits in L4.

**Exclude:**
- cell manufacturing (L9 demand anchors)
- battery pack assembly
- trading-only companies

### Official registries
- **MeitY ECMS approval rounds.** Extract every approved project touching battery materials, magnets or critical-mineral components. The total was 106 projects across 15 states (₹69,548 cr) as of the round reported in 2026; find every round.
  - Seed names from one round: Epsilon C2GR (anode), PCBL Chemical (acetylene black), Acutaas Chemicals (electrolyte additives).
- **PARIVESH** environmental-clearance proposals searched by keyword: anode, cathode, graphite, LFP, electrolyte, lithium, battery material.
- **State industrial policy approvals:** SLSWCA, SIPB and high-level clearance committee minutes for Karnataka, Gujarat, Telangana, Tamil Nadu, Maharashtra, Odisha, UP and others.
- **BSE/NSE filings** of listed players.

### Seed leads (verify each)
- **Epsilon Advanced Materials**
  - Graphite anode; ECMS approval of about ₹145 crore support (Aug 2026)
  - Karnataka MoU, ₹9,000 crore
  - Overseas plants: track US and Finland in L8
  - Sources: https://www.businesstoday.in/latest/corporate/story/epsilons-lithium-ion-battery-anode-project-gets-government-nod-549897-2026-08-18 ; https://autocarpro.in/news/epsilon-advanced-materials-signs-mou-with-karnataka-govt-to-invest-rs-9000-crore-113220
- **Himadri Speciality Chemical**
  - Anode material plant in West Bengal, commissioned 2026 ("India's first")
  - LFP cathode plans
  - Sources: Drishti / newsonprojects / Investing.com Q2 FY27
- **Altmin:** cathode factory, reported as India's first. Source: https://yourstory.com/2026/08/altmin-lithium-battery-cathode-factory
- **Further leads:** PCBL (acetylene black), Acutaas (electrolyte additives), Neogen Chemicals (electrolytes / LiPF6), Gujarat Fluorochemicals (LiPF6, fluorochemicals), Tata Chemicals (battery materials), Hindalco (battery-grade foil), HEG and Graphite India (synthetic graphite / anode ambitions).

### Pitfalls
- Many announcements are capacity in "GWh-equivalent". Store as reported, with the unit.
- Separate pilot lines from commercial plants.

---

## L4. Processing, refining and chemicals (non-battery midstream)

**Data file:** `data/processing.yml`

### Scope & inclusion
Plants whose **primary product is a canonical-list mineral or its direct refined form**. This covers:
- beneficiation plants for critical-mineral ores
- smelters and refineries (copper, zinc-lead with by-product cadmium, silver, germanium and indium, cobalt, nickel)
- lithium refining (ore or brine to carbonate or hydroxide)
- gallium recovery at alumina refineries
- titanium: TiO2 pigment, sponge, slag
- zirconium and hafnium
- tungsten, molybdenum and vanadium processing
- ferro-alloys of canonical minerals (e.g., ferro-vanadium, ferro-molybdenum, ferro-titanium, and ferro-silicon or silicon metal if silicon is canonical)
- **silicon metal, polysilicon, ingot and wafer**
- graphite purification and spheronisation (or in L3 if anode-integrated)
- phosphate and potash beneficiation, only if these minerals are canonical
- precious-metal and PGM refining from primary sources
- selenium and tellurium recovery from copper anode slime
- **government processing parks** under NCMM

**Exclude (log in `EXCLUDED.md` as classes, with counts):**
- solar module-only plants
- fertilizer plants (they are demand, not mineral processing)
- downstream steel
- aluminium smelters, except where they recover gallium or vanadium
- generic chemical plants

**Owner decision flagged:** whether ferro-manganese and ferro-chrome producers are in scope depends on whether manganese and chromium are on the canonical list. If they are, the count could be large. Check the list, and raise it at the first checkpoint before researching that class.

### Official registries
- **IBM *Indian Minerals Yearbook*:** the latest edition, mineral by mineral. Chapters list producing plants and smelters. This is the primary exhaustiveness source for this layer and for L6.
- **PARIVESH** EC proposals by keyword.
- **Ministry of Mines NCMM processing parks** and the **lithium-nickel processing incentive scheme**. The latter was being prepared in 2026; check whether it has been notified: https://psuwatch.com/newsupdates/govt-to-launch-lithium-nickel-processing-incentive-scheme-soon
- **PSU annual reports:** Hindustan Copper, Hindustan Zinc, NALCO, IREL, KMML, MIDHANI, Coal India, NMDC, NLC, GMDC, OMC.

### Anchors
| Anchor | Seed value | Source |
|---|---|---|
| NCMM processing parks | 4. States: Odisha (Paradip), Gujarat, Andhra Pradesh, Maharashtra. ₹500 crore. Single-element parks, lithium and nickel first. Locations finalised at a meeting on 22 Apr 2026 | https://www.energywatch.in/critical-minerals/govt-identifies-4-states-for-critical-mineral-parks-pushes-processing-and-recycling-ecosystem ; https://www.business-standard.com/industry/news/odisha-s-paradip-to-anchor-critical-minerals-value-chain-with-mega-park-126072101301_1.html |
| Tailings / overburden / fly-ash recovery pilots | Guidelines issued 14 Nov 2025; 1 REE recovery project approved as of 10 Jan 2026 | NCMM note |

### Seed leads (verify each)
- NALCO gallium recovery at Damanjodi (alcircle: "set to pioneer gallium production")
- **Hindustan Zinc:** smelters at Chanderiya, Dariba and Debari; by-product cadmium and silver; any germanium or indium plans
- **Hindustan Copper:** Indian Copper Complex at Ghatsila (Jharkhand), Khetri (Rajasthan), the Malanjkhand concentrator (MP), and the Taloja refinery
- **Copper smelters:**
  - Hindalco's copper smelter at Dahej (Gujarat), including any selenium and tellurium recovery
  - Adani Kutch Copper (Mundra)
  - Vedanta Sterlite Tuticorin, `Closed`
- **Cobalt and nickel:** Nicomet (Goa) and Rubamin (Vadodara), refining imported intermediates
- **Titanium:**
  - KMML (Chavara): TiO2 pigment and titanium sponge
  - Travancore Titanium Products
  - VV Mineral / private mineral-sands processors (check their current legal status)
- **Silicon:** polysilicon and ingot/wafer projects. Leads include Reliance (Jamnagar), Adani (Mundra), Waaree and Indosol. Verify each project's actual stage.
- **Lithium refining:**
  - Manikaran Power with Neometals (Australia): announced refinery; determine its current status
  - any NCMM-park lithium refinery

### Pitfalls
- PSU annual reports describe capacity in different bases (e.g., ore vs metal). Store as reported.
- Several "first lithium refinery" claims exist. Determine which actually produced battery-grade material, and when.

---

## L5. Recycling and secondary recovery

**Data file:** `data/recycling.yml`

### Scope & inclusion: exhaustive
**Include:**
- **Lithium-ion battery recyclers** at both stages:
  - pre-processing / black mass
  - hydrometallurgical recovery
- **E-waste recyclers that recover metals.** Hydrometallurgical or pyrometallurgical recovery of copper, precious metals, PGMs, cobalt, gallium, indium and similar. Pure dismantlers and collectors are **excluded**; log them as a class with a count.
- **Magnet and rare-earth recyclers.**
- **Catalytic-converter / PGM recyclers.**
- **Industrial scrap recovery of canonical minerals:** spent catalysts (Mo, V, Co, Ni), carbide/tungsten scrap, superalloy scrap.
- **Tailings, slag, red-mud and fly-ash recovery projects**, including NCMM pilots.

**Default exclusions, flagged for owner review at checkpoint:**
- **Lead-acid battery recyclers** and **secondary copper and aluminium scrap processors.** There are hundreds of them. Include one only if it explicitly recovers a canonical mineral as a product (e.g., antimony, if canonical) or also runs Li-ion recovery.
- Log each excluded class with its registry count in `EXCLUDED.md`.

### Official registries (extract fully)
- **CPCB Battery Waste Management EPR portal:** the registered **recyclers and refurbishers** list (lithium-ion and other chemistries, with addresses and capacities where given). Find the downloadable list. If the portal is JS-rendered, use the protocol in `RESEARCH_PROTOCOL.md` §3.
- **CPCB E-Waste (Management) Rules 2022 EPR portal:** registered **recyclers** list, and the separate dismantlers list. Use the recyclers list for discovery, then filter by recovery activity.
- **State Pollution Control Board consent lists**, for authorised recyclers of hazardous and other waste.
- **The NCMM Incentive Scheme for Promotion of Critical Mineral Recycling.** ₹1,500 crore; notified 2 Oct 2025; applications until 1 Apr 2026; Project Management Agency is JNARDDC.
  - **The 58 eligible entities are not named in any official release found so far.**
  - Reconstruct the list from company announcements ("eligible under the critical mineral recycling incentive scheme"), stock-exchange filings, JNARDDC or Ministry pages, Parliament answers after April 2026, and trade press.
  - Keep a `scheme_status` on each record: `Eligible`, `Applied (unconfirmed)` or `Not applicable`.
- **EU–India Trade and Technology Council EV battery-recycling startup shortlist** (EEAS).
- **Startup programmes:** Startup India, DST, BIRAC-like, NITI, and IIT incubators (e.g., IIT Madras, IIT Bombay SINE, IIT Delhi, IISc).

### Anchors
| Anchor | Seed value | Source |
|---|---|---|
| Entities eligible under the NCMM recycling scheme | 58 (20 cleared 30 Mar 2026 + 38 on 29 Apr 2026); ~850 KTPA pledged capacity; ~₹5,000 crore pledged investment | PIB PRID 2256977 — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2256977 ; https://renewablewatch.in/2026/05/04/ministry-of-mines-approves-58-companies-under-the-critical-mineral-recycling-scheme/ |
| Recovered output on an EPR-credit basis, 2024-25 | Li 200 t, Ni 297 t, Co 1,117 t, Cd 10.8 t | NCMM note, 10 Jan 2026 |
| CPCB registered Li-ion battery recyclers | **find the count** | EPR portal |
| CPCB registered e-waste recyclers | **find the count** | EPR portal |

### Seed leads (verify each)
- Attero (Roorkee and other sites)
- Lohum (Greater Noida and other sites)
- Recyclekaro
- BatX
- Exigo
- Metastable Materials (Bengaluru)
- Ziptrax
- Rubamin
- Gravita
- Cerebra
- NavPrakriti
- Tata Chemicals (battery recycling)
- Hindalco (if any)

Several of these are also REPM bidders (Attero, Lohum); cross-link them.

### Pitfalls
- Many recyclers have several plants. One record per plant.
- "Capacity" may mean battery input tonnes or recovered metal tonnes. Store the basis.

---

## L6. Operating mines and by-product streams

**Data file:** `data/mines.yml`

### Scope & inclusion: exhaustive
Every **operating or recently operating** mine whose output is, or yields as a by-product, a canonical-list mineral. This includes:
- PSU and private leases
- captive mines
- beach-sand (heavy mineral) operations
- by-product streams at mines, e.g., cadmium and silver from zinc-lead mines

Auctioned blocks that have started production stay in L1 with status `Operational`. Do not duplicate them here.

### Official registries
- **IBM *Indian Minerals Yearbook*:** mineral chapters list producing mines, with operators and districts.
- **IBM Monthly Statistics of Mineral Production** and the **IBM mining tenement / lease registers.** State lease lists are available on state DMG portals.
- **IBM's list of reporting mines.**
- **PSU annual reports:** Hindustan Copper, Hindustan Zinc, IREL, KMML, NMDC (e.g., tin at Govindpal), RSMML (rock phosphate at Jhamarkotra; tungsten), OMC, GMDC, MOIL, AMD.
- **Atomic minerals:** report only what is public. Mark strategic facilities with `precision: district` or coarser if exact locations are not public.

### Seed leads
- **Hindustan Zinc mines:** Rampura Agucha, Sindesar Khurd, Zawar, Rajpura Dariba, Kayad
- **Hindustan Copper mines:** Khetri, Kolihan, Malanjkhand, Surda
- **Heavy mineral sands:** IREL beach-sand mines in Odisha, Kerala and Tamil Nadu; KMML at Chavara
- **Graphite:** mines in Jharkhand (Palamu), Odisha and Tamil Nadu
- **Rock phosphate:** Jhamarkotra (RSMML)
- **Tin:** Bastar

### Pitfalls
- Do not treat iron ore, coal, bauxite or limestone mines as in scope unless they report a canonical by-product. If bauxite, manganese or chromite are on the canonical list, scope expands considerably. Check, and flag it at the checkpoint.

---

## L7. Research, Centres of Excellence and pilot plants

**Data file:** `data/rnd.yml`

### Scope & inclusion
- NCMM Centres of Excellence
- CSIR, DAE, DST and MoM institutes with active critical-mineral programmes
- university labs with funded critical-mineral projects (e.g., ANRF-MAHA grants)
- pilot plants and demonstration units
- skill centres under NCMM
- corporate R&D centres dedicated to critical minerals

**Exclude:** individual researchers without a funded programme.

### Official registries
- **PIB releases on NCMM CoEs:**
  - 7 recognised in Aug 2025 (PIB PRID 2151287 — https://www.pib.gov.in/PressReleasePage.aspx?PRID=2151287)
  - 2 more, IISc Bengaluru and C-MET Hyderabad, recognised 25 Oct 2025
  - total 9
- **ANRF-MAHA Critical Raw Materials Research Programme:** ₹210 crore; portal opened 7 Jan 2026. **Find awardees.**
- **CSIR lab pages:**
  - IMMT Bhubaneswar
  - NML Jamshedpur
  - CECRI Karaikudi
  - NCL Pune
  - CGCRI
  - AMPRI
  - others as found
- **DAE:** BARC, AMD regional centres, IREL R&D, NFTDC Hyderabad
- **JNARDDC Nagpur**
- **NIRM**
- **IBM labs**

### Anchors
| Anchor | Seed value |
|---|---|
| NCMM CoEs | 9 (target in the note: 3; the Ministry exceeded it) |
| ANRF-MAHA CRM awardees | find |

### Seed lead
The first 7 CoEs are **believed** to be:
- IIT Bombay
- IIT Hyderabad
- IIT (ISM) Dhanbad
- IIT Roorkee
- CSIR-IMMT Bhubaneswar
- CSIR-NML Jamshedpur
- NFTDC Hyderabad

**Verify against PIB 2151287. Do not trust this list.**

---

## L8. Overseas assets (Indian-held, abroad)

**Data file:** `data/overseas.yml` (shown on the globe view)

### Scope & inclusion
- Critical-mineral **assets, stakes, offtakes with equity, exploration areas and processing plants abroad** held by Indian entities: PSUs, KABIL, and private Indian companies.
- Bids and evaluations under active pursuit, shown as distinct statuses: `Under evaluation`, `Bid submitted`, `Bid lost`.

**Exclude:**
- pure trade deals
- government-to-government MoUs with no asset. Record these in `schemes.yml` as diplomacy entries.

### Official registries
- **KABIL:** releases and the Ministry of Mines annual reports.
- **PSU annual reports:** Coal India, NLC, Oil India, ONGC Videsh, NMDC, SCCL, BPRL.
- **Private company filings:**
  - Vedanta: Konkola Copper Mines, Zambia
  - Hindalco
  - Epsilon: overseas anode plants
  - Tirupati Graphite: Madagascar (Indian promoters, UK-listed)
  - Altmin and others, as found
- **Minerals Security Partnership** project lists.

### Anchors
| Anchor | Seed value | Source |
|---|---|---|
| Target overseas assets | 50 by March 2031 | ThePrint — https://theprint.in/india/governance/from-delays-to-stiff-competition-why-indias-overseas-critical-minerals-quest-is-hitting-roadblocks/3016667/ |

### Seed leads (verify each)
- **Argentina, Catamarca: KABIL's 5 lithium brine blocks** (acquired from CAMYEN, January 2024).
  - **Conflict to resolve:** the NCMM note (Jan 2026) says feasibility by December 2027 and production by end-2029. ThePrint says production slipped to December 2030.
  - Also: 7 more Catamarca blocks under evaluation; 2 in Jujuy under discussion; a Salta bid with a PSU consortium was not selected.
- **Australia:**
  - 5 lithium projects shortlisted
  - Mt Marion and Wodgina lost to POSCO
  - Mt Holland and Andover under evaluation; paused June 2025, reopened February 2026
  - Delta Lithium judged unsuitable
- **Chile:** NDA with ENAMI; an application missed its deadline.
- **Mali:** KABIL with Uranium One; due diligence on hold.
- **Brazil:** a lithium PPP was facilitated and linked to an Indian refinery.
- **Coal India:** reported overseas lithium investments (Chile/Argentina). Verify via Coal India filings.
- **Zambia:** Vedanta's KCM (copper and cobalt); GSI-assisted exploration areas, if any.

### Location
Use the project's actual site, at `exact` or `site` precision where public. Store an `india_link` (the Indian entity's HQ city) to draw the arc from.

---

## L9. Demand anchors

**Data file:** `data/demand.yml` (rendered in a muted style, toggled off by default)

### Scope & inclusion
- **Lithium-ion cell gigafactories of 1 GWh or more**, at any status from `Announced` up: ACC PLI beneficiaries and others.
- **Compound-semiconductor fabs** that consume gallium, germanium or indium. **Link these to Pranay's tracker entries rather than duplicating them**; one-line records with `see_also` pointing to fabs.pranaykotas.com.
- **In-house magnet users** only where they announce magnet production. If so, it goes in L2 instead.

### Registries
- **MHI ACC PLI:** beneficiary lists and progress statements, from both bid rounds.
- **Company filings.**
- **PARIVESH.**

### Seed leads (verify)
- ACC PLI awardees, believed to include Ola Electric, Reliance and Rajesh Exports from the 2022 round, and Reliance from the 2024 round.
- Gigafactories: Tata Agratas (Sanand), Amara Raja (Telangana), Exide (Bengaluru), Reliance (Jamnagar; operations expected late 2026), Ola (Krishnagiri).

---

## L10. Schemes, money and exploration aggregates

**Data files:** `data/schemes.yml`, `data/gsi_exploration.yml`, `data/tranches.yml`

### NCMM outlay heads (₹ crore, 2024-25 to 2030-31)
Total ₹16,300 crore, per the NCMM note of 10 Jan 2026. Re-verify against the Cabinet note and PIB. The NCMM is often cited as ₹34,300 crore including PSU and other spend; record both, with their bases.

| Head | ₹ crore |
|---|---|
| Domestic exploration, GSI | 4,000 |
| Domestic exploration, NMET | 3,000 |
| Risk coverage for foreign sourcing | 4,000 |
| Overseas exploration support | 1,600 |
| Recycling incentive | 1,500 |
| Recovery pilots | 100 |
| R&D and human resources | 500 |
| International R&D | 500 |
| Skill development centres | 100 |
| Processing parks | 500 |
| Stockpiling | 500 |

### Other schemes to record
- REPM scheme: ₹7,280 crore
- ECMS: counts and totals
- ACC PLI: verify the outlay
- lithium-nickel processing incentive, if notified
- customs-duty exemptions on critical minerals (Budgets 2024-25 and 2025-26)
- MMDR amendments of 2023 (Part D) and 2025 (overseas support)
- the stockpile programme

**For each scheme:** outlay, notification date, status, beneficiaries (linked by entity id), and disbursement to date where published.

### GSI and NMET exploration
- Projects since April 2024: 523, against a target of 1,200.
  - 2024-25: GSI 195, NMET-funded 62
  - 2025-26: GSI 230, NMET-funded 36
- GSI's 2025-26 field season: 227 dedicated critical-mineral projects (Business Standard, 19 Jan 2025).
- **Build state-level aggregates** from GSI's annual Field Season Programme documents and the GSI/NMET portals, to drive a choropleth. Point-level records are not required.

---

## Running order and expected sizes (rough planning numbers, not targets to hit)

| Order | Layer | Expected records |
|---|---|---|
| 1 | L1 Blocks | 160–200 (Centre ~100 incl. Tranche 8, states 30–50, EL 15–25, offshore and deep-sea 15–20) |
| 2 | L2 Magnets & rare earths | 20–35 |
| 3 | L3 Battery materials | 30–50 |
| 4 | L4 Processing & refining | 50–90 |
| 5 | L5 Recycling | 100–200 (depends on registry filters) |
| 6 | L6 Operating mines | 50–120 (depends on canonical scope) |
| 7 | L7 R&D | 30–50 |
| 8 | L8 Overseas | 20–40 |
| 9 | L9 Demand | 15–30 |
| — | L10 Schemes / GSI | aggregates |

The UI build (Phase 2) can begin once L1 and L2 are done.
