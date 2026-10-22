# Research Protocol

This document governs all research in this project. When it conflicts with speed or convenience, this document wins. If a step here is impossible, for example a site blocks you, record the gap in `research/OPEN_QUESTIONS.md` and move on. Do not quietly skip it.

The standard to hold yourself to: **a senior analyst at a policy institute will audit a random 10% of entries against their sources. Every one must hold up.** Separately, a domain expert will scan the map for projects they know about. None should be missing.

---

## 1. Principles

1. **Primary over secondary.** An official notification, a tender document, a stock-exchange filing or a company's own release beats any article about it. Use news to *discover*; use primary sources to *confirm*.
2. **Recency is part of accuracy.** A correct 2024 status that changed in 2026 is a wrong status. Every entry gets a recency sweep (§8.3) before it is marked verified.
3. **Claims are field-level, not record-level.** A source that confirms a plant exists does not confirm its capacity. Track which source supports which field (§5).
4. **Absence of evidence goes in the record.** If you searched for a commissioning date and found none, the record says `null`, and the log says what you searched.
5. **Assume your memory is wrong.** Before writing any number, name or date, you must have it in front of you from a fetched source. This includes facts you are confident about.
6. **The seed facts in `LAYER_PLAYBOOKS.md` are leads, not data.** They were gathered quickly on 2026-10-22 from web pages, some summarised by a model. Re-verify every one.

## 2. Source hierarchy

Rank sources in this order. When two sources conflict, the higher tier wins unless the lower tier is clearly more recent and specific. Record the conflict either way (§8.4).

| Tier | Source type | Examples |
|---|---|---|
| **T1, primary official** | Gazette notifications, ministry orders, tender/NIT documents, auction result notices, Parliament Q&A answers, PIB releases, Cabinet decisions, statutory reports, court orders | egazette.gov.in, mines.gov.in, pib.gov.in, sansad.in / eparlib.sansad.in, MSTC auction portal, state DMG portals, CPCB EPR portal lists, PARIVESH clearance records, IBM (Indian Bureau of Mines) publications, GSI reports, MeitY/MHI scheme approval lists |
| **T2, primary corporate** | Stock-exchange filings, annual reports, investor presentations, earnings call transcripts, company press releases, DRHP/RHP prospectuses | BSE/NSE announcements, company IR pages, ASX/TSX filings for foreign partners |
| **T3, credible reporting** | National business and trade press with named reporting | Business Standard, Economic Times, Mint, Hindu BusinessLine, Financial Express, Reuters, Bloomberg, Mining.com, Fastmarkets, Argus, S&P Global, ET EnergyWorld, Mercom, AL Circle |
| **T4, analytical** | Think-tank and multilateral reports, academic papers | IISD, CEEW, CSEP, NITI Aayog, IEA, World Bank, USGS, Takshashila |
| **T5, weak** | Aggregators, listicles, SEO "top 10" pages, unattributed blogs, market-research teasers, LinkedIn posts, Wikipedia | Use only for discovery, never as the sole support for any field |

A T5 page may lead you to an entity. It may never be the only source for any field.

## 3. Fetching: how to read sources without being misled

- **The WebFetch tool summarises pages through a small model, and the summary can be wrong.** It is fine for discovery and triage. **Any number, date, name or status you record must be checked against the raw text.**
  - Fetch the raw text with `curl` (HTML → text via Python, `html2text`, or `lynx -dump`).
  - For PDFs, use `pdftotext -layout` (install `poppler-utils`, or use `pypdf`).
  - Then quote the excerpt from the raw text into the evidence log.
- **Save every T1/T2 document you rely on** to `research/raw/<domain>/<slug>.<ext>`. These can be audited later and survive link rot. Large binaries can be gitignored, but keep a `research/raw/MANIFEST.md` listing URL, retrieval date and sha256.
- **JS-rendered portals** (PARIVESH, some state portals, the EPR portal):
  - First look for an underlying JSON/XHR endpoint or a downloadable PDF/Excel.
  - Otherwise use a headless browser (Playwright) if installed. Install it if needed.
  - If it is still unreachable, log the gap and try an alternative route to the same fact.
