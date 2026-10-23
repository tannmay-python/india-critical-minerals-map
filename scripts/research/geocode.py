#!/usr/bin/env python3
"""Geocode a place in India with OpenStreetMap Nominatim, constrained to the expected state.

Follows the coordinate protocol (RESEARCH_PROTOCOL.md §6): at most 1 request per second
across ALL agents (global file lock + timestamp), descriptive User-Agent, shared cache,
and any result whose state does not match is rejected.

Usage:
  .venv/bin/python -I scripts/research/geocode.py "Chavara" --state Kerala [--district Kollam] [--country India]
  .venv/bin/python -I scripts/research/geocode.py --district-centroid Kollam --state Kerala
  .venv/bin/python -I scripts/research/geocode.py --state-centroid --state Odisha

Output: one JSON line {query, lat, lon, display_name, osm_type, class, type, state, district, ok, reason}
For the district-centroid mode the centroid is computed from data/reference/districts.geojson
(precision: district). Never eyeball coordinates; never type them from memory.
"""
import argparse
import fcntl
import json
import os
import subprocess
import sys
import time
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CACHE = os.path.join(ROOT, "research", "geocode-cache.jsonl")
LOCK = os.path.join(ROOT, ".cache", "nominatim.lock")
UA = "TakshashilaICMMap/0.1 (research; India critical minerals project map; contact via github.com/tannmay-python)"


def norm(s):
    return (s or "").strip().lower().replace("&", "and")


def load_cache():
    out = {}
    if os.path.exists(CACHE):
        for line in open(CACHE, encoding="utf-8"):
            try:
                r = json.loads(line)
                out[r["_key"]] = r
            except Exception:  # noqa: BLE001
                pass
    return out


def nominatim(params):
    os.makedirs(os.path.dirname(LOCK), exist_ok=True)
    with open(LOCK, "a+") as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        lk.seek(0)
        last = float(lk.read().strip() or 0)
        wait = 1.1 - (time.time() - last)
        if wait > 0:
            time.sleep(wait)
        url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
        r = subprocess.run(["curl", "-s", "-m", "30", "-A", UA, url], capture_output=True, text=True)
        lk.seek(0)
        lk.truncate()
        lk.write(str(time.time()))
        fcntl.flock(lk, fcntl.LOCK_UN)
    try:
        return json.loads(r.stdout)
    except Exception:  # noqa: BLE001
        return []


STATE_ALIASES = {
    "odisha": ["odisha", "orissa"], "puducherry": ["puducherry", "pondicherry"],
    "jammu and kashmir": ["jammu and kashmir"], "delhi": ["delhi", "national capital territory of delhi"],
    "andaman and nicobar islands": ["andaman and nicobar islands"],
    "dadra and nagar haveli and daman and diu": ["dadra and nagar haveli and daman and diu"],
}


def state_ok(found, expected):
    f, e = norm(found), norm(expected)
    return any(x in f for x in STATE_ALIASES.get(e, [e]))


def district_centroid(district, state):
    from shapely.geometry import shape
    gj = json.load(open(os.path.join(ROOT, "data", "reference", "districts.geojson")))
    hits = []
    for ft in gj["features"]:
        p = ft["properties"]
        dn = norm(p.get("district") or p.get("DISTRICT") or p.get("dtname") or "")
        sn = norm(p.get("state") or p.get("ST_NM") or p.get("stname") or "")
        if dn == norm(district) and state_ok(sn, state):
            hits.append(ft)
    if len(hits) != 1:
        return {"ok": False, "reason": f"{len(hits)} district matches for {district}, {state}"}
    poly = shape(hits[0]["geometry"])
    c = poly.centroid
    if not poly.contains(c):  # concave district: fall back to a guaranteed-interior point
        c = poly.representative_point()
    return {"ok": True, "lat": round(c.y, 5), "lon": round(c.x, 5), "precision": "district",
            "method": "centroid of districts.geojson polygon"}


def state_centroid(state):
    """Interior point of the state polygon, for records whose sources name only the state."""
    from shapely.geometry import shape
    gj = json.load(open(os.path.join(ROOT, "data", "reference", "states.geojson")))
    hits = [ft for ft in gj["features"] if state_ok(ft["properties"].get("state") or "", state)
            and norm(ft["properties"].get("state")) == norm(state)]
    if len(hits) != 1:
        return {"ok": False, "reason": f"{len(hits)} state matches for {state}"}
    poly = shape(hits[0]["geometry"])
    c = poly.centroid
    if not poly.contains(c):
        c = poly.representative_point()
    return {"ok": True, "lat": round(c.y, 5), "lon": round(c.x, 5), "precision": "state",
            "method": "centroid of states.geojson polygon"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("place", nargs="?")
    ap.add_argument("--state")
    ap.add_argument("--district")
    ap.add_argument("--country", default="India")
    ap.add_argument("--district-centroid", dest="dc")
    ap.add_argument("--state-centroid", dest="sc", action="store_true")
    a = ap.parse_args()

    if a.sc:
        print(json.dumps({"query": a.state, **state_centroid(a.state)}))
        return

    if a.dc:
        print(json.dumps({"query": f"{a.dc}, {a.state}", **district_centroid(a.dc, a.state)}))
        return

    q = ", ".join(x for x in [a.place, a.district, a.state, a.country] if x)
    key = norm(q)
    cache = load_cache()
    if key in cache and cache[key].get("ok"):  # failures are retried, not trusted
        print(json.dumps({k: v for k, v in cache[key].items() if k != "_key"}))
        return
    params = {"q": q, "format": "jsonv2", "addressdetails": 1, "limit": 5, "accept-language": "en"}
    if a.country.lower() == "india":
        params["countrycodes"] = "in"
    res = nominatim(params)
    best = None
    for r in res:
        ad = r.get("address", {})
        st = ad.get("state") or ad.get("region") or ""
        if a.state and a.country.lower() == "india" and not state_ok(st, a.state):
            continue
        if a.country.lower() != "india" and norm(ad.get("country")) and norm(a.country) not in norm(ad.get("country")) and norm(ad.get("country_code")) != norm(a.country):
            continue
        best = r
        break
    if best:
        ad = best.get("address", {})
        out = {"query": q, "ok": True, "lat": round(float(best["lat"]), 6), "lon": round(float(best["lon"]), 6),
               "display_name": best.get("display_name"), "osm_type": best.get("osm_type"),
               "class": best.get("category") or best.get("class"), "type": best.get("type"),
               "state": ad.get("state"), "district": ad.get("state_district") or ad.get("county"),
               "reason": None}
    else:
        out = {"query": q, "ok": False, "reason": f"no result matching state={a.state} ({len(res)} raw results)"}
    with open(CACHE, "a", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps({"_key": key, **out}, ensure_ascii=False) + "\n")
        fcntl.flock(f, fcntl.LOCK_UN)
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
