# Data Schema

All data lives in YAML under `data/`. YAML is the single source of truth: the app reads only the JSON that `scripts/build-data` generates from it.

Implement this schema as a JSON Schema, or as zod in TypeScript, inside `scripts/validate`. The validator must enforce every rule in §5.

---

## 1. Base record (every entity in every layer)

```yaml
- id: kmml-chavara-tio2              # kebab-case, unique across ALL files, stable forever
  name: "KMML Titanium Dioxide Pigment Plant"
  aliases: ["Kerala Minerals and Metals – Chavara"]   # other names used in sources
  layer: processing                   # blocks | mines | processing | materials | magnets | recycling | rnd | overseas | demand
  stages: [Refining]                  # one or more, from §3.1 (a site can span stages)
  minerals: [Titanium]                # canonical names from data/reference/minerals.yml ONLY
  products: ["TiO2 pigment (chloride route)"]   # free text, as stated in sources
  operator: "The Kerala Minerals and Metals Ltd"
  operator_type: PSU                  # §3.3
  owners:                             # optional; ownership/stake structure when known
    - { entity: "Government of Kerala", stake_pct: 100 }
  partners:                           # technology/JV/offtake partners
    - { name: "…", country: "…", role: technology }   # role: technology | jv | offtake | epc | finance | supply
  location:
    address: null                     # as given in source, if any
    village_or_town: "Chavara"
    district: "Kollam"
    state: "Kerala"
    country: "India"
    lat: 0.0                          # from geocoding/source — never from memory
    lon: 0.0
    precision: site                   # exact | site | town | district | state
    geometry: null                    # optional GeoJSON (Polygon/MultiPolygon) — mainly for blocks
  status: Operational                 # §3.2, layer-appropriate
  status_as_of: "2026-08-14"          # date of newest evidence for this status
  status_detail: null                 # one short line, shown on hover (e.g. "Annulled: <3 qualified bidders")
  capacity:
    planned:   { value: null, unit: null, basis: null, phase: null }
    installed: { value: null, unit: null, basis: null }
  investment:
    amount: null                      # as reported
    currency: null                    # INR_crore | USD_million | other (state it)
    basis: null                       # e.g. "total project cost, Phase 1"
  feedstock: null                     # Domestic ore | Imported intermediate | Imported ore | Scrap/secondary | Mixed | Not applicable | Unknown
  feedstock_detail: null              # e.g. "imported cobalt hydroxide from DRC via traders"
  schemes: []                         # ids from data/schemes.yml (e.g. ncmm-recycling, repm, ecms, acc-pli)
  scheme_status: {}                   # per scheme: { ncmm-recycling: Eligible }
  dates:
    first_public: "1972-01-01"        # REQUIRED: earliest public date the project existed (drives the time scrubber)
    announced: null
    mou: null
    approved: null
    construction_start: null
    original_expected_completion: null
    revised_expected_completion: null
    commissioned: null
    closed: null
  milestones:
    - { date: "2026-08-14", event: "…", source_id: "…" }
  narrative:
    significance: "…"                 # ≤2 sentences, why a non-expert should care
    what_it_does: "…"                 # ≤2 sentences
    why_it_matters: "…"               # ≤2 sentences, strategic angle (dependence, first-of-kind, gap it fills)
  related: []                         # ids of related entities (same operator, supplier/customer, re-offer, etc.)
  see_also: []                        # external links (e.g. fabs.pranaykotas.com facility page)
  confidence: high                    # high | medium | low (RESEARCH_PROTOCOL §8.5)
  last_verified: "2026-10-24"
  notes: null                         # conflicts, caveats, rejected values with sources
  sources:
    - id: kmml-ar-2025
      url: "…"
      title: "…"
      publisher: "…"
      tier: T2                        # T1..T5
      date: "2025-…"
      retrieved: "2026-10-24"
      archive_url: null
      supports: [status, capacity.installed, location]
```

## 2. Layer extensions

### 2.1 Blocks (`blocks.yml`)
```yaml
  block:
    concession_type: CL               # ML | CL | EL | Offshore-PL | Offshore-CL | ISA-contract | ISA-application
    auction_route: Centre             # Centre | State | ISA
    area_sq_km: null
    exploration_stage: G3             # G1 | G2 | G3 | G4 | unknown
    resources:                        # as stated in tender/GSI report; never computed
      - { mineral: Graphite, quantity: null, unit: null, grade: null, category: null, source_id: null }
  auction:
    history:                          # one item per offering; chronological
      - tranche: "Centre-T5"          # id from tranches.yml
        nit_date: null
        outcome: Preferred bidder     # Offered | Annulled | Preferred bidder | No bids | Pending
        outcome_date: null
        annulment_reason: null
        preferred_bidder: null
        final_offer_pct: null         # % of value of mineral dispatched
        reserve_price: null
    loi_date: null
    licence_or_lease_executed: null
    production_started: null
```
Valid block statuses: `Identified`, `Offered`, `Annulled`, `Re-offered`, `Preferred bidder`, `LoI issued`, `Licence / lease executed`, `Operational`.

### 2.2 Overseas (`overseas.yml`)
```yaml
  overseas:
    host_country: "Argentina"
    host_region: "Catamarca"
    indian_entities: ["KABIL"]        # all Indian participants
    stake_pct: null
    deal_type: Equity                 # Equity | Exploration rights | Offtake+equity | Bid | Evaluation | Processing plant abroad
    india_link: { city: "New Delhi", lat: …, lon: … }   # arc origin (HQ of lead Indian entity)
```
Overseas statuses add `Under evaluation`, `Bid submitted`, `Bid lost` and `Withdrawn` to the plant statuses.