- **Tables in PDFs** (Parliament answers, tender documents, CPCB lists): extract with `pdfplumber` or `camelot`. Then spot-check at least five rows by eye against the rendered page.
- **Dead links**: try the Wayback Machine (`https://web.archive.org/web/*/<url>`). Record `archive_url` in the source entry.
- **Regional-language sources** are allowed and often essential for state auctions, local plant openings and land allotments. Covering Hindi, Odia, Telugu, Kannada, Tamil, Marathi, Gujarati and Bengali can surface projects the English press missed. Translate the excerpt into English in the evidence log and keep the original.
- **Paywalls**: do not attempt to bypass them. Find the same fact in a T1/T2 source or another outlet.
- **Copyright**: store only short excerpts in evidence, at most 30 words. Never copy article paragraphs into the repo or the app.

## 4. Discovery: how to find everything

Use all four channels for every layer. One channel is never enough: each misses things the others catch.

### 4.1 Top-down: official registries and lists
Start every layer by enumerating the official lists that should contain its entities. Examples include:
- auction tranche notices and results
- Parliament answers that tabulate blocks or beneficiaries
- CPCB registered-recycler lists
- scheme beneficiary lists
- IBM's *Indian Minerals Yearbook* chapters, which list producers and plants per mineral
- PARIVESH environmental clearance proposals
- state investment-summit MoU lists

`LAYER_PLAYBOOKS.md` names the registries for each layer. Extract them fully, every row, then create or attach a record for each row.

### 4.2 Bottom-up: the query matrix
For each layer, run a systematic matrix of searches:

> **mineral × activity × geography × time**

- **Minerals**: the full canonical list from `data/reference/minerals.yml`, plus common synonyms (e.g., "REE", "rare earth", "neodymium", "NdFeB"; "black mass"; "LFP", "NMC", "pCAM").
- **Activities**: the stage vocabulary for the layer (mine, block, auction, plant, refinery, facility, recycling, recovery, commissioning, foundation stone, MoU, groundbreaking, land allotment, environmental clearance, consent to establish).
- **Geography**: every state and UT, plus major industrial clusters. Examples: Sanand, Dholera, Hosur, Sriperumbudur, Pune–Chakan, Hyderabad Genome Valley / Pharma City, Bhiwadi, Greater Noida, Manesar, Vizag, Paradip, Angul, Jharsuguda, Jamshedpur, Raipur, Bhilai, Korba, Vadodara, Dahej, Bharuch, Hazira, Ennore, Tuticorin, Kochi/Chavara.
- **Time**: run the most important queries again restricted to 2024, 2025 and 2026, so recent items surface.

You do not need every cell of the matrix. You do need enough cells that the saturation test (§7.2) passes. Log every query in `research/LOG.md` with its date and the number of new entities it yielded.

### 4.3 Snowballing
Every entity you find names other entities: partners, technology licensors, customers, suppliers, competitors, investors, the consultancy that wrote the DPR, the EPC contractor. Follow every one.

Also mine "list" articles and reports (IISD, CEEW, NITI, industry associations) for names. Then verify each name independently.

### 4.4 Adversarial gap-hunting
After a layer is drafted, a fresh-context agent tries to find what is missing using different strategies. See §7.3.

## 5. Recording: data and evidence

### 5.1 In the YAML record
Every record has a `sources` list. Each source states which fields it supports:

```yaml
sources:
  - id: pib-2277041
    url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2277041"
    title: "India's Critical Mineral Mission Gains Momentum: 56 Critical Mineral Blocks ..."
    publisher: "PIB"
    tier: T1
    date: "2026-06-23"            # publication date of the source
    retrieved: "2026-10-23"       # when you fetched it
    archive_url: null
    supports: [status, auction.tranche, dates.auctioned]
```

### 5.2 In the evidence log
`research/evidence/<datafile>.jsonl` holds one line per claim:

```json
{"entity":"<id>","field":"capacity","value":"10000 tpa","source_id":"<id>","excerpt":"<≤30-word verbatim excerpt from RAW text>","retrieved":"2026-10-23","checked_by":"researcher"}
```

The verifier adds its own lines with `"checked_by":"verifier"` and `"result":"confirmed|mismatch|unverifiable"`.

