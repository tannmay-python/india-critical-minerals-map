# Research tooling and conventions (read before any research task)

Project root: `/Users/tannmaykumarrbaid/Desktop/india-critical-minerals-map` (all paths below are relative to it).
Governing rules: `CLAUDE.md`, `docs/RESEARCH_PROTOCOL.md` (governs everything), `docs/SCHEMA.md`, `docs/LAYER_PLAYBOOKS.md`.

## Environment
- Python: `.venv/bin/python -I` (has pyyaml, pdfplumber, pypdf, bs4, lxml, shapely, rapidfuzz, openpyxl, requests). Always run with `-I`.
- Node: `~/.local/node/bin/node` (not on PATH by default; prefix `PATH=~/.local/node/bin:$PATH`).
- No `pdftotext`, `lynx` or Homebrew. Use the scripts below.
- Today's date: run `date`. Research baseline in the playbooks is 2026-10-22.

## Scripts
| Script | Use |
|---|---|
| `scripts/research/fetch.py URL [--slug s] [--print N]` | Download a source, archive it to `research/raw/<domain>/<slug>.<ext>`, extract RAW text to `<slug>.txt`, log it in `research/raw/MANIFEST.jsonl`. Every number/date/name you record must be read from this raw text (grep it), never from a WebFetch summary. |
| `scripts/research/sansad_index.py search "regex" [--ministry MINES]` | Search the local index of all Lok Sabha questions (17th LS sessions 11–15, 18th LS sessions 1–7) by subject. Prints direct PDF links on the sansad.in mirror. Then `fetch.py` the PDF. |
| `scripts/research/geocode.py "Place" --state S [--district D]` | Nominatim geocoder: India-constrained, state-checked, globally rate-limited to 1 req/s, cached in `research/geocode-cache.jsonl`. `ok:false` means reject. |
| `scripts/research/geocode.py --district-centroid D --state S` | District centroid from `data/reference/districts.geojson` (precision `district`). Only after that file exists. |

## Access notes (this machine's network)
- `eparlib.sansad.in` and `eparlib.nic.in` are **unreachable**. The same PDFs are on `https://sansad.in/getFile/loksabhaquestions/annex/<code>/<FILE>.pdf?source=pqals` where `<code>` is LS number + session (18th LS: 181..187; 17th LS: 1711..1715). Example: eparlib `.../AU535_rZga4s.pdf` (3 Dec 2025) = `https://sansad.in/getFile/loksabhaquestions/annex/186/AU535_rZga4s.pdf?source=pqals`. If you don't know the code, try each.
- Rajya Sabha questions: try `https://rsdoc.nic.in` / `https://sansad.in/rs` routes; log what works in your log file.
- `indiacode.nic.in` often returns 504. `web.archive.org` rate-limits (429): wait and retry, max ~1 request / 5 s.
- `pib.gov.in`, `mines.gov.in`, `mstcecommerce.com`, `parivesh.nic.in`, `eprbattery.cpcb.gov.in`, `ibm.gov.in`, `gsi.gov.in` respond.
- WebSearch / WebFetch run from a different network and may reach sites curl cannot. WebFetch output is a **model summary**: use it only for discovery. If a fact is only reachable via WebFetch, ask it to quote the exact sentence verbatim, record `"via":"webfetch-verbatim"` in the evidence line, and set confidence no higher than `medium` for that field.
- Paywalls: do not bypass. JS-rendered portals: look for JSON/XHR endpoints first (inspect page source for `fetch(`/`api`), else log the gap.

