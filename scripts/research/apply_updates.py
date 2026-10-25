#!/usr/bin/env python3
"""Apply sourced field updates (e.g. post-auction status) to existing records.

Usage:
  .venv/bin/python -I scripts/research/apply_updates.py research/drafts/l1-status-2026-10.src.yml

Input (compact YAML), same source catalogue as build_entities.py:
  layer: blocks
  sources: {id: {raw, title, publisher, tier, date}}
  updates:
    - id: blk-tg-govindpur
      set: {status: LoI issued, status_as_of: "2026-08-31", auction: {loi_date: "2026-08-31"}}
      milestones: [{date: "2026-08-31", event: "...", source_id: psuwatch-...}]
      sources: [{ref: ..., supports: [...], ev: {field: "excerpt"}}]

Every excerpt is checked against the archived raw text. The current record is read from
data/<layer>.yml, `set` is deep-merged into it, milestones and sources are appended, and the
full records are written to research/drafts/<name>.yml plus .evidence.jsonl for merge.py.
"""
import argparse
import json
import os
import re
import sys

import yaml

sys.path.insert(0, os.path.dirname(__file__))
from build_entities import ROOT, deep_merge, manifest_index, squash  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    a = ap.parse_args()
    doc = yaml.safe_load(open(a.src, encoding="utf-8"))
    layer = doc["layer"]
    current = {r["id"]: r for r in yaml.safe_load(open(os.path.join(ROOT, "data", f"{layer}.yml"), encoding="utf-8"))}
    idx = manifest_index()
    cat, texts, errors = {}, {}, []
    for sid, s in (doc.get("sources") or {}).items():
        m = idx.get(s["raw"])
        if not m:
            errors.append(f"source {sid}: raw {s['raw']!r} not in MANIFEST")
            continue
        cat[sid] = {"id": sid, "url": s.get("url") or m["url"], "title": s["title"], "publisher": s["publisher"],
                    "tier": s["tier"], "date": s.get("date"), "retrieved": m["retrieved"], "archive_url": None,
                    "_raw": m["text_path"]}
        texts[sid] = squash(open(os.path.join(ROOT, m["text_path"]), encoding="utf-8", errors="ignore").read())

    out, evidence = [], []
    for u in doc["updates"]:
        rid = u["id"]
        if rid not in current:
            errors.append(f"{rid}: not in data/{layer}.yml")
            continue
        rec = deep_merge(current[rid], u.get("set") or {})
        rec["milestones"] = list(rec.get("milestones") or []) + list(u.get("milestones") or [])
        have = {s.get("id") for s in rec.get("sources") or []}
        for s in u.get("sources") or []:
            sid = s["ref"]
            if sid not in cat:
                errors.append(f"{rid}: unknown source ref {sid}")
                continue
            sup = list(s.get("supports") or [])
            for field, ex in (s.get("ev") or {}).items():
                if field not in sup:
                    errors.append(f"{rid}: ev field {field!r} not in supports of {sid}")
                for e in (ex if isinstance(ex, list) else [ex]):
                    if len(e.split()) > 30:
                        errors.append(f"{rid}/{sid}/{field}: excerpt over 30 words")
                    if squash(e) not in texts[sid]:
                        errors.append(f"{rid}/{sid}/{field}: excerpt not found in raw: {e[:80]!r}")
                    evidence.append({"entity": rid, "field": field, "source_id": sid, "excerpt": e,
                                     "raw_path": cat[sid]["_raw"], "retrieved": cat[sid]["retrieved"],
                                     "checked_by": "researcher", "check": "excerpt found in raw text"})
            if sid in have:   # same source already cited: widen its supports
                for x in rec["sources"]:
                    if x.get("id") == sid:
                        x["supports"] = sorted(set(x.get("supports") or []) | set(sup))
            else:
                src = {k: v for k, v in cat[sid].items() if not k.startswith("_")}
                src["supports"] = sup
                rec.setdefault("sources", []).append(src)
        out.append(rec)

    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(f"{len(errors)} error(s); nothing written")
    base = re.sub(r"\.src\.yml$", "", a.src)
    with open(base + ".yml", "w", encoding="utf-8") as f:
        yaml.safe_dump(out, f, sort_keys=False, allow_unicode=True, width=110)
    with open(base + ".evidence.jsonl", "w", encoding="utf-8") as f:
        for e in evidence:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(out)} updated records, {len(evidence)} evidence lines -> {os.path.relpath(base, ROOT)}.yml")


if __name__ == "__main__":
    main()