### 5.3 Other research files
- `research/LOG.md`: queries, decisions, inclusion calls, dead ends.
- `research/OPEN_QUESTIONS.md`: unresolved items, each with what was tried.
- `research/EXCLUDED.md`: every candidate considered and rejected, with the rule that rejected it. This lets the owner revisit inclusion rules without redoing research.
- `research/COVERAGE.md`: the reconciliation ledger (§7.1).

## 6. Coordinate protocol

Every location has `lat`, `lon` and `precision`. Allowed values for `precision`:

| precision | Meaning | Acceptable sources |
|---|---|---|
| `exact` | Within ~100 m of the actual site | Coordinates in a tender document, PARIVESH/EC proposal, EIA report, company document; or a verified street address geocoded and visually checked against satellite imagery |
| `site` | Within ~1–2 km (the industrial estate or SEZ plot area) | A named industrial estate / GIDC / MIDC / SIPCOT / KIADB / APIIC park geocoded to that estate |
| `town` | Town or village centroid | A named town or village with no better detail |
| `district` | District centroid | Only the district is known. Compute the centroid from `districts.geojson`; never eyeball it |
| `state` | State centroid | Last resort. These entries should be few; list each one in `OPEN_QUESTIONS.md` |

Rules:
1. **Never write coordinates from memory**, even for famous places.
2. **Auction blocks**: tender documents and block summary reports usually give boundary corner coordinates. Store them as a polygon in `geometry` and use the polygon centroid as the point. If only the village or district is known, use `town` or `district` precision.
3. **Geocoding**:
   - Use OpenStreetMap Nominatim, respecting its usage policy: at most 1 request per second, with a descriptive User-Agent. Cache results.
   - Always constrain to India and the expected state.
   - Reject any result whose state does not match.
4. **The geocheck script must pass.**
   - Each point must fall inside its stated state polygon, or inside India for offshore and border cases.
   - Overseas points must fall inside their stated country.
   - Each failure is fixed or logged.
5. **Several sites mean several records.** One company with three plants gets three records sharing an `operator`. Exceptions:
   - The source gives only one consolidated figure. Then make one record at the most specific shared location and note it.
   - A single block that appears in several tranches stays one record with a tranche history.

## 7. Completeness: three tests every layer must pass

### 7.1 Reconciliation against official anchors
`LAYER_PLAYBOOKS.md` lists, for each layer, official aggregate numbers. Examples: "88 unique blocks offered through Tranche 7", "58 entities eligible under the recycling scheme", "9 CoEs".

In `research/COVERAGE.md`, keep a table per layer with these columns:

| Column | Content |
|---|---|
| anchor | The official aggregate being reconciled against |
| anchor source + date | Where the anchor number comes from, and when |
| captured count | How many matching records the dataset holds |
| gap | Anchor minus captured |
| explanation of the gap | Why any gap exists |

A non-zero gap is acceptable only with a specific explanation, for example: "names of 21 of the 58 eligible recyclers are not published; see OPEN_QUESTIONS #14 for search steps taken". "Couldn't find" is not an explanation; list what was tried.

Also look for **new anchors**. If you find a more recent official count, use it and update the playbook seed in `LOG.md`.

### 7.2 Saturation test
A discovery channel is saturated when **at least 15 consecutive distinct queries** across at least 3 different query types (official-registry, matrix, snowball) produce **no new in-scope entity**. Record the saturation run in `LOG.md`.

For layers with large registries (recycling, mines), also take a random sample of 20 registry rows and confirm that every in-scope row is in the dataset.

### 7.3 Adversarial gap hunt
Spawn a fresh agent with this brief:

> "Here is a list of N entities in layer X (names only). Your job is to find in-scope entities NOT on this list. Use strategies the original researcher may not have used."

