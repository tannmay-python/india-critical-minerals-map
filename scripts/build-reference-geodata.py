#!/usr/bin/env python3
"""Build the reference boundary layers in data/reference/ from raw downloads in research/raw/geodata/.

Phase 0, L0 > Boundaries (docs/LAYER_PLAYBOOKS.md). Sources and licences: data/reference/ATTRIBUTION.md.
Each step writes its output file as soon as it is computed.

Usage:
  .venv/bin/python -I scripts/build-reference-geodata.py boundary   # india-boundary.geojson (official outline)
  .venv/bin/python -I scripts/build-reference-geodata.py states     # states.geojson, reconciled to the outline
  .venv/bin/python -I scripts/build-reference-geodata.py districts  # districts.geojson, reconciled to states
  .venv/bin/python -I scripts/build-reference-geodata.py world      # world-ind-pov.geojson (NE IND POV + official India)
  .venv/bin/python -I scripts/build-reference-geodata.py eez        # eez-india.geojson (Marine Regions EEZ v12)
  .venv/bin/python -I scripts/build-reference-geodata.py web        # data/reference/web/* via mapshaper
  .venv/bin/python -I scripts/build-reference-geodata.py all

Reconciliation rule (states and districts): every unit is clipped to its frame (the official outline for
states, the reconciled state polygon for districts); any part of the frame left uncovered is given to the
unit with which it shares the longest edge (nearest unit if it touches none). The union of the units
therefore equals the frame. Raw gap/overhang areas are printed and logged.
"""
import json
import os
import subprocess
import sys

import shapefile  # pyshp
import shapely
from pyproj import Geod, Transformer
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, mapping, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "research", "raw", "geodata")
OUT = os.path.join(ROOT, "data", "reference")
WEB = os.path.join(OUT, "web")
GEOD = Geod(ellps="WGS84")
GRID = 1e-6  # full-resolution files are snapped to a 1e-6 degree grid (~0.1 m) with shapely.set_precision

# Official names (First Schedule to the Constitution) -> 2-letter codes from research/TOOLING.md
STATE_CODES = {
    "Andhra Pradesh": "ap", "Arunachal Pradesh": "ar", "Assam": "as", "Bihar": "br", "Chhattisgarh": "cg",
    "Goa": "ga", "Gujarat": "gj", "Haryana": "hr", "Himachal Pradesh": "hp", "Jharkhand": "jh",
    "Karnataka": "ka", "Kerala": "kl", "Madhya Pradesh": "mp", "Maharashtra": "mh", "Manipur": "mn",
    "Meghalaya": "ml", "Mizoram": "mz", "Nagaland": "nl", "Odisha": "od", "Punjab": "pb", "Rajasthan": "rj",
    "Sikkim": "sk", "Tamil Nadu": "tn", "Telangana": "tg", "Tripura": "tr", "Uttar Pradesh": "up",
    "Uttarakhand": "uk", "West Bengal": "wb",
    "Andaman and Nicobar Islands": "an", "Jammu and Kashmir": "jk", "Ladakh": "la", "Delhi": "dl",
    "Puducherry": "py", "Chandigarh": "ch", "Dadra and Nagar Haveli and Daman and Diu": "dn",
    "Lakshadweep": "ld",
}
ADMIN2_RENAME = {"Andaman & Nicobar": "Andaman and Nicobar Islands", "Jammu & Kashmir": "Jammu and Kashmir"}
DISTRICT_STATE_RENAME = {
    "Andaman and Nicobar": "Andaman and Nicobar Islands",
    "Dadra and Nagar Haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "Daman and Diu": "Dadra and Nagar Haveli and Daman and Diu",
}
# state-wise files in datameet/indian-district-boundaries that were corrected after the all-India file
DISTRICT_STATE_OVERRIDES = {"Chhattisgarh": "chhattisgarh.json", "Mizoram": "mizoram.json", "Sikkim": "sikkim.json"}

