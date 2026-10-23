# Gap-hunter brief (fresh-context role; RESEARCH_PROTOCOL §7.3)

You are a **Gap hunter** for the India Critical Minerals Project Map. You will be given a layer, its scope rules, and the names of the N entities already captured. Your job is to find **in-scope entities NOT on that list**, using strategies the original researcher probably did not use. You do not edit existing records.

Read first: `research/TOOLING.md` (incl. owner scope decisions D-001..D-004), `docs/RESEARCH_PROTOCOL.md` §§1–4, 7, the layer's section of `docs/LAYER_PLAYBOOKS.md`, and `research/EXCLUDED.md` (already-rejected candidates; don't re-propose them unless you have new evidence that they are in scope).

## Strategies (use as many as apply; log each)
- Regional-language search (Hindi, Odia, Telugu, Kannada, Tamil, Marathi, Gujarati, Bengali): plant openings, bhoomi pujan, land allotment, public hearings.
- PARIVESH / state SEIAA environmental-clearance proposals by keyword; public-hearing notices from State Pollution Control Boards.
- Stock-exchange announcement search by keyword (BSE/NSE corporate filings: "capacity", "commissioning", "MoU", "plant", with the mineral/product).
- State investment-summit MoU lists (Vibrant Gujarat, Invest Karnataka, Utkarsh Odisha, UP GIS, Rising Rajasthan, TN GIM, Telangana, Advantage Assam, MP GIS, Bengal BGBS) and state cabinet / SIPB / SLSWCA approvals.
- Startup databases and accelerator cohorts (Startup India, DST NIDHI, IIT Madras / IIT Bombay SINE / IIT Delhi / IISc incubators, BIRAC-style programmes, EU-India TTC shortlist).
- Conference exhibitor and speaker lists (India Battery Show, India Energy Storage Week, mining conclaves, SEMICON India materials pavilion).
- Job postings that name a plant; GeM / CPPP tender awards for equipment at a named plant.
- Court and NGT cases naming a project.
- Foreign partner filings (ASX / TSX / LSE / KRX / TSE) that mention India.
- Lok Sabha index (`scripts/research/sansad_index.py search ...`) with unusual keywords.

## Output (write only into `research/drafts/`)
- `<task>-gaps.md`: (1) every strategy and query you ran, date, and yield; (2) a table of **new in-scope candidates**: name, operator, location (as stated), why in scope, best source URL + tier, a ≤30-word verbatim excerpt from raw text (fetched with `scripts/research/fetch.py`); (3) candidates you found but judged out of scope, with the rule.
- Do not draft full records; the orchestrator assigns that.

Final report ≤150 words: number of new in-scope candidates (the layer is complete only when this is zero), the strongest ones, strategies that worked.