Strategies to give it:
- regional-language search
- PARIVESH/EC search by keyword
- stock-exchange announcement search by keyword
- state investment-summit MoU lists
- startup databases and accelerator cohorts (e.g., Startup India, DST, IIT incubators)
- conference exhibitor and speaker lists (e.g., India Battery Show, IESW, mining conclaves, SEMICON India's materials pavilion)
- job postings that name a plant
- tender awards (GeM, CPPP) for equipment going to a named plant
- court and NGT cases naming a project
- foreign partner filings (ASX/TSX/LSE) that mention India

The layer is complete when a gap hunt returns **zero** new in-scope entities. Alternatively, it may return only entities that are then confirmed out of scope and logged in `EXCLUDED.md`. If the gap hunt finds more than 3 new entities, add them, then run another gap hunt with a fresh agent.

## 8. Verification

### 8.1 Verifier procedure
For each record, a fresh-context verifier:
1. Re-fetches each cited source as raw text, not a summary.
2. For each field in `supports`, confirms the value appears in the source, or follows from it by trivial arithmetic. Logs `confirmed`, `mismatch` or `unverifiable` in the evidence JSONL.
3. Checks that the location matches the source and that `precision` is honest.
4. Checks that `status` meets the evidence bar in §9.
5. Runs the recency sweep (§8.3).

All `mismatch` and `unverifiable` results go back to the orchestrator to fix, then get re-verified.

### 8.2 Field-level evidence bars
| Field | Minimum evidence |
|---|---|
| Existence of the entity | 1 source, T1–T3 |
| `status` = Operational / Commissioned | T1 or T2, **or** two independent T3 sources reporting the commissioning |
| `status` = Auctioned / Preferred bidder / LoI / Lease executed | T1 (result notice, PIB, Parliament answer, state DMG notice) or T2 filing by the winner |
| `status` = Approved (scheme) | T1 approval list or T2 filing |
| `status` = Cancelled / Annulled / Stalled | T1/T2, or two T3 sources, **dated** |
| `capacity`, `investment` | T1/T2 preferred; a single T3 is acceptable with `confidence: medium`. Always store the figure as reported (currency, unit) |
| Dates (`announced`, `approved`, etc.) | The source that reports that event, with its date |
| `operator` / ownership / stake | T1/T2 preferred |
| Coordinates at `exact`/`site` | Per §6 |

### 8.3 Recency sweep
Before marking any record verified, search `"<entity name>" OR "<operator> <place>"` restricted to the last 12 months, and check the operator's latest filings or press page. Record the sweep date in `last_verified`.

If anything changed, update the record and add a milestone. This applies to old entries in particular. Projects announced in 2022–24 are often stalled, scaled down, relocated or cancelled.

### 8.4 Conflicts
When sources disagree:
1. Prefer the higher tier, then the more recent, then the more specific.
2. Record the chosen value in the record and the rejected value in `notes`, with both sources.
3. If the conflict is material and unresolvable (e.g., two official figures), add it to `OPEN_QUESTIONS.md` and set `confidence: medium`.

### 8.5 Confidence
| Value | Meaning |
|---|---|
| `high` | All key fields have T1/T2 support and the verifier confirmed them |
| `medium` | Key fields rest on T3, or there is an unresolved minor conflict |
| `low` | Existence or key fields rest on a single weak or old source. Low-confidence records are hidden by default in the app, and each needs an `OPEN_QUESTIONS` entry |

## 9. Status definitions

Use exactly these definitions. If the evidence doesn't meet a status, use the earlier one.

**For blocks:**

| Status | Definition |
|---|---|
| `Identified` | GSI or another agency has reported the deposit or block; not yet offered |
| `Offered` | In a notice inviting tender (NIT), with the tranche recorded |
| `Annulled` | The auction was cancelled for that block (e.g., fewer than 3 technically qualified bidders); record the reason |
| `Re-offered` | Offered again in a later tranche; the history is kept |
| `Preferred bidder` | Declared after the e-auction |
| `LoI issued` | Letter of intent issued |
| `Licence / lease executed` | Composite licence, mining lease or exploration licence executed |
| `Operational` | Production reported |

**For plants and projects:**

| Status | Definition |
|---|---|
| `Announced` | Public statement of intent, with no binding step yet |
| `MoU signed` | MoU with a state or partner; nothing more |
| `Bid submitted` | Applied or bid under a scheme; outcome pending |
| `Approved` | Scheme approval, a land allotment plus EC/CTE, or board-approved capex |
| `Under construction` | Groundbreaking or construction reported |
| `Pilot` | A pilot or demonstration scale unit is running |
| `Operational` | Commercial production reported |
| `Expanding` | Operational, with expansion under way |
| `Stalled` | No reported progress for more than 18 months past the announced timeline, or a reported halt |
| `Cancelled` | Officially dropped |
| `Closed` | Formerly operational, now shut (e.g., Sterlite Tuticorin) |

**For R&D:**

| Status | Definition |
|---|---|
| `Active` | The programme is running |
| `Concluded` | The programme has ended |

**For schemes:** `Approved`, `Notified`, `Applications open`, `Beneficiaries selected`, `Disbursing`.

Every status has a `status_as_of` date. It is the date of the newest evidence for that status, not the date you looked.

## 10. Definition of Done, per layer

A layer is done only when **all** of these are true:

- [ ] Every official registry named in the playbook has been fully extracted, or the reason it couldn't be is logged.
- [ ] The query matrix has run, and the saturation test passed and is logged.
- [ ] `COVERAGE.md` reconciles to every anchor, with an explanation for every gap.
- [ ] The adversarial gap hunt returned no new in-scope entities, or it was repeated until it did.
- [ ] A fresh-context verifier has checked 100% of key fields (status, operator, location, minerals, capacity, investment, key dates). All mismatches are resolved.
- [ ] Every record has a recency sweep and a `last_verified` date.
- [ ] `scripts/validate` and `scripts/geocheck` pass.
- [ ] No record has a field without a supporting source.
- [ ] Narrative fields follow the style rules in `CLAUDE.md` §6.
- [ ] The checkpoint summary has been printed to the owner.

## 11. Known failure modes to guard against

- **Model-summarised numbers.** A WebFetch summary says "10,000 tonnes" when the page says "10,000 tonnes *by 2030 in phases*". Always read the raw text.
- **MoU inflation.** State investment summits announce MoUs that never become plants. An MoU is `MoU signed`, nothing more. Check for land allotment, EC or construction before upgrading.
- **Announcement echo.** Ten articles repeating one press release are one source, not ten. Independence means separate reporting.
- **Stale status.** A 2023 article saying "will be commissioned by 2024" is not evidence of `Operational`.
- **Corporate renaming and restructuring.** For example, a recycler rebrands, or a JV changes partners. Track `aliases` and avoid duplicates.
- **Duplicated blocks.** The same block appears under slightly different names across tranches, or in both Centre and state lists. Normalise names and check district plus mineral to deduplicate.
- **Mixing announced and actual capacity.** Store `capacity.planned` and `capacity.installed` separately, and say which phase each refers to.
- **Currency and units.** Store the figure as reported (`₹ crore`, `USD million`, `tpa`, `GWh`, `MTPA`). Convert only at display time, with a stated rate and date.
- **Geocoding to the wrong same-named place.** India has many villages with the same name. Always constrain by state and district.
- **Overseas double counting.** A KABIL stake and a PSU consortium bid for the same project are one record with several Indian entities, not several records.

## 12. Subagent prompt template

When spawning a research subagent, include all of the following. Subagents have none of your context.

```
ROLE: Researcher for layer <LAYER> (<sub-scope>) of the India Critical Minerals Project Map.
TODAY: <output of `date`>.
GOAL: Find EVERY in-scope entity and draft fully sourced records.
SCOPE + INCLUSION RULES: <paste the layer's section from LAYER_PLAYBOOKS.md>
SCHEMA: <paste the relevant part of SCHEMA.md>
PROTOCOL: <paste RESEARCH_PROTOCOL.md §§1–9>
EXISTING RECORDS (names + ids only, to avoid duplicates): <list>
DELIVERABLES:
  1. YAML records -> research/drafts/<layer>-<n>.yml
  2. Evidence lines -> research/drafts/<layer>-<n>.evidence.jsonl (raw-text excerpts, ≤30 words)
  3. Query log -> research/drafts/<layer>-<n>.log.md (every query, date, yield)
  4. Exclusions -> research/drafts/<layer>-<n>.excluded.md
  5. Open questions -> research/drafts/<layer>-<n>.questions.md
RULES: Never write a fact from memory. Never guess coordinates. Raw text for every number.
       Unknown = null + open question. Report honestly what you could not reach.
```

The verifier and gap-hunter prompts follow the same pattern, with §8 and §7.3 as their core instructions respectively.
