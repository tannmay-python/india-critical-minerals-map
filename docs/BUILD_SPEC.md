# Build Spec: the app

The app is a static, client-side map application built from the YAML data. It should feel like a serious analytical instrument: fast, precise and beautiful. It should not feel like a template dashboard.

If a `frontend-design` skill (or similar design guidance) is available in your environment, load it before designing the UI.

## 0. Editorial decisions (owner, 25 Oct 2026)

The owner asked for a map first and minimalism over completeness ("Don't burden it so much with analysis... Minimalism is beauty"). Where this spec and the build differ, the build follows these decisions:

- **One map, two framings.** "In India" and "Abroad" are a switch on the map, not separate routes. Abroad shows the world with a curved line from each Indian holder's home city; solid for assets held, dashed for bids and evaluations. No 3D globe, which cannot show Argentina and Australia at once.
- **Built on the map:** stage, status, mineral, state/country and scheme filters with live counts; a demand toggle (off by default, drawn fainter); search; a soft halo for district- or state-level locations; a picker when markers share a spot; a mineral strip that shows the chain for a picked mineral, with empty stages as gaps and a link to the dashboard; a detail panel with sources labelled official, company or press, archived copies, milestones, delay and a copy-link button.
- **One About page** (`#/about`) replaces the method and data views: how to read the map, what is included, sources and confidence, known gaps, downloads and credits.
- **Left out, for now:** the value-chain matrix, auction tracker, timeline and slippage, and policy views (§3.3–3.6); the time scrubber, the "story so far" panel, cluster donuts, and the operator-type, feedstock and confidence facets. The analysis can live elsewhere later; the data already carries it.
- **Light only, Takshashila house style** shared with the India Critical Minerals Dashboard, Inside the Motor and the Tech Laws atlas: plum header with the Takshashila logo, cream paper, white cards, Newsreader headings, Hanken Grotesk text, Space Mono labels, marigold accents. This replaces §4's Inter / Roboto Mono and the dark-mode toggle.
- **Record links:** `#/?id=<id>` and `#/e/<id>` both open the record on the map. No separate static entity pages.
- **QA** is scripted: `node scripts/qa.mjs` (counts, links, console, screenshots, boundary close-ups) and `scripts/linkcheck.py` (source URLs).

---

## 1. Stack

| Concern | Choice | Notes |
|---|---|---|
| Build | **Vite + TypeScript** | Use relative `base: './'` so the site works under a GitHub Pages subpath and opened locally. |
| UI | Vanilla TS modules, or **Preact** if state gets complex | No heavy frameworks. Keep the bundle lean. |
| Map | **MapLibre GL JS v5+** | Needed for **globe projection**. |
| Arcs (overseas) | Native MapLibre line layers built from **great-circle LineStrings** (`@turf/great-circle`) | These render correctly on the globe. Add deck.gl only if a need arises that native layers can't meet, and check its globe compatibility first. |
| Search | **Fuse.js** | Fuzzy search over names, aliases, operators, places and minerals. |
| Charts | **Observable Plot**, or hand-built SVG | Consistent with the brand tokens. |
| Data | JSON/GeoJSON emitted by `scripts/build-data` from YAML | Never hand-edit the JSON. |
| Hosting | **GitHub Pages via GitHub Actions** | The owner is fine with publishing immediately. Add `<meta name="robots" content="noindex,nofollow">` and a visible "Working draft, not for circulation" banner. |

### Basemap
- **No API keys.** Use **OpenFreeMap** vector styles (positron-like for light mode, and a dark style for dark mode; check which styles exist), or a self-hosted **Protomaps** PMTiles extract.
- **Strip from the style** every layer that draws administrative boundaries, disputed areas, or country labels. In OpenMapTiles-schema styles, that is any layer whose `source-layer` is `boundary`, plus country-label layers.
- Then overlay:
  - `india-boundary.geojson`: a crisp outline in a neutral ink colour
  - `states.geojson`: thin state lines
  - on the globe, `world-ind-pov.geojson` for other countries' outlines
- The result must never show a non-official depiction of India's boundary at any zoom level or in either projection. **Visually test zoomed into J&K and Ladakh, and into Arunachal Pradesh, in both themes.**
- Attribute OpenStreetMap / OpenFreeMap / DataMeet / Natural Earth correctly.

## 2. Information architecture

Use hash routing, so everything is linkable and the app works on static hosting:

| Route | View |
|---|---|
| `#/` | **Map** (home) |
| `#/globe` | **Overseas globe** |
| `#/chain` | **Value-chain matrix** |
| `#/auctions` | **Auction tracker** |
| `#/timeline` | **Timeline & slippage** |
| `#/policy` | **Policy & money** |
| `#/method` | **Methodology & coverage** |
| `#/data` | **Data downloads** |
| `#/e/<id>` | Entity detail, as a full page; the drawer is also available on the map |