### 2.3 R&D (`rnd.yml`)
```yaml
  rnd:
    institution_type: Academic        # Academic | CSIR | DAE | Ministry lab | Corporate R&D | Startup pilot
    programmes: [ncmm-coe]            # scheme/programme ids
    focus: ["REE separation", "Li extraction from brines"]
    funding: { amount: null, currency: null, funder: null }
```
R&D statuses: `Active`, `Concluded`, `Pilot`.

### 2.4 Demand (`demand.yml`)
```yaml
  demand:
    product: "Li-ion cells (LFP)"
    capacity_gwh: null
    inputs: [Lithium, Graphite, Nickel, Cobalt, Manganese]   # canonical names; drives "who consumes this mineral"
```

### 2.5 Schemes (`schemes.yml`)
```yaml
- id: ncmm-recycling
  name: "Incentive Scheme for Promotion of Critical Mineral Recycling"
  ministry: "Ministry of Mines"
  parent: ncmm
  outlay: { amount: 1500, currency: INR_crore, period: "FY2025-26 to FY2030-31" }
  dates: { approved: "2025-09-03", notified: "2025-10-02", applications_close: "2026-04-01" }
  status: Beneficiaries selected
  status_as_of: "2026-04-29"
  aggregates: { eligible_entities: 58, pledged_capacity: "850 KTPA", pledged_investment_inr_cr: 5000 }
  beneficiaries: []                   # entity ids, when known
  bidders: []                         # names without map points (e.g. REPM bidders with no known site)
  disbursed: { amount: null, as_of: null }
  sources: [...]
```

### 2.6 Tranches (`tranches.yml`)
```yaml
- id: Centre-T5
  route: Centre
  number: 5
  launched: null
  bids_due: null
  results_date: null
  offered: null
  auctioned: null
  annulled: null
  states: []
  minerals: []
  sources: [...]
```

### 2.7 GSI aggregates (`gsi_exploration.yml`)
One row per state per field season, with projects by stage (G4/G3/G2) and by mineral where available. Include sources.

## 3. Controlled vocabularies

### 3.1 Stages (also in `data/reference/stages.yml`, with colours)
`Exploration` · `Mining` · `Beneficiation` · `Refining` · `Materials` · `Magnets` · `Cells & Devices` (demand only) · `Recycling` · `R&D` · `Policy infrastructure` (processing parks, stockpiles)

### 3.2 Status
Use the layer-specific lists in §2 and `RESEARCH_PROTOCOL.md` §9. Plant statuses:

`Announced` · `MoU signed` · `Bid submitted` · `Approved` · `Under construction` · `Pilot` · `Operational` · `Expanding` · `Stalled` · `Cancelled` · `Closed`

### 3.3 Operator type
`PSU (Central)` · `PSU (State)` · `Government / Ministry` · `Listed private` · `Unlisted private` · `Startup` · `Foreign MNC` · `JV` · `Academic` · `Research lab` · `Consortium`

### 3.4 Confidence
`high` · `medium` · `low`

### 3.5 Source tier
`T1` … `T5` (see `RESEARCH_PROTOCOL.md` §2)

## 4. Derived fields (computed in build-data, never hand-entered)

- **`slippage_months`**: `revised_expected_completion` (or `commissioned`) minus `original_expected_completion`. Null if either date is missing.
- **`stalled_flag`**: true when no status-changing evidence has appeared for 18+ months past the original expected completion, and the record is not `Operational` or `Closed`.
- **`block_lag_months`**: from `Preferred bidder` to `Licence / lease executed`, and from there to `Operational`.
- **`dashboard_links`**: built from `minerals` using `minerals.yml`.
- **`display_point`**: polygon centroid when only `geometry` is given.
- **Aggregates for the app**: counts by stage × mineral, state × stage, status × stage; auction success rate by tranche, mineral and state.

## 5. Validation rules (scripts/validate must enforce all of them)

1. Schema conformance and enum membership for every controlled field.
2. `id` is unique across all data files.
3. Every value in `minerals` exists in `data/reference/minerals.yml`.
4. `dates.first_public`, `status`, `status_as_of`, `location.precision`, `confidence`, `last_verified` and at least one source are **required** on every record.
5. **Field-to-source coverage.** Every non-null key field must appear in at least one source's `supports`. The key fields are: status, operator, location (if precision is exact or site), capacity.*, investment, every non-null date, and auction outcomes.
6. **Status evidence bar** (`RESEARCH_PROTOCOL.md` §8.2):
   - `Operational`, `Preferred bidder`, `Approved`, `Cancelled` and `Annulled` need at least one T1/T2 source in `supports: [status]`, **or** two T3 sources with different publishers.
7. `lat`/`lon` lie within India's bounding box, or inside the stated country for overseas records. `scripts/geocheck` does the precise point-in-polygon test.
8. Dates are ISO `YYYY-MM-DD`, or `YYYY-MM` / `YYYY` when only that is known. No date may be in the future except expected-completion dates.
9. `confidence: low` requires an `OPEN_QUESTIONS.md` reference in `notes`.
10. Narrative fields are at most two sentences each and free of banned words (`CLAUDE.md` §6). This check is a warning, not an error.
11. Every `related` id and `schemes` id resolves.
12. No duplicate entities. Warn when two records share operator + district + overlapping minerals, or when block names are near-identical (normalised Levenshtein ratio > 0.85).
13. **Staleness warning** when `last_verified` is more than 120 days old.

## 6. Exports (built by scripts/build-data)

- `public/data/entities.json`: all records, flattened for the app.
- `public/data/entities.geojson`: points, with key properties.
- `public/data/blocks-polygons.geojson`: block geometries.
- `public/data/aggregates.json`: derived aggregates.
- `public/data/schemes.json`, `tranches.json`, `gsi.json`.
- `public/downloads/`: a CSV per layer and a full GeoJSON, for the Data page.
