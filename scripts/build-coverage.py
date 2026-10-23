#!/usr/bin/env python3
"""Render research/COVERAGE.md from research/coverage.yml (the ledger's source of truth)."""
import os
import yaml
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
c = yaml.safe_load(open(os.path.join(ROOT, "research", "coverage.yml")))
out = ["# Coverage reconciliation ledger", "",
       "Generated from `research/coverage.yml` by `scripts/build-coverage.py`. Do not edit by hand.", ""]
for layer in c["layers"]:
    out += [f"## {layer['layer']}", "", "| Anchor | Anchor value | Source (date) | Captured | Gap | Explanation |", "|---|---|---|---|---|---|"]
    for a in layer["anchors"]:
        cells = [a["anchor"], a.get("anchor_value"), f"{a.get('source')} ({a.get('source_date')})", a.get("captured"), a.get("gap"), a.get("explanation") or ""]
        out.append("| " + " | ".join(str(x if x is not None else "") .replace("|", "/") for x in cells) + " |")
    out.append("")
open(os.path.join(ROOT, "research", "COVERAGE.md"), "w").write("\n".join(out))
print("wrote research/COVERAGE.md")
