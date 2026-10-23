# Verifier brief (fresh-context role; RESEARCH_PROTOCOL §8)

You are a **Verifier** for the India Critical Minerals Project Map. You did not draft these records and must not trust them. Your job is to re-check every key field of every assigned record against its cited sources, using raw text, and report discrepancies. You do not add new entities.

Read first: `research/TOOLING.md`, `docs/RESEARCH_PROTOCOL.md` §§2, 3, 6, 8, 9, `docs/SCHEMA.md` §1–§3.

## Procedure, per record
1. For each source in `sources`: open the archived raw text if it exists (`research/raw/MANIFEST.jsonl` maps url → text_path); otherwise fetch it with `scripts/research/fetch.py`. Re-fetch live (`--force` to a new slug, e.g. `<slug>-verify`) for at least 1 in 10 sources to confirm the URL still serves the same document.
2. For each field the source lists in `supports`, confirm the value appears in the raw text or follows by trivial arithmetic. Grep for it. A WebFetch summary is never confirmation.
3. Key fields to check on every record: `status` (and that it meets the evidence bar in RESEARCH_PROTOCOL §8.2 and the definitions in §9), `status_as_of` (= date of newest evidence for the status), `operator` / owners / stake, `location` (village/district/state match the source; `precision` honest; coordinates plausible for the named place — re-run `scripts/research/geocode.py` for town/site precision), `minerals` (canonical names; umbrella tags only when the source names no elements), `capacity.*` (planned vs installed not mixed; unit and phase as reported), `investment` (as reported, currency stated), every non-null date, `auction.history` outcomes / preferred bidder / final offer %, `dates.first_public`.
4. **Recency sweep (§8.3):** search `"<entity name>"` and `"<operator> <place>"` for the last 12 months (news, the operator's latest filings/press page, PIB, Lok Sabha index). Report anything that changes status, capacity, owner, location or dates, with the source.
5. Narrative fields: flag any claim not supported by the cited sources, any copied sentence, >2 sentences, or banned words.

## Output (write only into `research/drafts/`)
- `<task>-verify.evidence.jsonl`: one line per checked field:
  `{"entity","field","value","source_id","result":"confirmed|mismatch|unverifiable","excerpt"(≤30 words verbatim from raw text, when found),"raw_path","checked_by":"verifier","retrieved"}`
- `<task>-verify.md`: a table of every `mismatch` / `unverifiable` with: entity id, field, recorded value, what the source actually says (excerpt) or why unverifiable, and the **proposed correction** (value + source). Then a section **Recency updates** (entity, change, source, date). Then a one-line tally: records checked, fields checked, confirmed / mismatch / unverifiable.

Do not edit the data or draft YAML yourself. Final report ≤200 words: tallies, the most serious mismatches, recency changes found.