**Also generate static HTML entity pages** at `e/<id>/index.html` during the build. They carry the same content as the in-app detail view, so a single entity can be shared or printed (A4-friendly print stylesheet).

**All filter state is encoded in the URL** (e.g., `#/?stage=Refining,Magnets&mineral=Graphite&status=Operational&t=2025-06`). Any view can be shared exactly as seen.

## 3. Views

### 3.1 Map (home)
**Layout, desktop:**
- full-bleed map
- left: a collapsible **filter rail**
- right: an **entity drawer** that slides in on selection
- top: a slim **header** with the title, view switcher, search (`/` focuses it) and theme toggle
- bottom: the **time scrubber**

**Layout, mobile:**
- the filter rail becomes a bottom sheet
- the drawer becomes a full-height sheet
- the scrubber stays usable with a thumb

**First load:**
- A **"story so far" panel**, dismissible and remembered via `localStorage` (wrapped in try/catch). It holds:
  - three or four headline numbers, computed from the data
  - one short paragraph
  - the **5 most recent milestones** across all entities, each clickable
- This mirrors Pranay's "Story so far / Recent developments".

**Marker encoding:**
- **Colour = stage**, from `stages.yml`.
- **Fill = status group:**
  - solid: Operational, Active, Licence / lease executed
  - ring with light fill: pipeline statuses (Announced → Under construction, Offered, Preferred bidder, etc.)
  - desaturated with a strike glyph: Cancelled, Closed, Annulled, Stalled
- **Precision:** records with `district` or `state` precision draw a **soft translucent "approximate location" halo**, and their tooltip says so. Never fake precision.
- **Low confidence:** hidden unless "Show unconfirmed" is on. When shown, they get a dotted outline.
- **Demand anchors:** a distinct glyph (e.g., square), muted, off by default.
- **Block polygons:** from about zoom 7 up, blocks with `geometry` render as polygons tinted by status; below that they render as points. Clicking either opens the drawer.

**Clustering:**
- Use MapLibre's GeoJSON clustering at low zoom.
- Render clusters as **mini donuts segmented by stage**, so a cluster still communicates its composition. Implement with an HTML marker per cluster or a canvas-generated image; choose for performance.
- Clicking a cluster zooms to it.

**Hover tooltip:** name, operator, stage and status badge, minerals (as chips) and location precision.

**Entity drawer:**
- name, operator, stage(s), status with `status_as_of`, and confidence
- mineral chips, each deep-linking to `indiacriticalminerals.com/#mineral/<Name>`
- key facts: capacity (planned vs installed), investment, feedstock, schemes, dates, and slippage if any
- the three narrative fields
- a milestones mini-timeline
- for blocks: the auction history table
- related entities, clickable, with fly-to
- **sources**: tier badge, publisher, date, link, and an archive link when one exists
- buttons: open full page, copy link

**Filter rail.** Each facet shows **live counts** that update as other facets change:
- Stage
- Mineral: grouped by dashboard group, searchable, multi-select
- Status
- Scheme
- Operator type
- State
- Feedstock
- Confidence
- Layer toggles: demand anchors, GSI choropleth, processing parks, block polygons

A "Reset" control, and a count readout: "Showing 214 of 643 projects".

**Mineral lens.** Selecting a single mineral, from the filter or from a mineral chip anywhere, switches the map into **lens mode**:
- every entity touching that mineral is highlighted across all stages
- everything else dims
- a small panel shows that mineral's chain: counts per stage, with stages that have **zero Indian entities marked as gaps**
- a link to the dashboard page for that mineral

This is the signature interaction. Make it smooth.

**Time scrubber:**
- A range from the earliest `dates.first_public` to today, with play/pause.
- Entities appear when their `first_public` date passes. Their status reflects the latest milestone on or before the scrubber date, where milestones allow that.
- A small histogram above the track shows announcements per quarter.
- Default position: today.

**GSI choropleth (optional layer):** states shaded by exploration-project counts from `gsi_exploration.yml`, with a legend.

### 3.2 Overseas globe (`#/globe`)
- MapLibre **globe projection**, centred on the Indian Ocean.
- Points for overseas assets, coloured by stage, with status encoding as on the map.
- **Great-circle arcs** from `india_link` to each asset. Arc opacity reflects status; bids lost and withdrawn are faint and dashed.
- A side list grouped by country, with an "Indian entities" filter (KABIL, Coal India, Vedanta, …).
- A gentle animated fly-around on first load, which the user can interrupt.

### 3.3 Value-chain matrix (`#/chain`)
- A heatmap grid: **minerals (rows, grouped by dashboard group) × stages (columns)**.
- Each cell shows a count, with an optional toggle to installed capacity where comparable.
- **Empty cells are visually emphasised as gaps**: the midstream gap is the analytical point.
- Clicking a cell opens the map filtered to that mineral and stage.
- A one-paragraph reading guide sits above the grid.