## IDs (kebab-case, unique across ALL data files, stable forever)
- Blocks: `blk-<st>-<block-name-slug>` (e.g. `blk-cg-oranga-revatipur`), offshore `blk-off-<area-slug>`, ISA `isa-<area-slug>`.
- Other layers: `<operator-slug>-<place-slug>[-<product>]` (e.g. `kmml-chavara-tio2`).
- State codes `<st>`: an ap, ar arunachal, as assam, br bihar, cg chhattisgarh, ga goa, gj gujarat, hr haryana, hp himachal, jh jharkhand, ka karnataka, kl kerala, mp madhya-pradesh, mh maharashtra, mn manipur, ml meghalaya, mz mizoram, nl nagaland, od odisha, pb punjab, rj rajasthan, sk sikkim, tn tamil-nadu, tg telangana, tr tripura, up uttar-pradesh, uk uttarakhand, wb west-bengal, an andaman-nicobar, jk jammu-kashmir, la ladakh, dl delhi, py puducherry, ch chandigarh, dn dnh-dd, ld lakshadweep.

## Minerals
- `minerals:` may contain ONLY names from `data/reference/minerals.yml` (51 dashboard names, exact spelling: e.g. `Phosphorus` not "Phosphorous", `Potash` for glauconite/sylvite/polyhalite).
- Always ALSO record the commodity exactly as the source states it, in `commodity_as_stated` (e.g. "Graphite & Vanadium", "REE & RM", "Ni & PGE").
- **Umbrella tags (owner decision D-001):** when a source says only "REE"/"rare earths" or "PGE"/"PGM" without naming elements, tag `Rare earths (unspecified)` or `PGEs (unspecified)`. Tag individual elements (e.g. `Neodymium`, `Yttrium`, `Platinum`) only when a source names them. (Older drafts may use `minerals_pending: [REE]`; the orchestrator converts those.)
- Non-canonical associated commodities (limestone, bauxite, manganese, chromium, zinc, lead, halite, gold, silver, uranium, thorium...) go in `commodity_as_stated` only.

## Scope rules decided by the owner (2026-10-23; see research/LOG.md)
- D-002 EXCLUDED classes: secondary copper scrap refiners/rod mills, ferro-silicon smelters, lead-acid battery recyclers (antimonial lead), phosphoric-acid / fertilizer plants. Log candidates of these classes in your excluded file; do not draft records. (Primary copper, silicon metal, polysilicon, ingot/wafer stay IN.)
- D-003 Manganese, chromium, bauxite, zinc, lead are not canonical: exclude ferro-Mn/ferro-Cr plants and Mn/Cr/bauxite mines. Zinc-lead mines and smelters are IN only as by-product streams for Cadmium (and Germanium/Indium if recovered). Alumina refineries are IN only where gallium is recovered or piloted.
- D-004 Coking coal (added to Part D in 2026) is EXCLUDED.

## Draft deliverables (per RESEARCH_PROTOCOL §12)
Write ONLY into `research/drafts/` (and `research/raw/` via fetch.py). Never edit `data/` directly.
1. `research/drafts/<task>.yml` — a YAML list of records following `docs/SCHEMA.md` (base record + layer extension). Quote all dates as strings. Unknown = `null` + an open question.
2. `research/drafts/<task>.evidence.jsonl` — one line per claim: `{"entity","field","value","source_id","excerpt"(≤30 words verbatim from RAW text),"raw_path"(research/raw/... txt),"retrieved","checked_by":"researcher"}`.
3. `research/drafts/<task>.log.md` — every query/registry pulled, with date and yield (new entities found). Include the saturation run if you did one.
4. `research/drafts/<task>.excluded.md` — candidates considered and excluded, with the rule.
5. `research/drafts/<task>.questions.md` — open questions, each with what you tried.

## Source entries
Every record has `sources:` with `id` (unique within the record, reuse the same id string for the same URL across records, e.g. `pib-2277041`, `ls-usq535-2025-12-03`), `url`, `title`, `publisher`, `tier` (T1..T5), `date` (publication), `retrieved`, `archive_url`, `supports` (list of field paths: `status`, `operator`, `location`, `capacity.planned`, `capacity.installed`, `investment`, `dates.first_public`, `dates.announced`, ..., `auction.history`, `block.area_sq_km`, `block.resources`, `minerals`).

## Style
Narrative fields: max 2 sentences each, plain, specific, paraphrased, no banned words ("pivotal", "landmark", "game-changer", "robust", "cutting-edge", "poised to", "testament to"). Say plainly if stalled/annulled/contested.
