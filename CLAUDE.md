# CLAUDE.md — India Critical Minerals Project Map

This file is the standing brief for Claude Code in this repository. Read it in full at the start of every session, then read the four documents in `docs/` before doing any work:

1. `docs/RESEARCH_PROTOCOL.md`: how to research, verify and record. **This document governs everything.**
2. `docs/LAYER_PLAYBOOKS.md`: what to find in each layer, where to look, and the official counts to reconcile against.
3. `docs/SCHEMA.md`: the data model, controlled vocabularies and validation rules.
4. `docs/BUILD_SPEC.md`: the front-end application to build on top of the data.

---

## 1. What this project is

An interactive, research-grade map of **every critical-minerals project in India and every Indian-held critical-minerals asset abroad**. It covers the whole value chain:

- exploration and auctioned blocks
- operating mines and by-product streams
- beneficiation, refining and chemicals
- battery and magnet materials
- rare-earth magnets
- recycling
- research and Centres of Excellence
- government processing parks
- overseas assets
- demand anchors such as cell gigafactories

It is a sibling of two existing products and must link to both:

- **India Semiconductor Tracker** by Pranay Kotasthane: https://fabs.pranaykotas.com (source: github.com/pranaykotas/india-semiconductor-tracker). This is the model for rigour: YAML as the single source of truth, a dated source on every claim, slippage tracking, an official India boundary, and narrative fields written for non-experts. This project is far larger: Pranay's tracker has 85 entries; this one targets **600+**.
- **India Critical Minerals Dashboard** at https://indiacriticalminerals.com, by Tannmay Kumarr Baid and Shobhankita Reddy (Takshashila Institution). It scores India's critical minerals across ten vectors. Every mineral name in this project must match the dashboard's canonical names exactly. Every entity must deep-link to `https://indiacriticalminerals.com/#mineral/<Name>` for each mineral it touches.

Owner: Tannmay Kumarr Baid, High-Tech Geopolitics Programme, Takshashila Institution, Bengaluru.
Status: internal working draft. It may be published to GitHub Pages, but every page must carry a visible "Working draft, not for circulation" banner and a `noindex,nofollow` meta tag.

## 2. The single most important rule

**Research quality is the product.** A beautiful map with a wrong status, an invented capacity, a misplaced plant or a missing project is a failure. Accuracy, recency and completeness come before speed, polish and feature count, in that order.

Concretely:

- **Never write a fact from memory.** Your training data is stale and you will misremember capacities, dates, owners and locations. Every non-null field must trace to a source you fetched in this project. Record that source in the entry and in the evidence log.
- **Never fill a gap with a plausible guess.** Unknown is `null`, with an entry in `research/OPEN_QUESTIONS.md`. A null is honest; a guess is a defect.
- **Never invent coordinates.** Use the coordinate protocol in `RESEARCH_PROTOCOL.md` §6. Every location carries a `precision` value.
- **Exhaustiveness is required, not aspirational.** Each layer is finished only when it passes all three of these:
  - it reconciles against official aggregate counts
  - it passes the saturation test
  - it survives an independent gap-hunting pass

  See `RESEARCH_PROTOCOL.md` §7.
- **Everything is dated.** Statuses are "as of" a date. The current date is whatever the system clock says, so check it with `date` and do not assume. The research baseline in `LAYER_PLAYBOOKS.md` was written on 2026-10-22. Treat every seed fact in it as a **lead to verify**, never as data.

## 3. Repository layout (create this)

```
CLAUDE.md
docs/                      # the four governing documents (do not edit without telling the owner)
data/
  reference/
    minerals.yml           # canonical mineral list, pulled from indiacriticalminerals.com
    stages.yml             # value-chain stages + colours
    india-boundary.geojson # official India boundary (DataMeet composite)
    states.geojson         # state boundaries consistent with the official boundary
    districts.geojson      # district boundaries (for centroid fallback + choropleths)
    world-ind-pov.geojson  # world countries, India point-of-view boundaries (for the globe)
  blocks.yml               # auctioned / offered blocks (Centre, State, EL, offshore, deep-sea)
  mines.yml                # operating mines and by-product streams
  processing.yml           # beneficiation, smelting, refining, chemicals, silicon/polysilicon, parks
  materials.yml            # battery materials: cathode, anode, electrolyte, foils, additives, precursors
  magnets.yml              # rare-earth magnets, separation, metals/alloys
  recycling.yml            # battery, e-waste, scrap, tailings/fly-ash recovery
  rnd.yml                  # CoEs, labs, institutes, R&D programmes, pilot plants
  overseas.yml             # Indian-held assets and stakes abroad
  demand.yml               # demand anchors (cells, compound-semiconductor fabs, etc.)
  schemes.yml              # policy schemes, outlays, disbursements
  tranches.yml             # auction tranche metadata (NIT dates, results, counts)
  gsi_exploration.yml      # state-level aggregates of GSI / NMET exploration projects
research/
  COVERAGE.md              # reconciliation ledger: official anchors vs captured counts, per layer
  LOG.md                   # research log: every query run, per layer, with date and yield
  OPEN_QUESTIONS.md        # unresolved facts, conflicts, things only the owner can decide
  EXCLUDED.md              # candidates considered and excluded, with the rule that excluded them
  evidence/                # one JSONL file per data file: claim-level evidence with excerpts
  drafts/                  # subagent output before merge (YAML, evidence, logs, exclusions, questions)
  raw/                     # downloaded PDFs/HTML for audit (gitignored if large)
scripts/
  validate.*               # schema + vocabulary + sourcing validation (must pass before any commit)
  geocheck.*               # point-in-state / point-in-India checks
  linkcheck.*              # source URL liveness + archive fallback
  build-data.*             # YAML -> JSON/GeoJSON bundles for the app
src/                       # the app (see BUILD_SPEC.md)
```