### 3.4 Auction tracker (`#/auctions`)
- **Tranche summary:** offered / auctioned / annulled / pending per tranche, for both Centre and state routes.
- **Success rate** charts by tranche, by mineral and by state.
- **Re-offer chains:** blocks that cycled through several tranches.
- **Block-level table** (sortable, filterable): block, state, district, mineral(s), ML/CL/EL, tranche history, outcome, preferred bidder, final offer %, and current status.
- **Lag metrics:** preferred bidder → lease executed → production.

### 3.5 Timeline & slippage (`#/timeline`)
- A **Gantt-style chart** for plants and projects with dates: announced → construction → original expected vs revised or actual completion. Slippage is shown as a hatched extension.
- A "today" line, as Pranay does.
- Filterable by stage and mineral.
- A list of the most-slipped and stalled projects.

### 3.6 Policy & money (`#/policy`)
- **NCMM outlay by head:** bar chart.
- **Scheme cards:** NCMM, recycling incentive, REPM, ECMS (critical-material subset), ACC PLI, processing parks, the lithium-nickel processing scheme if notified. Each card shows outlay, dates, status, beneficiary/bidder counts linked to the map, and disbursement where known.
- **A policy timeline:** MMDR amendments, list notifications, scheme approvals, duty changes, tranches.

### 3.7 Methodology & coverage (`#/method`)
- Scope and inclusion rules, in plain language, adapted from `LAYER_PLAYBOOKS.md`.
- Status definitions, the source-tier system, the confidence system, and location-precision levels.
- **A coverage table rendered from `research/COVERAGE.md` data**, with official anchors vs captured counts. This makes the research rigour visible. Have `build-data` parse it into JSON, or keep coverage as YAML/JSON and generate the markdown from it.
- Known gaps: a summary of `OPEN_QUESTIONS`.
- Credits: Takshashila HTG, authors, and links to the dashboard and to Pranay's tracker. Licence: CC BY 4.0 for data, unless the owner says otherwise. Add attribution for third-party geodata.

### 3.8 Data (`#/data`)
- Download links: CSV per layer and the full GeoJSON.
- A data dictionary generated from the schema.

## 4. Visual design

### Brand
- **Llama maroon** `#620d3c`: primary UI accent, headings, active states
- **Marigold** `#f1a222`: highlight, lens mode, play head
- **Inter**: all text
- **Roboto Mono**: eyebrows, metadata, numbers in tables
- Define all colours as CSS custom properties on `:root`. Redefine them under `@media (prefers-color-scheme: dark)` and under `[data-theme="dark"]`, with a manual toggle that overrides the system setting.

### Stage palette
- About 10 stages need distinct categorical colours that work on both light and dark basemaps and remain distinguishable for common colour-vision deficiencies.
- Do not force the brand colours onto stages. Brand colours are for UI chrome.
- Validate the palette by simulating deuteranopia and protanopia (e.g., with a small script), and document the hex values in `stages.yml`.

### Character
- Restrained, precise and editorial.
- Generous whitespace in panels, crisp 1px rules, and small-caps mono eyebrows.
- Motion is purposeful: fly-to on selection, lens transitions around 300 ms, nothing gratuitous.
- Avoid generic "SaaS dashboard" tropes: big rounded cards, gradient blobs, emoji icons.
- Numbers use tabular figures.

### Accessibility
- Keyboard navigable: filters, search, drawer, scrubber.
- Arrow keys step the scrubber.
- Esc closes panels.
- Visible focus rings; ARIA labels on map controls.
- Contrast at WCAG AA or better.
- Respect `prefers-reduced-motion`.

## 5. Performance budgets

- First meaningful render under 2.5 s on a typical broadband connection.
- Initial JS under 350 KB gzipped, excluding the MapLibre core; lazy-load the chart and globe code.
- Entity data under 1.5 MB gzipped. Lazy-load block polygons and per-entity long fields if needed.
- Filtering 1,000 entities updates in under 50 ms. Precompute facet indexes.

## 6. QA before declaring done

- **Data parity:** automated tests asserting that counts shown in the UI (header readout, facet counts, chain matrix, auction summaries) equal counts computed directly from `entities.json`.
- **Visual QA** with Playwright:
  - screenshots of every view at 375×812, 768×1024 and 1440×900, in light and dark themes
  - review the screenshots yourself, and fix overlaps, clipped text and illegible labels
- **Boundary check:** screenshots zoomed into J&K, Ladakh and Arunachal, in both projections and both themes.
- **Zero console errors or warnings** on load and during a scripted interaction: filter, lens, scrub, open drawer, globe.
- **Links:** `scripts/linkcheck` over all source URLs. Fix or archive-link every dead source.
- **Deep links:** open 10 random entity URLs and 5 random filter URLs fresh, and confirm the state restores.

## 7. Deploy

- A GitHub Actions workflow runs on push to `main`: `validate` → `geocheck` → `build-data` → `vite build` → deploy `dist/` to Pages.
- A failing validator fails the deploy.
- The README describes how to run locally (`npm install && npm run dev`) and how to add or update a record.
