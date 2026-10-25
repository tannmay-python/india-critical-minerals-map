# India Critical Minerals Project Map

A map of every critical-minerals project in India and every Indian-held critical-minerals asset abroad, with a dated source behind every record. Takshashila Institution, High-Tech Geopolitics Programme.

Live preview: https://tannmay-python.github.io/india-critical-minerals-map/

Governing documents: [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/) (`BUILD_SPEC.md` §0 has the editorial decisions).

## Run it locally

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
npm install
npm run data      # YAML in data/ -> JSON and downloads in public/
npm run dev       # http://localhost:5173
```

## Add or update a record

1. Archive each source: `.venv/bin/python -I scripts/research/fetch.py <url>` (raw copy and text under `research/raw/`).
2. Write a compact draft in `research/drafts/<name>.src.yml`, with a short excerpt from the archived text for every claimed field (see an existing draft).
3. Build it: `.venv/bin/python -I scripts/research/build_entities.py research/drafts/<name>.src.yml`. Every excerpt is checked against the archive.
   For a status change on an existing record, use `scripts/research/apply_updates.py` instead.
4. Merge: `.venv/bin/python -I scripts/research/merge.py <layer> research/drafts/<name>.yml`
5. Check: `npm run validate` and `npm run geocheck`, then `npm run data`.

Unresolved facts go in `research/OPEN_QUESTIONS.md`; deliberate exclusions in `research/EXCLUDED.md`; each layer's run in `research/LOG.md`.

## Checks

- `npm run validate`, `npm run geocheck`: schema, sources, status evidence, coordinates.
- `npm run qa -- [url]`: with the dev server running; counts against the data, filter and record links, console errors, screenshots and boundary close-ups in `qa/screenshots/`.
- `npm run linkcheck`: every source URL; dead ones get an archived copy.

## Deploy

Pushing to `main` (or running the "Deploy to GitHub Pages" workflow) validates, geochecks, builds the data and the site, and publishes `dist/` to GitHub Pages. A failing validator stops the deploy.

## Licence and credits

Data: CC BY 4.0. India's boundary: DataMeet composite (Survey of India depiction), CC0; states: DataMeet, CC BY 4.0; world: Natural Earth, India's point of view. Basemap: OpenFreeMap, OpenMapTiles, © OpenStreetMap contributors.
