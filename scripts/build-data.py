#!/usr/bin/env python3
"""YAML -> JSON / GeoJSON / CSV bundles for the app (docs/SCHEMA.md §4 and §6).

Usage: .venv/bin/python -I scripts/build-data.py [--out public]

Writes:
  public/data/entities.json          all records, flattened for the app (+ derived fields)
  public/data/entities.geojson       points with key properties
  public/data/blocks-polygons.geojson block geometries
  public/data/aggregates.json        derived aggregates (counts, auction success rates)
  public/data/schemes.json, tranches.json, gsi.json, minerals.json, stages.json, coverage.json, meta.json
  public/data/geo/*.geojson          web-simplified boundaries (copied from data/reference/web)
  public/downloads/<layer>.csv, public/downloads/all-entities.geojson
Never hand-edit the outputs.
"""
import argparse
import csv
import datetime as dt
import json
import os
import re
import shutil
from collections import Counter, defaultdict

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data")
LAYERS = ["blocks", "mines", "processing", "materials", "magnets", "recycling", "rnd", "overseas", "demand"]
TODAY = dt.date.today()

STATUS_GROUP = {
    # solid
    "Operational": "active", "Active": "active", "Licence / lease executed": "active", "Expanding": "active",
    # ring / pipeline
    "Identified": "pipeline", "Offered": "pipeline", "Re-offered": "pipeline", "Preferred bidder": "pipeline",
    "LoI issued": "pipeline", "Announced": "pipeline", "MoU signed": "pipeline", "Bid submitted": "pipeline",
    "Approved": "pipeline", "Under construction": "pipeline", "Pilot": "pipeline", "Under evaluation": "pipeline",
    # struck
    "Cancelled": "inactive", "Closed": "inactive", "Annulled": "inactive", "Stalled": "inactive",
    "Concluded": "inactive", "Bid lost": "inactive", "Withdrawn": "inactive",
}

# Short scheme names for the filter and the detail panel.
SCHEME_SHORT = {
    "repm": "Rare earth magnet scheme (REPM)", "ecms": "Electronics components scheme (ECMS)",
    "ncmm-recycling": "NCMM recycling incentive", "ncmm-coe": "NCMM Centre of Excellence",
    "ncmm-processing-parks": "NCMM processing park", "acc-pli": "Battery cell PLI (ACC)",
    "ism": "India Semiconductor Mission",
}


def load(name):
    p = os.path.join(DATA, f"{name}.yml")
    if not os.path.exists(p):
        return []
    d = yaml.safe_load(open(p, encoding="utf-8"))
    return d or []


def pdate(s):
    """ISO date, year-month or year -> date (first of period)."""
    if not s:
        return None
    s = str(s)
    parts = [int(x) for x in s.split("-")]
    parts += [1] * (3 - len(parts))
    try:
        return dt.date(*parts)
    except ValueError:
        return None


def months_between(a, b):
    if not a or not b:
        return None
    return (b.year - a.year) * 12 + (b.month - a.month)


