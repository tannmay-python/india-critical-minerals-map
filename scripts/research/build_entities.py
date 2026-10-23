#!/usr/bin/env python3
"""Expand a compact hand-written research draft into full SCHEMA records plus evidence lines.

Usage:
  .venv/bin/python -I scripts/research/build_entities.py research/drafts/l2-magnets.src.yml [--no-geocode]

Input (compact YAML):
  layer: magnets
  sources:                       # catalogue shared by the records in this draft
    irel-reep:
      raw: irel.co.in/irel-oscom-rare-earth-extraction-plant   # path under research/raw, no extension
      title: "..."; publisher: "..."; tier: T2; date: "2026-10-23"
  records:
    - id: ...                    # any SCHEMA §1 field; omitted fields get the skeleton default
      geo: {q: "Chatrapur", state: Odisha, district: Ganjam}     # or {district_centroid: Ganjam, state: Odisha}
      sources:
        - ref: irel-reep
          supports: [status, capacity.installed]
          ev:                    # field -> excerpt (<=30 words) copied from the raw text
            status: "REEP is having installed capacity of 11200 tpa"

Every excerpt is checked against the archived raw text (whitespace, case and quote marks
normalised). A missing excerpt, an unknown source ref or a field in `ev` that is not in
`supports` is a hard error, so a draft only builds when every quoted claim is on file.

Set `aux: true` at the top level (or on a record) for schemes/tranches records, which skip the
entity skeleton.

Output: research/drafts/<name>.yml (full records) and <name>.evidence.jsonl, ready for merge.py.
"""
import argparse
import copy
import datetime as dt
import json
import os
import re
import subprocess
import sys

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "research", "raw")
MANIFEST = os.path.join(RAW, "MANIFEST.jsonl")
TODAY = dt.date.today().isoformat()

SKELETON = {
    "aliases": [], "layer": None, "stages": [], "minerals": [], "commodity_as_stated": None,
    "products": [], "operator": None, "operator_type": None, "owners": [], "partners": [],
    "location": {"address": None, "village_or_town": None, "district": None, "state": None,
                 "country": "India", "lat": None, "lon": None, "precision": None, "geometry": None},
    "status": None, "status_as_of": None, "status_detail": None,
    "capacity": {"planned": {"value": None, "unit": None, "basis": None, "phase": None},
                 "installed": {"value": None, "unit": None, "basis": None}},
    "investment": {"amount": None, "currency": None, "basis": None},
    "feedstock": None, "feedstock_detail": None, "schemes": [], "scheme_status": {},
    "dates": {k: None for k in ("first_public", "announced", "mou", "approved", "construction_start",
                                "original_expected_completion", "revised_expected_completion",
                                "commissioned", "closed")},
    "milestones": [], "narrative": {"significance": None, "what_it_does": None, "why_it_matters": None},
    "related": [], "see_also": [], "confidence": None, "last_verified": TODAY, "notes": None,
}


def deep_merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def squash(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-").replace(" ", " ").replace("₹", "Rs ")
    return re.sub(r"\s+", " ", s).strip().lower()


def manifest_index():
    idx = {}
    for line in open(MANIFEST, encoding="utf-8"):
        try:
            r = json.loads(line)
        except json.JSONDecodeError:
            continue
        tp = r.get("text_path")
        if tp:
            idx[os.path.splitext(os.path.relpath(os.path.join(ROOT, tp), RAW))[0]] = r  # last write wins
    return idx


def geocode(geo):
    cmd = [sys.executable, "-I", os.path.join(ROOT, "scripts", "research", "geocode.py")]
    if geo.get("state_centroid"):
        cmd += ["--state-centroid", "--state", geo["state"]]
    elif geo.get("district_centroid"):
        cmd += ["--district-centroid", geo["district_centroid"], "--state", geo["state"]]
    else:
        cmd += [geo["q"], "--state", geo["state"]]
        if geo.get("district"):
            cmd += ["--district", geo["district"]]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout.strip().splitlines()
    r = json.loads(out[-1]) if out else {}
    if not r.get("ok"):
        raise SystemExit(f"geocode failed for {geo}: {r.get('reason') or r}")
    return round(float(r["lat"]), 5), round(float(r["lon"]), 5)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--no-geocode", action="store_true")
    a = ap.parse_args()

    doc = yaml.safe_load(open(a.src, encoding="utf-8"))
    layer = doc["layer"]
    idx = manifest_index()
    cat, texts, errors = {}, {}, []
    for sid, s in (doc.get("sources") or {}).items():
        m = idx.get(s["raw"])
        if not m:
            errors.append(f"source {sid}: raw {s['raw']!r} not in MANIFEST")
            continue
        cat[sid] = {"id": sid, "url": s.get("url") or m["url"], "title": s["title"], "publisher": s["publisher"],
                    "tier": s["tier"], "date": s.get("date"), "retrieved": m["retrieved"],
                    "archive_url": s.get("archive_url"), "_raw": m["text_path"]}
        texts[sid] = squash(open(os.path.join(ROOT, m["text_path"]), encoding="utf-8", errors="ignore").read())

    records, evidence = [], []
    for c in doc["records"]:
        c = dict(c)
        geo = c.pop("geo", None)
        srcs = c.pop("sources")
        aux = c.pop("aux", False) or doc.get("aux", False)   # schemes/tranches: no entity skeleton
        rec = copy.deepcopy(c) if aux else deep_merge(SKELETON, c)
        if not aux:
            rec["layer"] = rec.get("layer") or layer
        loc = rec.get("location") or {}
        if geo and loc.get("lat") is None:
            if a.no_geocode:
                errors.append(f"{rec['id']}: needs geocoding")
            else:
                loc["lat"], loc["lon"] = geocode(geo)
                loc["precision"] = loc.get("precision") or (
                    "state" if geo.get("state_centroid") else "district" if geo.get("district_centroid") else "town")
        out_sources = []
        for s in srcs:
            sid = s["ref"]
            if sid not in cat:
                errors.append(f"{rec['id']}: unknown source ref {sid}")
                continue
            sup = list(s.get("supports") or [])
            for field, ex in (s.get("ev") or {}).items():
                exs = ex if isinstance(ex, list) else [ex]
                if field not in sup:
                    errors.append(f"{rec['id']}: ev field {field!r} not in supports of {sid}")
                for e in exs:
                    if len(e.split()) > 30:
                        errors.append(f"{rec['id']}/{sid}/{field}: excerpt over 30 words")
                    if squash(e) not in texts[sid]:
                        errors.append(f"{rec['id']}/{sid}/{field}: excerpt not found in raw: {e[:80]!r}")
                    evidence.append({"entity": rec["id"], "field": field, "source_id": sid, "excerpt": e,
                                     "raw_path": cat[sid]["_raw"], "retrieved": cat[sid]["retrieved"],
                                     "checked_by": "researcher", "check": "excerpt found in raw text"})
            src = {k: v for k, v in cat[sid].items() if not k.startswith("_")}
            src["supports"] = sup
            out_sources.append(src)
        rec["sources"] = out_sources
        records.append(rec)

    if errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit(f"{len(errors)} error(s); nothing written")
    base = re.sub(r"\.src\.yml$", "", a.src)
    with open(base + ".yml", "w", encoding="utf-8") as f:
        yaml.safe_dump(records, f, sort_keys=False, allow_unicode=True, width=110)
    with open(base + ".evidence.jsonl", "w", encoding="utf-8") as f:
        for e in evidence:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(records)} records, {len(evidence)} evidence lines -> {os.path.relpath(base, ROOT)}.yml")


if __name__ == "__main__":
    main()
