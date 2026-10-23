#!/usr/bin/env python3
"""Extract key fields from MSTC Mine Block Summary (MBS) raw texts.

Usage: parse_mbs.py LISTING.tsv [CONTAINER_REGEX] > research/drafts/l1-mbs-extract.jsonl
LISTING.tsv is research/raw/mstcecommerce.com/mstc-mlcl-listing-*.tsv (from mstc_listing.py).
For each 'Mine Block Summary' row (container 429) it opens research/raw/mstcecommerce.com/mstc-<FILE_ID>-*.txt
and extracts, by regex over the RAW text:
  area (value, unit, basis line), exploration stage (G1-G4), villages, tehsil, district,
  corner points (DMS pairs or decimal pairs) -> polygon + centroid, resources line(s) snippet.
Every extracted value carries the raw line it came from so it can be checked by eye.
"""
import glob
import json
import math
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAWD = os.path.join(ROOT, "research", "raw", "mstcecommerce.com")
def dms(d, m, s):
    return float(d) + float(m) / 60 + float(s) / 3600


# Coordinate tokens in the formats seen in MBS documents:
#   20° 47' 54.2279"  |  E72°25'35.74441"  |  84°14' 28.87948" E  |  23059’37.20632” (degree sign lost as '0')
#   decimal 77.98555 15.50775 (either order)
MIN = r"""['’′ˈ]"""
SEC = r"""(?:["”″]|''|ˈˈ|’’)"""
TOKEN = re.compile(
    rf"""(?P<dms>(?<!\d)(?P<d>\d{{1,3}})\s*[°º˚]\s*(?P<m>\d{{1,2}})\s*{MIN}\s*(?P<s>\d{{1,2}}(?:\.\d+)?)\s*{SEC}?)"""
    rf"""|(?P<dms0>(?<!\d)(?P<d0>\d{{2}})0\s?(?P<m0>[0-5]?\d)\s*{MIN}\s*(?P<s0>\d{{1,2}}(?:\.\d+)?)\s*{SEC})"""
    r"""|(?P<decs>(?<![\d.])\d{1,2}\.\d{2,}(?=\s*[NE]\b))"""
    r"""|(?P<dec>(?<![\d.])\d{1,2}\.\d{2,}(?![\d.]))""")
HEAD = re.compile(r"(?i)co-?\s*ordinates?\s+of|corner\s+points?|boundary\s+(?:corner|points)|pillar|block\s+corner")
UTM_ZONE = re.compile(r"(?i)UTM\s*Zone\s*[-:]?\s*(\d{2})")
UTM_ROW = re.compile(r"(?m)^\s*[A-Z0-9]{1,3}\s+(\d{6}(?:\.\d+)?)\s+(\d{7}(?:\.\d+)?)\b")


def tokens(text, loose):
    for m in TOKEN.finditer(text):
        if m.group("dms"):
            v = dms(m.group("d"), m.group("m"), m.group("s"))
        elif m.group("dms0"):
            v = dms(m.group("d0"), m.group("m0"), m.group("s0"))
        elif m.group("decs"):
            v = float(m.group("decs"))
        else:
            raw = m.group("dec")
            if not loose and len(raw.split(".")[1]) < 4:
                continue  # short decimals only count inside a coordinate table
            v = float(raw)
        if 6 <= v <= 37.5:
            yield "lat", v, bool(m.group("dms") or m.group("dms0"))
        elif 68 <= v <= 97.5:
            yield "lon", v, bool(m.group("dms") or m.group("dms0"))


def pair(text, loose=False):
    pts, pend = [], None
    for kind, v, is_dms in tokens(text, loose):
        if pend and pend[0] != kind:
            la, lo = (pend[1], v) if pend[0] == "lat" else (v, pend[1])
            pts.append((round(la, 7), round(lo, 7), is_dms))
            pend = None
        else:
            pend = (kind, v)
    return pts


def utm_points(text):
    z = UTM_ZONE.search(text)
    if not z:
        return []
    from pyproj import Transformer
    tr = Transformer.from_crs(f"EPSG:326{z.group(1)}", "EPSG:4326", always_xy=True)
    out = []
    for e, n in UTM_ROW.findall(text[z.start():]):
        lon, lat = tr.transform(float(e), float(n))
        if 6 <= lat <= 37.5 and 68 <= lon <= 97.5:
            out.append((round(lat, 7), round(lon, 7), False))
    return out


def dedupe(pts):
    out, seen = [], set()
    for la, lo, _ in pts:
        if (la, lo) not in seen:
            seen.add((la, lo))
            out.append((la, lo))
    return out


def candidates(text):
    """Candidate corner sets: each coordinate-table region (loose), the whole text (strict), UTM."""
    seen = set()
    for h in reversed(list(HEAD.finditer(text))):
        pts = pair(text[h.start():h.start() + 4000], loose=True)
        if len(pts) >= 3:
            kind = "dms" if all(p[2] for p in pts) else "decimal"
            key = tuple(dedupe(pts))
            if key not in seen:
                seen.add(key)
                yield list(key), kind
    pts = pair(text)
    if len(pts) >= 3:
        yield dedupe(pts), ("dms" if all(p[2] for p in pts) else "decimal")
    pts = utm_points(text)
    if len(pts) >= 3:
        yield dedupe(pts), "utm"