def centroid(geom):
    from shapely.geometry import shape
    g = shape(geom)
    c = g.centroid if g.contains(g.centroid) else g.representative_point()
    return round(c.y, 6), round(c.x, 6)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "public"))
    a = ap.parse_args()
    out_data = os.path.join(a.out, "data")
    out_dl = os.path.join(a.out, "downloads")
    os.makedirs(out_data, exist_ok=True)
    os.makedirs(out_dl, exist_ok=True)

    minerals = yaml.safe_load(open(os.path.join(DATA, "reference", "minerals.yml")))["minerals"]
    stages = yaml.safe_load(open(os.path.join(DATA, "reference", "stages.yml")))["stages"]
    mineral_by = {m["name"]: m for m in minerals}
    umbrella_members = {m["name"]: m["members"] for m in minerals if m.get("umbrella")}
    canonical = [m["name"] for m in minerals if not m.get("umbrella")]

    entities = []
    for layer in LAYERS:
        for r in load(layer):
            entities.append(r)
    by_id = {e["id"]: e for e in entities}

    # scheme membership comes from schemes.yml (beneficiaries, bidders with a mapped site)
    scheme_links = {}
    for sc in load("schemes"):
        short = SCHEME_SHORT.get(sc["id"]) or sc["name"]
        for rid in sc.get("beneficiaries") or []:
            scheme_links.setdefault(rid, []).append({"id": sc["id"], "name": short, "role": "beneficiary"})
        for rid in (sc.get("bidder_records") or {}).values():
            scheme_links.setdefault(rid, []).append({"id": sc["id"], "name": short, "role": "bidder"})

    flat, features, polys = [], [], []
    for e in entities:
        loc = e.get("location") or {}
        dates = e.get("dates") or {}
        lat, lon = loc.get("lat"), loc.get("lon")
        if (lat is None or lon is None) and loc.get("geometry"):
            lat, lon = centroid(loc["geometry"])
        # derived: slippage, stalled, block lag
        orig = pdate(dates.get("original_expected_completion"))
        actual = pdate(dates.get("commissioned")) or pdate(dates.get("revised_expected_completion"))
        slippage = months_between(orig, actual) if orig and actual else None
        last_status_ev = pdate(e.get("status_as_of"))
        stalled = bool(orig and e.get("status") not in ("Operational", "Closed", "Expanding")
                       and (TODAY - orig).days > 548 and last_status_ev and last_status_ev <= orig)
        lag = None
        if e.get("layer") == "blocks":
            hist = (e.get("auction") or {}).get("history") or []
            pb = [pdate(h.get("outcome_date")) for h in hist if h.get("outcome") == "Preferred bidder" and h.get("outcome_date")]
            ex = pdate((e.get("auction") or {}).get("licence_or_lease_executed"))
            prod = pdate((e.get("auction") or {}).get("production_started"))
            lag = {"pb_to_lease": months_between(pb[-1], ex) if pb and ex else None,
                   "lease_to_production": months_between(ex, prod) if ex and prod else None}
        mins = e.get("minerals") or []
        expanded = sorted({x for m in mins for x in umbrella_members.get(m, [m])})
        # umbrella tags have no dashboard page; the UI links their member elements instead
        links = [{"name": m, "url": mineral_by[m]["dashboard_url"]} for m in mins if mineral_by.get(m, {}).get("dashboard_url")]
        sources = e.get("sources") or []
        rec = {
            "id": e["id"], "name": e.get("name"), "aliases": e.get("aliases") or [], "layer": e.get("layer"),
            "stages": e.get("stages") or [], "minerals": mins, "minerals_expanded": expanded,
            "commodity_as_stated": e.get("commodity_as_stated"), "products": e.get("products") or [],
            "operator": e.get("operator"), "operator_type": e.get("operator_type"), "owners": e.get("owners") or [],
            "partners": e.get("partners") or [],
            "location": {k: loc.get(k) for k in ("address", "village_or_town", "district", "state", "country", "precision")},
            "lat": lat, "lon": lon, "has_geometry": bool(loc.get("geometry")),
            "status": e.get("status"), "status_group": STATUS_GROUP.get(e.get("status"), "pipeline"),
            "status_as_of": e.get("status_as_of"), "status_detail": e.get("status_detail"),
            "capacity": e.get("capacity"), "investment": e.get("investment"),
            "feedstock": e.get("feedstock"), "feedstock_detail": e.get("feedstock_detail"),
            "schemes": e.get("schemes") or [], "scheme_status": e.get("scheme_status") or {},
            "scheme_links": scheme_links.get(e["id"], []),
            "dates": dates, "milestones": sorted(e.get("milestones") or [], key=lambda m: str(m.get("date"))),
            "narrative": e.get("narrative") or {}, "related": [x for x in (e.get("related") or []) if x in by_id],
            "see_also": e.get("see_also") or [], "confidence": e.get("confidence"),
            "last_verified": e.get("last_verified"), "notes": e.get("notes"),
            "sources": [{k: s.get(k) for k in ("id", "url", "title", "publisher", "tier", "date", "archive_url", "supports")}
                        for s in sources],
            "dashboard_links": links,
            "slippage_months": slippage, "stalled_flag": stalled, "block_lag_months": lag,
        }
        for ext in ("block", "auction", "overseas", "rnd", "demand"):
            if e.get(ext):
                rec[ext] = e[ext]
        flat.append(rec)
        if lat is not None and lon is not None:
            features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                             "properties": {"id": rec["id"], "name": rec["name"], "layer": rec["layer"],
                                            "stage": rec["stages"][0] if rec["stages"] else None,
                                            "status": rec["status"], "status_group": rec["status_group"],
                                            "precision": rec["location"]["precision"],
                                            "confidence": rec["confidence"]}})
        if loc.get("geometry"):
            polys.append({"type": "Feature", "geometry": loc["geometry"],
                          "properties": {"id": rec["id"], "status": rec["status"], "status_group": rec["status_group"]}})

    # ---- aggregates
    agg = {"generated": TODAY.isoformat(), "total": len(flat)}
    agg["by_layer"] = Counter(r["layer"] for r in flat)
    agg["by_status"] = Counter(r["status"] for r in flat)
    sxm = defaultdict(Counter)
    for r in flat:
        for s in r["stages"]:
            for m in r["minerals_expanded"] or ["(untagged)"]:
                sxm[m][s] += 1
    agg["stage_by_mineral"] = {m: dict(c) for m, c in sxm.items()}
    sxs = defaultdict(Counter)
    for r in flat:
        for s in r["stages"]:
            sxs[r["location"].get("state") or "(none)"][s] += 1
    agg["stage_by_state"] = {k: dict(v) for k, v in sxs.items()}
    stx = defaultdict(Counter)
    for r in flat:
        for s in r["stages"]:
            stx[r["status"]][s] += 1
    agg["status_by_stage"] = {k: dict(v) for k, v in stx.items()}
    # auction success by tranche / mineral / state (blocks only)
    tr = defaultdict(Counter)
    for r in flat:
        if r["layer"] != "blocks":
            continue
        for h in (r.get("auction") or {}).get("history") or []:
            t = h.get("tranche") or "(unknown)"
            tr[t]["offered"] += 1
            tr[t][h.get("outcome") or "Pending"] += 1
    agg["auction_by_tranche"] = {k: dict(v) for k, v in tr.items()}
    for key in ("mineral", "state"):
        c = defaultdict(Counter)
        for r in flat:
            if r["layer"] != "blocks":
                continue
            ks = r["minerals_expanded"] if key == "mineral" else [r["location"].get("state")]
            success = r["status"] in ("Preferred bidder", "LoI issued", "Licence / lease executed", "Operational")
            for k in ks or ["(none)"]:
                c[k]["blocks"] += 1
                c[k]["auctioned"] += int(success)
        agg[f"auction_by_{key}"] = {k: dict(v) for k, v in c.items()}
    agg = json.loads(json.dumps(agg, default=dict))

    def dump(name, obj):
        with open(os.path.join(out_data, name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))

    dump("entities.json", flat)
    dump("entities.geojson", {"type": "FeatureCollection", "features": features})
    dump("blocks-polygons.geojson", {"type": "FeatureCollection", "features": polys})
    dump("aggregates.json", agg)
    for name in ("schemes", "tranches", "gsi_exploration"):
        dump(f"{'gsi' if name == 'gsi_exploration' else name}.json", load(name))
    dump("minerals.json", minerals)
    dump("stages.json", stages)
    cov = os.path.join(ROOT, "research", "coverage.yml")
    dump("coverage.json", yaml.safe_load(open(cov)) if os.path.exists(cov) else {})
    oq = os.path.join(ROOT, "research", "OPEN_QUESTIONS.md")
    n_oq = sum(1 for line in open(oq) if re.match(r"^\|\s*\d+\s*\|", line)) if os.path.exists(oq) else 0
    dump("meta.json", {"built": dt.datetime.now().isoformat(timespec="seconds"), "entities": len(flat),
                       "open_questions": n_oq, "canonical_minerals": len(canonical)})

    # web boundaries
    web = os.path.join(DATA, "reference", "web")
    if os.path.isdir(web):
        gdir = os.path.join(out_data, "geo")
        os.makedirs(gdir, exist_ok=True)
        for f in os.listdir(web):
            if f.endswith(".geojson"):
                shutil.copy2(os.path.join(web, f), os.path.join(gdir, f))

    # downloads
    cols = ["id", "name", "layer", "stages", "minerals", "commodity_as_stated", "operator", "operator_type",
            "status", "status_as_of", "village_or_town", "district", "state", "country", "lat", "lon", "precision",
            "capacity_planned", "capacity_installed", "investment", "first_public", "confidence", "last_verified",
            "source_urls"]
    for layer in LAYERS:
        rows = [r for r in flat if r["layer"] == layer]
        if not rows:
            continue
        with open(os.path.join(out_dl, f"{layer}.csv"), "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(cols)
            for r in rows:
                cap = r.get("capacity") or {}

                def capstr(c):
                    c = c or {}
                    return f"{c.get('value')} {c.get('unit') or ''}".strip() if c.get("value") is not None else ""
                inv = r.get("investment") or {}
                w.writerow([r["id"], r["name"], r["layer"], "; ".join(r["stages"]), "; ".join(r["minerals"]),
                            r.get("commodity_as_stated") or "", r.get("operator") or "", r.get("operator_type") or "",
                            r["status"], r.get("status_as_of") or "", r["location"].get("village_or_town") or "",
                            r["location"].get("district") or "", r["location"].get("state") or "",
                            r["location"].get("country") or "", r["lat"], r["lon"], r["location"].get("precision"),
                            capstr(cap.get("planned")), capstr(cap.get("installed")),
                            f"{inv.get('amount')} {inv.get('currency') or ''}".strip() if inv.get("amount") is not None else "",
                            (r.get("dates") or {}).get("first_public") or "", r["confidence"], r["last_verified"],
                            " ".join(s["url"] for s in r["sources"])])
    with open(os.path.join(out_dl, "all-entities.geojson"), "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [r["lon"], r["lat"]]},
             "properties": {k: v for k, v in r.items() if k not in ("lat", "lon")}}
            for r in flat if r["lat"] is not None]}, f, ensure_ascii=False)
    print(f"built {len(flat)} entities, {len(features)} points, {len(polys)} polygons -> {os.path.relpath(a.out, ROOT)}/")


if __name__ == "__main__":
    main()