P_COMPOSITE = os.path.join(RAW, "pranay", "india-composite.geojson")
P_ADMIN2 = os.path.join(RAW, "datameet", "States", "Admin2")
P_DIST = os.path.join(RAW, "datameet", "india-districts-2019-734.json")
P_DIST_SW = os.path.join(RAW, "datameet", "statewise")
P_NE = os.path.join(RAW, "naturalearth", "ne_10m_admin_0_countries_ind.geojson")
P_EEZ = os.path.join(RAW, "marineregions", "eez_india_wfs.json")
P_EEZ_IW = os.path.join(RAW, "marineregions", "eez_internal_waters_india_wfs.json")


def km2(g):
    return abs(GEOD.geometry_area_perimeter(g)[0]) / 1e6 if not g.is_empty else 0.0


def polys(g):
    """Polygonal part of any geometry, as a MultiPolygon."""
    if g is None or g.is_empty:
        return MultiPolygon()
    if isinstance(g, Polygon):
        return MultiPolygon([g])
    if isinstance(g, MultiPolygon):
        return g
    out = []
    for p in getattr(g, "geoms", []):
        out.extend(polys(p).geoms)
    return MultiPolygon(out)


def explode(g):
    return list(polys(g).geoms)


def valid(g):
    return polys(g if g.is_valid else shapely.make_valid(g))


def snap(g):
    return polys(shapely.set_precision(g, GRID))


def load_outline():
    gj = json.load(open(P_COMPOSITE))
    assert len(gj["features"]) == 1
    return valid(shape(gj["features"][0]["geometry"]))


