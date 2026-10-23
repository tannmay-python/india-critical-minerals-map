#!/usr/bin/env python3
"""Point-in-polygon checks for every record (RESEARCH_PROTOCOL.md §6, rule 4).

- India records: the point must fall inside its stated state (data/reference/states.geojson).
- Offshore blocks (block.concession_type Offshore-*): inside India's EEZ (data/reference/eez-india.geojson).
- ISA areas (concession_type ISA-*): skipped (international waters), reported as info.
- Overseas records: inside the stated host country (data/reference/world-ind-pov.geojson).
- Warning (not failure): exact/site/town points outside the stated district polygon.

Usage: .venv/bin/python -I scripts/geocheck.py [files...]   (default: data/*.yml entity files)
Exit 1 on any failure.
"""
import glob
import json
import os
import sys

import yaml
from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REF = os.path.join(ROOT, "data", "reference")
SKIP = {"schemes", "tranches", "gsi_exploration"}
ALIASES = {"orissa": "odisha", "pondicherry": "puducherry", "uttaranchal": "uttarakhand",
           "andaman & nicobar islands": "andaman and nicobar islands", "jammu & kashmir": "jammu and kashmir",
           "nct of delhi": "delhi"}
COUNTRY_ALIASES = {"usa": "united states of america", "united states": "united states of america",
                   "us": "united states of america", "uk": "united kingdom", "drc": "democratic republic of the congo",
                   "dr congo": "democratic republic of the congo", "korea": "south korea", "uae": "united arab emirates"}


def norm(s, aliases=ALIASES):
    s = (s or "").strip().lower()
    return aliases.get(s, s)


def load_polys(path, key, aliases=ALIASES):
    out = {}
    for f in json.load(open(path))["features"]:
        names = [f["properties"].get(k) for k in (key if isinstance(key, list) else [key])]
        g = prep(shape(f["geometry"]))
        for n in names:
            if n:
                out.setdefault(norm(n, aliases), []).append(g)
    return out


def inside(polys, p):
    return any(g.contains(p) for g in polys)


def main():
    files = sys.argv[1:] or [p for p in glob.glob(os.path.join(ROOT, "data", "*.yml"))
                             if os.path.splitext(os.path.basename(p))[0] not in SKIP]
    states = load_polys(os.path.join(REF, "states.geojson"), "state")
    districts = {}
    for f in json.load(open(os.path.join(REF, "districts.geojson")))["features"]:
        districts.setdefault((norm(f["properties"]["state"]), norm(f["properties"]["district"])), []).append(prep(shape(f["geometry"])))
    eez = [prep(shape(f["geometry"])) for f in json.load(open(os.path.join(REF, "eez-india.geojson")))["features"]]
    world = load_polys(os.path.join(REF, "world-ind-pov.geojson"), ["name", "name_long", "iso_a3", "adm0_a3"], COUNTRY_ALIASES)

    fails, warns, info, n = [], [], [], 0
    for path in files:
        recs = yaml.safe_load(open(path, encoding="utf-8")) or []
        for r in recs:
            loc = r.get("location") or {}
            lat, lon = loc.get("lat"), loc.get("lon")
            if lat is None or lon is None:
                continue
            n += 1
            p = Point(float(lon), float(lat))
            rid = r.get("id")
            ctype = str((r.get("block") or {}).get("concession_type") or "")
            if ctype.startswith("ISA"):
                info.append(f"{rid}: ISA area, not checked")
                continue
            if ctype.startswith("Offshore"):
                if not inside(eez, p):
                    fails.append(f"{rid}: offshore point ({lat},{lon}) outside India's EEZ")
                continue
            if r.get("layer") == "overseas":
                c = norm((r.get("overseas") or {}).get("host_country") or loc.get("country"), COUNTRY_ALIASES)
                if c not in world:
                    fails.append(f"{rid}: host country {c!r} not found in world-ind-pov")
                elif not inside(world[c], p):
                    fails.append(f"{rid}: ({lat},{lon}) outside {c}")
                continue
            st = norm(loc.get("state"))
            if st not in states:
                fails.append(f"{rid}: state {loc.get('state')!r} not in states.geojson")
                continue
            if not inside(states[st], p):
                fails.append(f"{rid}: ({lat},{lon}) outside {loc.get('state')} [{loc.get('precision')}]")
                continue
            d = norm(loc.get("district"))
            if d and loc.get("precision") in ("exact", "site", "town"):
                key = (st, d)
                if key in districts and not inside(districts[key], p):
                    warns.append(f"{rid}: ({lat},{lon}) outside district {loc.get('district')} (district polygons are 2019 vintage)")
                elif key not in districts:
                    warns.append(f"{rid}: district {loc.get('district')!r} not in districts.geojson (newer district or spelling)")

    print(f"geocheck: {n} points checked, {len(fails)} failure(s), {len(warns)} warning(s), {len(info)} skipped")
    for x in fails:
        print("FAIL ", x)
    for x in warns:
        print("WARN ", x)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
