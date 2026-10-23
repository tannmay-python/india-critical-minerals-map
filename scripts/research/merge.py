#!/usr/bin/env python3
"""Merge subagent drafts into data/<layer>.yml and research/evidence/<layer>.jsonl.

Usage:
  .venv/bin/python -I scripts/research/merge.py magnets research/drafts/l2-magnets.yml [more.yml ...] [--dry-run]

- Upserts records by id (a draft record replaces the data record with the same id).
- Converts legacy `minerals_pending: [REE|PGE]` into the umbrella tags (owner decision D-001).
- Refuses ids that already exist in a DIFFERENT data file.
- Appends each draft's sibling `<name>.evidence.jsonl` to research/evidence/<layer>.jsonl (deduplicated).
- Keeps data files sorted by state, then name, so diffs stay readable.
Run scripts/validate.py afterwards; merging does not validate.
"""
import argparse
import glob
import json
import os
import sys

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(ROOT, "data")
EVID = os.path.join(ROOT, "research", "evidence")
UMBRELLA = {"REE": "Rare earths (unspecified)", "PGE": "PGEs (unspecified)", "PGM": "PGEs (unspecified)"}


class Dumper(yaml.SafeDumper):
    pass


def _str(dumper, s):
    style = '"' if any(c in s for c in ":#{}[]&*!|>'%@`") or s[:1] in "-?" or s.strip() != s else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", s, style=style)


Dumper.add_representer(str, _str)


def load(p):
    if not os.path.exists(p):
        return []
    return yaml.safe_load(open(p, encoding="utf-8")) or []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("layer")
    ap.add_argument("drafts", nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    target = os.path.join(DATA, f"{a.layer}.yml")
    existing = {r["id"]: r for r in load(target)}
    other_ids = {}
    for p in glob.glob(os.path.join(DATA, "*.yml")):
        if os.path.abspath(p) != os.path.abspath(target):
            for r in load(p):
                if isinstance(r, dict) and r.get("id"):
                    other_ids[r["id"]] = os.path.basename(p)

    added, replaced, refused = [], [], []
    for d in a.drafts:
        for r in load(d):
            rid = r.get("id")
            if rid in other_ids:
                refused.append(f"{rid} (exists in {other_ids[rid]})")
                continue
            pend = r.pop("minerals_pending", None) or []
            mins = list(r.get("minerals") or [])
            for x in pend:
                tag = UMBRELLA.get(str(x).upper(), x)
                if tag not in mins:
                    mins.append(tag)
            r["minerals"] = mins
            r.setdefault("layer", a.layer)
            (replaced if rid in existing else added).append(rid)
            existing[rid] = r

    recs = sorted(existing.values(), key=lambda r: (str((r.get("location") or {}).get("state") or "~"), str(r.get("name"))))
    print(f"{a.layer}: +{len(added)} new, {len(replaced)} replaced, {len(refused)} refused -> {len(recs)} total")
    for x in refused:
        print("  REFUSED", x)
    if a.dry_run:
        return

    with open(target, "w", encoding="utf-8") as f:
        f.write(f"# {a.layer} layer — single source of truth. See docs/SCHEMA.md. Merged by scripts/research/merge.py.\n")
        yaml.dump(recs, f, Dumper=Dumper, sort_keys=False, allow_unicode=True, width=110, default_flow_style=False)

    os.makedirs(EVID, exist_ok=True)
    ev_path = os.path.join(EVID, f"{a.layer}.jsonl")
    seen = set(open(ev_path, encoding="utf-8").read().splitlines()) if os.path.exists(ev_path) else set()
    n = 0
    with open(ev_path, "a", encoding="utf-8") as out:
        for d in a.drafts:
            ev = os.path.splitext(d)[0] + ".evidence.jsonl"
            if not os.path.exists(ev):
                continue
            for line in open(ev, encoding="utf-8"):
                line = line.strip()
                if not line or line in seen:
                    continue
                try:
                    json.loads(line)
                except json.JSONDecodeError:
                    print("  bad evidence line skipped:", line[:80], file=sys.stderr)
                    continue
                out.write(line + "\n")
                seen.add(line)
                n += 1
    print(f"  evidence: +{n} lines -> {os.path.relpath(ev_path, ROOT)}")


if __name__ == "__main__":
    main()