def write_fc(path, features, note=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fc = {"type": "FeatureCollection", "features": features}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    print(f"[write] {os.path.relpath(path, ROOT)}  {os.path.getsize(path)/1e6:.2f} MB  {len(features)} features"
          + (f"  ({note})" if note else ""))


def _round(c, nd):
    if isinstance(c, (float, int)):
        return round(float(c), nd)
    return [_round(x, nd) for x in c]


def feat(props, geom, nd=6):
    """GeoJSON feature with coordinates rounded to nd decimals (set_precision output prints as 77.12345000000001)."""
    m = mapping(geom)
    return {"type": "Feature", "properties": props, "geometry": {"type": m["type"], "coordinates": _round(m["coordinates"], nd)}}


def reconcile(units, frame, label, eps=2e-6):
    """Clip units (dict key->geom) to frame and assign uncovered parts of frame. Returns (dict, stats)."""
    raw_union = unary_union(list(units.values()))
    overhang = km2(raw_union.difference(frame))
    clipped = {k: valid(g.intersection(frame)) for k, g in units.items()}
    covered = unary_union(list(clipped.values()))
    parts = explode(frame.difference(covered))
    keys = list(clipped)
    geoms = [clipped[k] for k in keys]
    tree = STRtree(geoms)
    extra = {k: [] for k in keys}
    nearest = []
    for p in parts:
        pb = p.buffer(eps)
        best, bestv = None, 0.0
        for i in tree.query(pb):
            sub = shapely.clip_by_rect(geoms[i], *pb.bounds)
            v = sub.intersection(pb).area if not sub.is_empty else 0.0
            if v > bestv:
                best, bestv = int(i), v
        if best is None:
            best = int(tree.nearest(p))
            nearest.append((keys[best], round(km2(p), 3), round(geoms[best].distance(p) * 111, 2)))
        extra[keys[best]].append(p)
    out = {k: valid(unary_union([clipped[k]] + extra[k])) if extra[k] else clipped[k] for k in keys}
    gap_area = sum(km2(p) for p in parts)
    stats = {
        "label": label, "frame_km2": round(km2(frame), 1), "raw_union_km2": round(km2(raw_union), 1),
        "overhang_km2_removed": round(overhang, 1), "gap_km2_filled": round(gap_area, 1),
        "gap_parts": len(parts), "assigned_by_nearest": len(nearest),
        "nearest_examples": sorted(nearest, key=lambda x: -x[1])[:5],
        "per_unit_gain_km2": {k: round(sum(km2(p) for p in v), 1) for k, v in extra.items() if v},
    }
    return out, stats


# ---------------------------------------------------------------- boundary
def build_boundary():
    gj = json.load(open(P_COMPOSITE))
    f = gj["features"][0]
    g = shape(f["geometry"])
    props = {
        "name": "India", "iso_a3": "IND",
        "depiction": "Official boundary of India as per Survey of India (DataMeet composite)",
        "source": "datameet/maps Country/india-composite.geojson, as used in pranaykotas/india-semiconductor-tracker",
    }
    # geometry kept exactly as published (no rounding, no simplification)
    write_fc(os.path.join(OUT, "india-boundary.geojson"), [{"type": "Feature", "properties": props, "geometry": f["geometry"]}],
             note=f"{len(g.geoms)} polygons, bbox {tuple(round(x, 5) for x in g.bounds)}, {km2(g):,.0f} km2")


# ---------------------------------------------------------------- states
def read_admin2():
    sf = shapefile.Reader(P_ADMIN2)
    out = {}
    for sr in sf.shapeRecords():
        nm = ADMIN2_RENAME.get(sr.record[0], sr.record[0])
        assert nm in STATE_CODES, nm
        out[nm] = valid(shape(sr.shape.__geo_interface__))
    missing = set(STATE_CODES) - set(out)
    assert not missing, missing
    return out


def build_states():
    frame = load_outline()
    units = read_admin2()
    out, stats = reconcile(units, frame, "states vs official outline")
    feats = []
    for nm in sorted(out):
        g = snap(out[nm])
        feats.append(feat({"state": nm, "st": STATE_CODES[nm]}, g))
    write_fc(os.path.join(OUT, "states.geojson"), feats, note="36 states/UTs reconciled to official outline")
    u = unary_union([shape(f["geometry"]) for f in feats])
    stats["post_symdiff_km2"] = round(km2(u.symmetric_difference(frame)), 3)
    print(json.dumps(stats, indent=1))
    json.dump(stats, open(os.path.join(RAW, "states-reconcile-stats.json"), "w"), indent=1)


# ---------------------------------------------------------------- districts
def topo_features(path):
    t = json.load(open(path))
    tr = t.get("transform")
    arcs = []
    for arc in t["arcs"]:
        pts = []
        if tr:
            (sx, sy), (tx, ty) = tr["scale"], tr["translate"]
            x = y = 0
            for dx, dy in arc:
                x += dx
                y += dy
                pts.append((x * sx + tx, y * sy + ty))
        else:
            pts = [tuple(p) for p in arc]
        arcs.append(pts)

    def ring(idxs):
        pts = []
        for i in idxs:
            a = arcs[i] if i >= 0 else arcs[~i][::-1]
            pts.extend(a[1:] if pts else a)
        return pts

    for obj in t["objects"].values():
        for g in obj["geometries"]:
            if g["type"] == "Polygon":
                geom = {"type": "Polygon", "coordinates": [ring(r) for r in g["arcs"]]}
            elif g["type"] == "MultiPolygon":
                geom = {"type": "MultiPolygon", "coordinates": [[ring(r) for r in poly] for poly in g["arcs"]]}
            else:
                continue
            yield g.get("properties", {}), geom


def read_districts():
    rows = []
    for p, g in topo_features(P_DIST):
        if p["st_nm"] in DISTRICT_STATE_OVERRIDES:
            continue
        rows.append((p, g))
    for st_nm, fn in DISTRICT_STATE_OVERRIDES.items():
        n = 0
        for p, g in topo_features(os.path.join(P_DIST_SW, fn)):
            assert p["st_nm"] == st_nm, (fn, p)
            rows.append((p, g))
            n += 1
        print(f"[districts] {st_nm}: {n} districts from state-wise {fn}")
    out = []
    for p, g in rows:
        st = DISTRICT_STATE_RENAME.get(p["st_nm"], p["st_nm"])
        assert st in STATE_CODES, p
        out.append({"district": " ".join(p["district"].split()), "state": st, "st": STATE_CODES[st],
                    "dt_code": p.get("dt_code"), "source_year": p.get("year"), "geom": valid(shape(g))})
    return out


def build_districts():
    states = {f["properties"]["state"]: valid(shape(f["geometry"]))
              for f in json.load(open(os.path.join(OUT, "states.geojson")))["features"]}
    rows = read_districts()
    feats, allstats, flagged = [], [], []
    for st in sorted(states):
        mine = [r for r in rows if r["state"] == st]
        keys = {f"{r['district']}|{i}": r for i, r in enumerate(mine)}
        out, stats = reconcile({k: r["geom"] for k, r in keys.items()}, states[st], f"districts in {st}")
        stats.pop("per_unit_gain_km2")
        allstats.append(stats)
        for k, r in keys.items():
            g = snap(out[k])
            a0, a1 = km2(r["geom"]), km2(g)
            if a0 > 0 and a1 / a0 < 0.9:
                flagged.append((st, r["district"], round(a0), round(a1)))
            props = {kk: r[kk] for kk in ("district", "state", "st", "dt_code", "source_year")}
            feats.append(feat(props, g))
    write_fc(os.path.join(OUT, "districts.geojson"), feats, note="nested in states.geojson")
    tot = {k: round(sum(s[k] for s in allstats), 1) for k in ("overhang_km2_removed", "gap_km2_filled")}
    print("[districts] totals", tot, "districts losing >10% area on clip:", flagged)
    json.dump({"per_state": allstats, "totals": tot, "flagged": flagged},
              open(os.path.join(RAW, "districts-reconcile-stats.json"), "w"), indent=1)


# ---------------------------------------------------------------- world
def build_world():
    india = load_outline()
    gj = json.load(open(P_NE))
    rows = []
    ne_india = None
    for f in gj["features"]:
        p = f["properties"]
        g = valid(shape(f["geometry"]))
        if p["ADM0_A3"] == "IND":
            ne_india = g
            continue

        def iso(k):
            v = p.get(k)
            return None if v in (None, "-99", -99) else v
        props = {"name": p["NAME"], "name_long": p.get("NAME_LONG"), "adm0_a3": p["ADM0_A3"],
                 "iso_a3": iso("ISO_A3") or iso("ISO_A3_EH"), "iso_a2": iso("ISO_A2") or iso("ISO_A2_EH")}
        rows.append([props, g])
    # neighbours lose any overlap with the official outline
    near = india.envelope.buffer(2)
    overlaps = {}
    for r in rows:
        if r[1].intersects(near) and r[1].intersects(india):
            a = km2(r[1].intersection(india))
            r[1] = valid(r[1].difference(india))
            overlaps[r[0]["name"]] = round(a, 1)
    # land that NE's India polygon covers but the official outline does not: give to a neighbour it touches,
    # otherwise (coastal generalisation) drop it
    leftover = explode(ne_india.difference(india))
    cand = [i for i, r in enumerate(rows) if r[1].intersects(near)]
    gained, dropped = {}, 0.0
    for p in leftover:
        pb = p.buffer(1e-5)
        best, bestv = None, 0.0
        for i in cand:
            if rows[i][1].intersects(pb):
                v = rows[i][1].intersection(pb).area
                if v > bestv:
                    best, bestv = i, v
        if best is None:
            dropped += km2(p)
            continue
        rows[best][1] = valid(rows[best][1].union(p))
        gained[rows[best][0]["name"]] = round(gained.get(rows[best][0]["name"], 0) + km2(p), 1)
    feats = [feat({"name": "India", "name_long": "India", "adm0_a3": "IND", "iso_a3": "IND", "iso_a2": "IN",
                   "note": "official outline (DataMeet composite) substituted for Natural Earth geometry"},
                  polys(shapely.set_precision(india, 1e-5)), nd=5)]
    for props, g in rows:
        feats.append(feat(props, polys(shapely.set_precision(g, 1e-5)), nd=5))
    write_fc(os.path.join(OUT, "world-ind-pov.geojson"), feats, note="NE 10m IND POV v5.1.1, India replaced")
    stats = {"overlap_removed_from_neighbours_km2": overlaps, "ne_india_leftover_given_to_neighbours_km2": gained,
             "ne_india_leftover_dropped_coastal_km2": round(dropped, 1)}
    print(json.dumps(stats, indent=1))
    json.dump(stats, open(os.path.join(RAW, "world-reconcile-stats.json"), "w"), indent=1)


# ---------------------------------------------------------------- eez
def build_eez():
    feats = []
    for path in (P_EEZ, P_EEZ_IW):
        for f in json.load(open(path))["features"]:
            p = f["properties"]
            g = valid(shape(f["geometry"]))
            feats.append(feat({"name": p["geoname"], "pol_type": p["pol_type"], "mrgid": p["mrgid"],
                               "territory": p["territory1"], "sovereign": p["sovereign1"],
                               "area_km2_source": p.get("area_km2"),
                               "source": "Marine Regions Maritime Boundaries v12 (2023), layer "
                                         + ("eez" if path == P_EEZ else "eez_internal_waters"),
                               "use": "geocheck of offshore points only; not a display layer"},
                              polys(shapely.set_precision(g, 1e-6))))
    write_fc(os.path.join(OUT, "eez-india.geojson"), feats, note="India EEZ (mainland, A&N) + internal waters")


# ---------------------------------------------------------------- web
def mapshaper(args):
    env = dict(os.environ, PATH=os.path.expanduser("~/.local/node/bin") + ":" + os.environ.get("PATH", ""))
    cmd = ["npx", "--yes", "mapshaper", *args]
    r = subprocess.run(cmd, env=env, capture_output=True, text=True, cwd=ROOT)
    if r.returncode:
        print(r.stdout, r.stderr)
        raise SystemExit("mapshaper failed")
    return r.stderr + r.stdout


def build_web(dist_pct=None, world_pct=None):
    """Districts are simplified once; states and the India outline are dissolved from the simplified districts,
    so the three web layers share identical linework (no gaps between adjacent states, exact nesting)."""
    os.makedirs(WEB, exist_ok=True)
    budgets = {"districts.geojson": 2.5e6, "states.geojson": 0.8e6, "india-boundary.geojson": 0.3e6}
    for pct in ([dist_pct] if dist_pct else ["6%", "5%", "4%", "3%", "2.5%", "2%", "1.5%", "1%"]):
        log = mapshaper([
            "-i", "data/reference/districts.geojson", "snap", "name=districts",
            "-simplify", f"percentage={pct}", "weighted", "keep-shapes", "planar",
            "-clean",
            "-filter-fields", "district,state,st,dt_code,source_year",
            "-dissolve", "state", "copy-fields=st", "+", "name=states",
            "-dissolve", "+", "name=india", "target=states",
            "-each", "name='India', iso_a3='IND', depiction='Official boundary of India (DataMeet composite), simplified'", "target=india",
            "-o", "target=districts", "data/reference/web/districts.geojson", "precision=0.00001", "format=geojson",
            "-o", "target=states", "data/reference/web/states.geojson", "precision=0.00001", "format=geojson",
            "-o", "target=india", "data/reference/web/india-boundary.geojson", "precision=0.00001", "format=geojson",
        ])
        sizes = {k: os.path.getsize(os.path.join(WEB, k)) for k in budgets}
        print(f"[web] admin layers at {pct}: " + ", ".join(f"{k} {v/1e3:.0f} KB" for k, v in sizes.items()))
        if all(sizes[k] < budgets[k] for k in budgets):
            break
    for pct in ([world_pct] if world_pct else ["10%", "8%", "6%", "5%", "4%", "3%", "2%"]):
        mapshaper([
            "-i", "data/reference/world-ind-pov.geojson", "snap",
            "-simplify", f"percentage={pct}", "weighted", "keep-shapes", "planar",
            "-clean",
            "-o", "data/reference/web/world-ind-pov.geojson", "precision=0.00001", "format=geojson",
        ])
        s = os.path.getsize(os.path.join(WEB, "world-ind-pov.geojson"))
        print(f"[web] world at {pct}: {s/1e3:.0f} KB")
        if s < 0.9e6:
            break


STEPS = {"boundary": build_boundary, "states": build_states, "districts": build_districts,
         "world": build_world, "eez": build_eez, "web": build_web}

if __name__ == "__main__":
    args = sys.argv[1:] or ["all"]
    for a in (list(STEPS) if args == ["all"] else args):
        print(f"== {a}")
        STEPS[a]()
