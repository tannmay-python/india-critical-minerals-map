Build the India Critical Minerals Project Map: an exhaustive, research-grade interactive map of every critical-minerals project in India and every Indian-held critical-minerals asset abroad.

Setup (do this yourself):
1. Unzip `icm-map-instructions.zip` into a new project folder named `india-critical-minerals-map`.
2. `git init`, then create a GitHub repo of the same name under my account with `gh repo create`. Push it, and set up GitHub Pages deployment via GitHub Actions. If `gh` isn't authenticated, tell me the one command to run.
3. Read `CLAUDE.md`, then everything in `docs/`. These are your full instructions: research protocol, layer playbooks, schema, and build spec. Follow them.

What matters most is research quality. Research every layer deeply and exhaustively (600+ records). Verify every fact from raw primary sources. Never write anything from memory or guess a number, date or coordinate. Use separate subagents for research, verification and gap-hunting. Treat the seed facts in the playbooks as leads to re-verify, not as data.

Work autonomously through all phases: foundations → research L1–L10 → build the app → QA → deploy to Pages. Commit as you go. After each layer, give me a short checkpoint. Only stop to ask me when something is genuinely my call. The first such call is the canonical mineral list and the scope questions it raises.