## 4. How to work

### Phases, in order
1. **Phase 0, foundations.** Scaffold the repo and fetch the canonical mineral list and the boundary files. Write the validator, the geocheck and the build-data scripts before any research, so every record is validated from the first commit.
2. **Phase 1, research, layer by layer**, in the order given in `LAYER_PLAYBOOKS.md`. A layer is done only when it meets the Definition of Done in `RESEARCH_PROTOCOL.md` §10.
3. **Phase 2, build the app** to `BUILD_SPEC.md`. Start once at least the blocks layer and one plant layer are complete, so the design is shaped by real data. Keep researching the remaining layers in parallel if you can.
4. **Phase 3, full verification and QA**: data audit, link check, geocheck, visual QA at desktop and mobile widths.
5. **Phase 4, deploy** to GitHub Pages via GitHub Actions.

### Orchestration
You are the orchestrator. For research, use subagents (the Task/Agent tool) generously. Give each one a single layer, or a single sub-layer of a big layer, and paste the relevant protocol sections into its prompt. Subagents start without your context.

Use three distinct roles. Never let the same agent both draft and verify the same records:
- **Researcher**: discovers entities and drafts records with evidence.
- **Verifier**: works in a fresh context and re-checks every key field of every record against the cited sources by re-fetching them, then reports discrepancies.
- **Gap hunter**: works in a fresh context with deliberately different search strategies, and tries to find entities that are missing from the layer. See `RESEARCH_PROTOCOL.md` §7.3.

Merge subagent output yourself. Deduplicate, run the validator, update `COVERAGE.md`, and commit.

### Autonomy and checkpoints
Work autonomously. Do not stop to ask permission for routine choices: decide, and log the decision in `research/LOG.md`.

Stop and ask the owner only when a choice is genuinely theirs, for example:
- an inclusion rule that would add or remove a large class of entities
- a conflict between two official sources that you cannot resolve

After each layer completes, print a short checkpoint summary covering:
- the entity count
- the coverage reconciliation table
- the biggest open questions
- anything surprising

Then continue.

### Commits
Commit after each layer and after each significant build milestone, with clear messages. Run `scripts/validate` before every commit. A failing validator blocks the commit.

## 5. Non-negotiables for the map itself

- **Official India boundary.**
  - Draw India's outline and the state boundaries from the official-boundary GeoJSON: the DataMeet composite, as used in Pranay's repo at `data/shp/datameet/india-composite.geojson`.
  - Strip every boundary and disputed-area layer from the basemap style.
  - On the globe view, use India point-of-view world boundaries.
  - This is a hard requirement for an Indian research institution.
- **No API keys in the repo.** Use a keyless basemap; see `BUILD_SPEC.md`.
- **Every displayed fact links to its source**, either in the entity drawer or on the entity page.
- **Precision is visible.** A district-level location must look different from an exact site.
- **Low-confidence entries are hidden by default**, behind a "show unconfirmed" toggle.

## 6. Writing style for narrative fields

Plain, specific and non-promotional. Write for an intelligent non-expert.

- Each narrative field is at most two sentences.
- Paraphrase sources. Never copy sentences from them.
- Avoid these words: "pivotal", "landmark", "game-changer", "robust", "cutting-edge", "poised to", "testament to".
- Don't open with throat-clearing.
- Prefer numbers and named facts to adjectives.
- If a project is stalled, delayed, annulled or contested, say so plainly.

## 7. Brand

Takshashila house style, shared with the owner's published projects (India Critical Minerals Dashboard, Inside the Motor, Tech Laws atlas):

- **Llama plum** `#620d3c` (primary; header gradient `#6e1545` to `#620d3c`) and **Marigold** `#f1a222` (accent)
- cream paper `#fffbe2`, white cards with plum-tinted shadows, the Takshashila logo in the header
- **Newsreader** for headings, **Hanken Grotesk** for text, **Space Mono** for labels

Light only (owner decision, Oct 2026). `BUILD_SPEC.md` §0 records the editorial decisions; the rest of it is the original brief.