def polygon_of(pts):
    import math
    from shapely.geometry import Polygon
    ring = [(lo, la) for la, lo in pts]
    poly, reordered = Polygon(ring), False
    if not poly.is_valid:
        cx = sum(x for x, _ in ring) / len(ring)
        cy = sum(y for _, y in ring) / len(ring)
        ring = sorted(ring, key=lambda q: math.atan2(q[1] - cy, q[0] - cx))
        poly, reordered = Polygon(ring), True
        if not poly.is_valid:
            poly = poly.buffer(0)
    km2 = poly.area * (111.32 ** 2) * math.cos(math.radians(poly.centroid.y)) if not poly.is_empty else 0
    return ring, poly, km2, reordered


def first(rx, text, flags=re.I):
    m = re.search(rx, text, flags)
    return m


def extract(path):
    t = open(path, encoding="utf-8", errors="ignore").read()
    one = re.sub(r"[ \t]+", " ", t)
    rec = {"raw_path": os.path.relpath(path, ROOT), "chars": len(t)}
    m = first(r"Total\s+(?:Concession\s+)?Area[\s\S]{0,90}?([\d,]+\.\d+|\d+)\s*(Ha\b|hectares?|sq\.?\s*km|km2|Sq\.\s*Km)", one)
    if not m:
        m = first(r"Area[^\n]{0,80}?([\d,]+\.\d+|\d+)\s*(Ha\b|hectares?|sq\.?\s*km|km2)", one)
    if m:
        rec["area_value"] = float(m.group(1).replace(",", ""))
        u = m.group(2).lower()
        rec["area_unit"] = "ha" if u.startswith("h") else "sq km"
        rec["area_line"] = one[max(0, m.start() - 10): m.end() + 40].strip().replace("\n", " ")[:160]
        rec["area_sq_km"] = round(rec["area_value"] / 100, 4) if rec["area_unit"] == "ha" else rec["area_value"]
    m = first(r"\(\s*G\s*-?\s*[1-4]\s*/[^\n]{0,40}?\)?[^\n]{0,30}?\bG\s*-?\s*([1-4])\b", one) or \
        first(r"\bG\s*-?\s*([1-4])\s*(?:\(|level|stage|-\s*\w)", one)
    if m:
        rec["exploration_stage"] = f"G{m.group(1)}"
        rec["stage_line"] = one[max(0, m.start() - 20): m.end() + 30].replace("\n", " ")[:120]
    for key, rx in (("villages", r"Villages?\s*[:\-]?\s*([^\n]{3,120})"), ("tehsil", r"Tehsil\s*/?\s*(?:Taluka|Taluk)?\s*[:\-]?\s*([^\n]{2,60})"),
                    ("district", r"District\s*[:\-]?\s*([A-Z][^\n]{2,60})")):
        m = first(rx, one)
        if m:
            rec[key] = re.sub(r"\s{2,}.*$", "", m.group(1).strip())[:100]
    best = None
    for pts, kind in candidates(t):
        ring, poly, km2, reordered = polygon_of(pts)
        ratio = km2 / rec["area_sq_km"] if rec.get("area_sq_km") else None
        score = abs(math.log(ratio)) if ratio and ratio > 0 else 9
        if best is None or score < best[0]:
            best = (score, pts, kind, ring, poly, km2, reordered, ratio)
    rec["n_corners"] = len(best[1]) if best else 0
    if best:
        score, pts, kind, ring, poly, km2, reordered, ratio = best
        rec["corner_kind"] = kind
        rec["polygon"] = [[round(x, 7), round(y, 7)] for x, y in ring] + [[round(ring[0][0], 7), round(ring[0][1], 7)]]
        c = poly.centroid if poly.contains(poly.centroid) else poly.representative_point()
        rec["centroid"] = [round(c.y, 6), round(c.x, 6)]
        rec["polygon_area_sq_km_approx"] = round(km2, 3)
        rec["ring_reordered"] = reordered
        # plausibility: polygon area within 25% of the stated area
        rec["geometry_check"] = "ok" if ratio and 0.8 <= ratio <= 1.25 else "area-mismatch" if ratio else "no-stated-area"
    m = first(r"(Net\s+geological\s+resource|Geological\s+Resources?|Resources?\s*\(UNFC)[^\n]*\n?([^\n]{0,220})", t)
    if m:
        rec["resources_snippet"] = re.sub(r"\s+", " ", (m.group(0)))[:260]
    return rec


def main():
    rows = [l.rstrip("\n").split("\t") for l in open(sys.argv[1], encoding="utf-8")]
    container = re.compile(sys.argv[2] if len(sys.argv) > 2 else r"429\.html$")
    for r in rows:
        if len(r) < 5 or not container.search(r[0]):
            continue
        sec, fid, title = r[1], r[2], r[3]
        hits = glob.glob(os.path.join(RAWD, f"mstc-{fid}-*.txt")) + glob.glob(os.path.join(RAWD, f"mstc-{fid}.txt"))
        out = {"listing_section": sec, "file_id": fid, "title": title, "url": r[4]}
        if not hits:
            out["error"] = "not fetched"
        else:
            out.update(extract(hits[0]))
        print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
