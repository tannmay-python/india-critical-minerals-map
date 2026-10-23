#!/usr/bin/env python3
"""Assemble L1 block records for the CENTRAL Government critical-mineral tranches.

Inputs (all in research/drafts/ unless noted):
  l1-centre-registry.csv     Tranches 1-5, one row per block per offering (researcher draft, T1 sources)
  l1-centre-t6-t8.csv        Tranches 6-8, transcribed from the NITs and notices
  l1-centre-sources.yml      source catalogue for the T1-T5 rows
  l1-mstc-results.csv        parsed MSTC 'Critical Mineral Block Auction Results' pages
  l1-mbs-extract.jsonl       fields + polygons parsed from every Mine Block Summary
  l1-geometry-overrides.json polygons recovered by OCR for image-only tables
  research/raw/mstcecommerce.com/mstc-mlcl-listing-*.tsv   MSTC document listing (URLs)
Output: research/drafts/l1-centre-blocks.yml and l1-centre-blocks.evidence.jsonl
"""
import csv
import glob
import json
import os
import re
from collections import defaultdict

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
D = os.path.join(ROOT, "research", "drafts")
RAW = os.path.join(ROOT, "research", "raw", "mstcecommerce.com")
TODAY = "2026-10-23"
ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII"}
ST = {"Andhra Pradesh": "ap", "Arunachal Pradesh": "ar", "Assam": "as", "Bihar": "br", "Chhattisgarh": "cg",
      "Goa": "ga", "Gujarat": "gj", "Haryana": "hr", "Himachal Pradesh": "hp", "Jharkhand": "jh", "Karnataka": "ka",
      "Kerala": "kl", "Madhya Pradesh": "mp", "Maharashtra": "mh", "Manipur": "mn", "Meghalaya": "ml",
      "Mizoram": "mz", "Nagaland": "nl", "Odisha": "od", "Punjab": "pb", "Rajasthan": "rj", "Sikkim": "sk",
      "Tamil Nadu": "tn", "Telangana": "tg", "Tripura": "tr", "Uttar Pradesh": "up", "Uttarakhand": "uk",
      "West Bengal": "wb", "Jammu and Kashmir": "jk", "Ladakh": "la"}
MONTHS = "January February March April May June July August September October November December".split()

# Commodity words -> canonical dashboard names (owner decisions D-000, D-001).
MINERAL_RULES = [
    (r"graphite", "Graphite"), (r"vanadi", "Vanadium"), (r"glauconit", "Potash"), (r"potash", "Potash"),
    (r"phosph", "Phosphorus"), (r"tungsten|wolfram|scheelite", "Tungsten"), (r"lithium|\bli\b", "Lithium"),
    (r"titanium|ilmenite", "Titanium"), (r"nickel|\bni\b", "Nickel"), (r"cobalt|\bco\b", "Cobalt"),
    (r"copper", "Copper"), (r"molybden", "Molybdenum"), (r"\btin\b|cassiterite", "Tin"), (r"tantal", "Tantalum"),
    (r"niobium|\bnb\b", "Niobium"), (r"zircon", "Zirconium"), (r"gallium", "Gallium"), (r"yttrium", "Yttrium"),
    (r"\bpge\b|platinum", "PGEs (unspecified)"), (r"\bree\b|rare earth", "Rare earths (unspecified)"),
]
STOP = (r"\b(block|blocks|mine|mineral|minerals|associated|and|the|cluster|amalgamated|graphite|vanadium|glauconite|"
        r"glauconitic|ree|rm|rare|earth|element|elements|metal|metals|phosphorite|phosphate|rock|limestone|potash|halite|"
        r"tungsten|lithium|titanium|bauxite|aluminous|laterite|nickel|chromium|pge|cobalt|manganese|copper|molybdenum|"
        r"tin|ore|iron|magnetite|ilmenite|bearing|gallium|niobium|nb|zirconium|yttrium|basemetal|cr|ni|co|final|cl|ml|"
        r"with|south|north|east|west|of|se|southeast|mbs|summary|revised|corrected|on|mineralization|mineralisation|gold|lead|zinc|pb|zn)\b")
ID_STOP = STOP.replace("|south|north|east|west|of|se|southeast", "|of") .replace(")\\b", "|silver)\\b")


STATE_WORDS = r"\b(andhra pradesh|arunachal pradesh|madhya pradesh|uttar pradesh|tamil nadu|west bengal|jammu and kashmir|" \
    r"karnataka|kerala|rajasthan|gujarat|gujrat|odisha|orissa|bihar|jharkhand|chhattisgarh|chattishgarh|maharashtra|maharastra|" \
    r"telangana|punjab|uttarakhand|goa|assam|exploration|el|licence|license)\b"


def key(name):
    s = name.lower().replace("&", " ").replace("_", " ").replace("(", " ").replace(")", " ")
    s = re.sub(STATE_WORDS, " ", s)
    s = re.sub(r"^\s*\d+\s*[.)]?\s*", "", s)
    s = re.sub(STOP, " ", s)
    return re.sub(r"[^a-z]+", "", s)


def slug(name):
    s = name.lower().replace("&", " ").replace("_", " ").replace("(", " ").replace(")", " ")
    s = re.sub(r"^\s*\d+\s*[.)]?\s*", "", s)
    s = re.sub(ID_STOP, " ", s)
    s = re.sub(STATE_WORDS, " ", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-{2,}", "-", s)


def canon(commodity):
    c = commodity.lower()
    out = []
    for rx, name in MINERAL_RULES:
        if re.search(rx, c) and name not in out:
            out.append(name)
    if "Yttrium" in out and "Rare earths (unspecified)" in out:
        pass  # REE named generically plus yttrium named specifically: keep both
    if re.search(r"rare metal", c) and not out:
        out.append("Lithium") if re.search(r"\bli\b", c) else None
    return out


ACR = {"LLP", "NLC", "VNR", "SKN", "AMPL", "FGM", "GD", "RK", "SCCL", "CMPDI", "PSU"}


def smart_title(s):
    s = re.sub(r"^M/S\.?\s*", "", s.strip(), flags=re.I)
    if s != s.upper():
        return s
    words = []
    for w in s.split():
        bare = re.sub(r"[^A-Z]", "", w)
        if bare in ACR or (len(bare) <= 2 and bare not in {"OF", "AND"}):
            words.append(w)
        else:
            words.append(w.capitalize() if w.lower() not in {"of", "and"} else w.lower())
    return " ".join(words)


def human_date(d):
    y, m = d[:4], int(d[5:7])
    return f"{MONTHS[m - 1]} {y}"


def is_centre(t):
    return t.startswith("Centre-")


def tranche_no(t):
    """Centre-T5 -> 5; Centre-EL2 -> 102. State rounds have no number (0)."""
    m = re.search(r"^Centre-(EL)?T?(\d+)$", t)
    if not m:
        return 0
    return (100 if m.group(1) else 0) + int(m.group(2))


STATE_PREFIX = {"MP": "Madhya Pradesh", "CG": "Chhattisgarh", "UP": "Uttar Pradesh", "JH": "Jharkhand", "OD": "Odisha",
                "MH": "Maharashtra", "RJ": "Rajasthan", "KA": "Karnataka", "AP": "Andhra Pradesh"}


def tranche_label(t):
    mo = re.match(r"Offshore-T(\d+)$", t)
    if mo:
        return f"Offshore Tranche {ROMAN[int(mo.group(1))]}"
    n = tranche_no(t)
    if n > 100:
        return f"EL Tranche {ROMAN[n - 100]}"
    if n:
        return f"Tranche {ROMAN[n]}"
    pre, _, rest = t.partition("-")
    rest = rest.replace("Phase-", "Phase ").replace("-2nd", " (second attempt)")
    if re.fullmatch(r"\d{4}(-\d{2})?", rest):
        return f"a {rest[:4]} state auction"
    return f"{STATE_PREFIX.get(pre, pre)} {rest}"


def excerpt(text, needle, before=6, after=24):
    i = text.lower().find(needle.lower())
    if i < 0:
        return None
    words_b = text[:i].split()[-before:]
    words_a = text[i:].split()[:after]
    return " ".join(words_b + words_a)[:400]


_DIST = None


def village_geocode(village, state, district):
    """Nominatim via scripts/research/geocode.py (state/district constrained, cached). Returns (lat, lon) or None."""
    import subprocess
    args = [os.path.join(ROOT, ".venv", "bin", "python"), "-I", os.path.join(ROOT, "scripts", "research", "geocode.py"),
            village, "--state", state]
    if district:
        args += ["--district", re.split(r",| and |&|\(", district)[0].strip()]
    out = subprocess.run(args, capture_output=True, text=True).stdout
    try:
        r = json.loads(out)
    except json.JSONDecodeError:
        return None
    return (r["lat"], r["lon"]) if r.get("ok") else None


def district_centroid(district, state):
    """Centroid of the first named district (data/reference/districts.geojson), or None."""
    global _DIST
    from shapely.geometry import shape
    if _DIST is None:
        _DIST = json.load(open(os.path.join(ROOT, "data", "reference", "districts.geojson")))["features"]
    first_d = re.split(r",| and |&", district)[0].strip().lower()
    alias = {"balrampur": "balrampur", "baloda bazar": "baloda bazar", "chamrajnagar": "chamarajanagar", "shimoga": "shivamogga",
             "angul": "anugul", "jaspur": "jashpur", "papumpare": "papum pare", "singhrauli": "singrauli", "kachchh": "kachchh", "yadgiri": "yadgir", "chittorgarh": "chittaurgarh"}
    first_d = alias.get(first_d, first_d)
    for ft in _DIST:
        pr = ft["properties"]
        if pr.get("state", "").lower() == state.lower() and pr.get("district", "").lower() == first_d:
            g = shape(ft["geometry"])
            c = g.centroid if g.contains(g.centroid) else g.representative_point()
            return round(c.y, 5), round(c.x, 5)
    return None


def main():
    sources = {s["id"]: s for s in yaml.safe_load(open(os.path.join(D, "l1-centre-sources.yml")))}
    listing = {}
    for lst in (sorted(glob.glob(os.path.join(RAW, "mstc-all-sections-*.tsv")))[-1:] +
                sorted(glob.glob(os.path.join(RAW, "mstc-mlcl-listing-*.tsv")))[-1:]):
        for line in open(lst, encoding="utf-8"):
            f = line.rstrip("\n").split("\t")
            if len(f) >= 5 and f[2] != "?":
                listing[f[2]] = {"section": f[1], "title": f[3], "url": f[4], "container": f[0]}

    def raw_path(fid):
        hits = glob.glob(os.path.join(RAW, f"mstc-{fid}-*.txt"))
        return os.path.relpath(hits[0], ROOT) if hits else None

    # Sources for T6-T8 (container listing gives the URLs)
    def mk(sid, fid, title, date):
        sources[sid] = {"id": sid, "url": listing[fid]["url"], "title": title, "publisher": "Ministry of Mines (via MSTC e-auction portal)",
                        "tier": "T1", "date": date, "retrieved": TODAY, "raw_path": raw_path(fid)}
    mk("mstc-t6-nit", "22681", "GoI MoM - Tranche VI - Notice Inviting Tender", "2025-09-16")
    mk("mstc-t6-annulment", "25112", "GoI MoM - Tranche VI - Auction Annulment Notice", "2026-02-06")
    mk("mstc-t7-nit", "25649", "GoI MoM - Tranche VII - Notice Inviting Tender", "2026-03-23")
    mk("mstc-t7-annulment", "26944", "GoI MoM - Tranche VII - Auction Annulment Notice", "2026-06-19")
    mk("mstc-t7-conclusion", "27225", "GoI MoM - Tranche VII - Auction Conclusion Notice", "2026-07-08")
    mk("mstc-t8-nit", "27316", "GoI MoM - Tranche VIII - Notice Inviting Tender", "2026-07-15")
    mk("mstc-t8-notice-2026-10-13", "28594", "Tranche VIII - Notice: intimation to TQBs, opening of IPO, annulment and second round of e-auction", "2026-10-13")
    mk("mstc-t8-betjharan-revised", "28621", "Revised notice: second round of e-auction of Betjharan Titanium, Vanadium and Iron Ore Block", "2026-10-16")
    mk("mstc-el1-nit", "19563", "GoI MoM - EL - Tranche I - Notice Inviting Tender", "2025-03-13")
    mk("mstc-el1-blocks", "20090", "Details of 13 Blocks of EL in Tranche I (GSI presentation)", "2025-03-13")
    mk("mstc-el1-tqb", "22108", "EL Tranche I - Notice regarding intimation to TQBs, opening of IPO and second round of e-auction", "2025-08-12")
    mk("mstc-el1-pb", "22686", "Notice for Preferred Bidder Declaration of 07 Exploration Blocks under Tranche I", "2025-09-16")
    mk("mstc-el2-nit", "25192", "GoI MoM - EL - Tranche II - Notice Inviting Tender", "2026-02-12")
    mk("mstc-el2-annulment", "26954", "GoI MoM - EL - Tranche II - Auction Annulment Notice", "2026-06-19")
    for fy, slugpart in (("2025-26", "2025-2026"), ("2026-27", "2026-2027")):
        url = f"https://www.mstcecommerce.com/auctionhome/mlcln/mineral_auction_result.jsp?typerep=f&finYr={slugpart}&sellerRefId=41731"
        sources[f"mstc-results-el-fy{fy}"] = {"id": f"mstc-results-el-fy{fy}", "url": url,
            "title": f"MSTC - Exploration Licence Block Auction Results, FY {fy} (Ministry of Mines)", "publisher": "MSTC Ltd",
            "tier": "T1", "date": TODAY, "retrieved": TODAY,
            "raw_path": f"research/raw/mstcecommerce.com/mstc-el-results-fy{slugpart}-r2026-10-23b.txt"}
    for fy, slugpart in (("2025-26", "2025-2026"), ("2026-27", "2026-2027")):
        url = f"https://www.mstcecommerce.com/auctionhome/mlcln/mineral_auction_result.jsp?typerep=f&finYr={slugpart}&sellerRefId=31608"
        sources[f"mstc-results-cm-fy{fy}"] = {"id": f"mstc-results-cm-fy{fy}", "url": url,
            "title": f"MSTC - Critical Mineral Block Auction Results, FY {fy} (Ministry of Mines)", "publisher": "MSTC Ltd",
            "tier": "T1", "date": TODAY, "retrieved": TODAY,
            "raw_path": f"research/raw/mstcecommerce.com/mstc-cm-results-fy{slugpart}-r2026-10-23b.txt"}

    # Results page rows (preferred bidder, final offer, auction close)
    results = [r for r in csv.DictReader(open(os.path.join(D, "l1-mstc-results.csv")))
               if "mock" not in r["block"].lower()]
    res_by_key = defaultdict(list)
    for r in results:
        res_by_key[(key(r["block"]), r["state"].lower())].append(r)

    def dmy(s):
        m = re.match(r"(\d{2})-(\d{2})-(\d{4})", s or "")
        return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else None

    # Registry rows
    rows = []
    for r in csv.DictReader(open(os.path.join(D, "l1-centre-registry.csv"))):
        rows.append(dict(r, attempt=None))
    extra = list(csv.DictReader(open(os.path.join(D, "l1-centre-t6-t8.csv")))) + \
        list(csv.DictReader(open(os.path.join(D, "l1-centre-el.csv")))) + \
        list(csv.DictReader(open(os.path.join(D, "l1-offshore.csv"))))
    for r in extra:
        r = dict(r)
        hits = res_by_key.get((key(r["block_name_as_printed"]), r["state"].lower()), [])
        is_el = r["concession_type"] == "EL"
        hits = [h for h in hits if (("el-results" in h["file"]) == is_el) and (dmy(h["nit_date"]) in (r["nit_date"], None))]
        if len(hits) > 1:
            hits = [h for h in hits if dmy(h["nit_date"]) == r["nit_date"]] or hits
        if r["outcome"] == "Preferred bidder":
            assert len(hits) == 1, (r["block_name_as_printed"], hits)
            h = hits[0]
            r["preferred_bidder"] = smart_title(h["preferred_bidder"])
            r["final_offer_pct"] = h["final_offer"]
            r["outcome_date"] = dmy(h["auction_close"])
        rows.append(r)

    # MBS extracts, latest document per block key
    mbs = {}
    mbs_lines = list(open(os.path.join(D, "l1-mbs-extract.jsonl")))
    for extra_mbs in ("l1-state-mbs-extract.jsonl", "l1-arch-mbs-extract.jsonl", "l1-off-mbs-extract.jsonl"):
        if os.path.exists(os.path.join(D, extra_mbs)):
            mbs_lines += list(open(os.path.join(D, extra_mbs)))
    mbs_by_fid = {}
    for line in mbs_lines:
        mj = json.loads(line)
        mbs_by_fid[str(mj["file_id"])] = mj
    for line in mbs_lines:
        m = json.loads(line)
        k = key(m["title"])
        fidn = int(m["file_id"]) if str(m["file_id"]).isdigit() else 0
        if m.get("error"):
            continue
        if k and (k not in mbs or fidn > (int(mbs[k]["file_id"]) if str(mbs[k]["file_id"]).isdigit() else 0)):
            mbs[k] = m
    overrides = json.load(open(os.path.join(D, "l1-geometry-overrides.json")))

    for r in csv.DictReader(open(os.path.join(D, "l1-state.csv"))):
        rows.append(dict(r))
    manifest = [json.loads(l) for l in open(os.path.join(ROOT, "research", "raw", "MANIFEST.jsonl"), encoding="utf-8")]
    by_stem = {}
    for mrec in manifest:
        stem = os.path.basename(mrec["text_path"])
        by_stem.setdefault(stem, mrec)
    sources["mom-sas-2025-05-27"] = {"id": "mom-sas-2025-05-27", "url": "https://mines.gov.in/webportal/content/successful-auction-since-2015",
        "title": "Ministry of Mines - Successful Auctions Since 2015 (500 blocks, as on 27.05.2025)", "publisher": "Ministry of Mines",
        "tier": "T1", "date": "2025-05-27", "retrieved": TODAY,
        "raw_path": "research/raw/mines.gov.in/mom-successful-auction-since-2015-as-on-2025-05-27.txt"}
    for fy, slugpart in (("2023-24", "2023-2024"), ("2024-25", "2024-2025"), ("2025-26", "2025-2026"), ("2026-27", "2026-2027")):
        sources[f"mstc-all-results-fy{fy}"] = {"id": f"mstc-all-results-fy{fy}",
            "url": f"https://www.mstcecommerce.com/auctionhome/mlcln/mineral_auction_result.jsp?typerep=f&finYr={slugpart}&sellerRefId=0",
            "title": f"MSTC - Mineral Block Auction Results, all sellers, FY {fy}", "publisher": "MSTC Ltd", "tier": "T1",
            "date": TODAY, "retrieved": TODAY, "raw_path": f"research/raw/mstcecommerce.com/mstc-all-results-fy{slugpart}-2026-10-23.txt"}

    def resolve_raw(sid, state, date):
        prefix = sid[4:]
        stem = next((k for k in sorted(by_stem) if k.startswith(prefix + "-") or k == prefix + ".txt"), None)
        if not stem:
            return None
        mrec = by_stem[stem]
        fid = re.match(r"mstc-(\d+)-", stem)
        title = listing.get(fid.group(1), {}).get("title") if fid else None
        if not title:
            title = re.sub(r"^mstc-(?:[a-z]{2}-)?(?:nit|notif|mbs|corr|tech)?-?\d*-?", "", stem[:-4]).replace("-", " ").strip()
        sources[sid] = {"id": sid, "url": mrec["url"], "title": title[:150], "publisher": f"Government of {state} (via MSTC e-auction portal)",
                        "tier": "T1", "date": date, "retrieved": mrec.get("retrieved", TODAY), "raw_path": mrec["text_path"]}
        return sid

    for r in rows:
        r["state"] = re.sub(r"\s*\(UT\)", "", r["state"]).strip()
        r.setdefault("route", "Centre")
        ids = []
        for sid in (r.get("source_ids") or "").split(";"):
            sid = sid.strip()
            if sid.startswith("raw:"):
                sid = resolve_raw(sid, r["state"], r.get("nit_date") or r.get("outcome_date") or TODAY) or ""
            if sid:
                ids.append(sid)
        r["source_ids"] = ";".join(ids)
    groups = defaultdict(list)
    for r in rows:
        k = r.get("merge_key") or key(r["block_name_as_printed"])
        groups[(k, r["state"])].append(r)

    records, evidence = [], []
    for (k, state), offers in groups.items():
        offers.sort(key=lambda r: (r.get("nit_date") or r.get("outcome_date") or "", tranche_no(r["tranche"])))
        last, first = offers[-1], offers[0]
        name = re.sub(r"\s+", " ", last["block_name_as_printed"]).strip()
        rid = last.get("id_override") or (f"blk-off-{slug(name)}" if last["concession_type"].startswith("Offshore") else f"blk-{ST[state]}-{slug(name)}")
        forced = next((o.get("mbs_file_id") for o in reversed(offers) if o.get("mbs_file_id")), None)
        m = mbs_by_fid.get(forced) if forced else mbs.get(k)
        if m is None and k and not forced:
            from rapidfuzz import fuzz, process
            hit = process.extractOne(k, list(mbs), scorer=fuzz.ratio, score_cutoff=90)
            m = mbs[hit[0]] if hit else None  # spelling variants, e.g. Dumrimunda / Dumurimunda
        ov = None
        if m and m["file_id"] in overrides:
            ov = overrides[m["file_id"]]
        commodity = last["commodity_as_stated"]
        minerals = canon(" ".join(o["commodity_as_stated"] for o in offers))
        if "polymetallic" in commodity.lower():
            # the block summaries report Co, Cu and Ni (with MnO) in nodule/crust geochemistry
            minerals = ["Cobalt", "Copper", "Nickel"]
        # sources referenced by the offerings
        sids = []
        for o in offers:
            for s in o["source_ids"].split(";"):
                s = s.strip()
                if s and s not in sids:
                    sids.append(s)
        history = []
        for o in offers:
            outcome = {"No bids": "No bids"}.get(o["outcome"], o["outcome"])
            history.append({
                "tranche": o["tranche"], "nit_date": o["nit_date"] or None, "outcome": outcome,
                "outcome_date": o.get("outcome_date") or None,
                "annulment_reason": o.get("annulment_reason") or None,
                "preferred_bidder": o.get("preferred_bidder") or None,
                "final_offer_pct": float(o["final_offer_pct"]) if o.get("final_offer_pct") else None,
                "reserve_price": o.get("reserve_price") or None,
            })
        lo = last["outcome"]
        status = {"Preferred bidder": "Preferred bidder", "Annulled": "Annulled", "No bids": "Annulled",
                  "Pending": "Offered", "Offered": "Re-offered" if len(offers) > 1 else "Offered"}[lo]
        route = last.get("route") or "Centre"
        offered_by = "the Centre" if route == "Centre" else f"the Government of {state}"
        if len({o.get("route") or "Centre" for o in offers}) > 1:
            offered_by = f"the Government of {state} and then the Centre"
        if lo == "Annulled" and last.get("preferred_bidder"):
            status_detail = (f"Preferred bidder ({last['preferred_bidder']}) declared in {tranche_label(last['tranche'])}, "
                             f"then the auction was annulled")
        elif status == "Preferred bidder":
            status_detail = f"{last['preferred_bidder']}, final price offer {float(last['final_offer_pct']):g}% ({tranche_label(last['tranche'])})"
        elif lo == "Pending":
            status_detail = f"{tranche_label(last['tranche'])}: outcome pending. {last.get('notes') or ''}".strip()
        elif lo == "Offered":
            status_detail = f"Offered in {tranche_label(last['tranche'])}; no result published"
        else:
            reason = last.get("annulment_reason") or ("No bids received" if lo == "No bids" else "")
            status_detail = f"Annulled in {tranche_label(last['tranche'])}: {reason}".rstrip(": ")
        status_as_of = last.get("outcome_date") or last["nit_date"]
        if lo == "Pending":  # newest notice among this offering's sources
            status_as_of = max(str(sources[x]["date"])[:10] for x in last["source_ids"].split(";") if x in sources)

        # location
        village = None
        if m and m.get("villages"):
            village = re.split(r"[,;]| and ", m["villages"])[0].strip()
        elif last.get("tehsil_or_village"):
            vm = re.search(r"Villages?:\s*([^;,]+)", last["tehsil_or_village"])
            village = vm.group(1).split(" and ")[0].strip() if vm else None
        geom, lat, lon, precision = None, None, None, "district"
        if ov:
            geom = ov["geometry"]
        elif m and m.get("polygon") and m.get("geometry_check") == "ok":
            geom = {"type": "Polygon", "coordinates": [m["polygon"]]}
        if geom:
            from shapely.geometry import shape
            g = shape(geom)
            c = g.centroid if g.contains(g.centroid) else g.representative_point()
            lat, lon, precision = round(c.y, 6), round(c.x, 6), "exact"
        if not geom and village:
            g = village_geocode(village, state, last.get("district"))
            if g:
                lat, lon, precision = g[0], g[1], "town"
        if not geom and lat is None and last.get("district"):
            c = district_centroid(last["district"], state)
            if c:
                lat, lon, precision = c[0], c[1], "district"
        area = (ov.get("area_sq_km") if ov else None) or (m.get("area_sq_km") if m else None)
        if area is None and last.get("area_sq_km"):
            area = float(last["area_sq_km"])
        stage = (m.get("exploration_stage") if m else None) or last.get("exploration_stage") or None

        rec_sources = []
        sup = defaultdict(set)
        nit_first = next((s for s in sids if s.endswith("-nit") or s.endswith("-nit-mbs")), None)
        for s in sids:
            sup[s].add("auction.history")
        for s in last["source_ids"].split(";"):
            s = s.strip()
            if s:
                sup[s].add("status")
        for s in first["source_ids"].split(";"):
            s = s.strip()
            if s and (s.endswith("nit") or s.endswith("nit-mbs") or "-nit-" in s or s == "mom-sas-2025-05-27"
                      or not any("nit" in x for x in first["source_ids"].split(";"))):
                sup[s] |= {"dates.first_public", "minerals", "block.concession_type"}
        if status == "Preferred bidder":
            for s in last["source_ids"].split(";"):
                s = s.strip()
                if s and ("results" in s or s.endswith("-pb") or s == "mom-sas-2025-05-27" or (route == "State" and "-nit-" not in s)):
                    sup[s].add("operator")
        if ov and ov.get("source"):
            os_ = ov["source"]
            hits = glob.glob(os.path.join(RAW, f"mstc-{os_['file_id']}-*.txt"))
            url = listing.get(os_["file_id"], {}).get("url") or next((json.loads(l)["url"] for l in open(os.path.join(ROOT, "research", "raw", "MANIFEST.jsonl"))
                                                                      if f"FILE_ID={os_['file_id']}" in l), None)
            sources[os_["id"]] = {"id": os_["id"], "url": url, "title": os_["title"], "publisher": "Ministry of Mines (via MSTC e-auction portal)",
                                  "tier": "T1", "date": os_["date"], "retrieved": TODAY,
                                  "raw_path": os.path.relpath(hits[0], ROOT) if hits else None}
            sup[os_["id"]].add("location")
        mbs_sid = None
        if m:
            mbs_sid = f"mstc-mbs-{m['file_id']}"
            sources.setdefault(mbs_sid, {"id": mbs_sid, "url": m["url"], "title": f"Mine Block Summary: {m['title']}",
                                         "publisher": "Ministry of Mines (via MSTC e-auction portal)", "tier": "T1",
                                         "date": last.get("nit_date") or last.get("outcome_date"), "retrieved": TODAY, "raw_path": m.get("raw_path")})
            sup[mbs_sid] |= {"location", "block.area_sq_km", "block.exploration_stage"}
            if "polymetallic" in commodity.lower():
                sup[mbs_sid].add("minerals")
        for s, fields in sup.items():
            if s not in sources:
                continue
            src = sources[s]
            rec_sources.append({"id": s, "url": src["url"], "title": src["title"], "publisher": src.get("publisher") or "Ministry of Mines",
                                "tier": src.get("tier", "T1"), "date": str(src.get("date") or last.get("nit_date") or last.get("outcome_date"))[:10],
                                "retrieved": str(src.get("retrieved") or TODAY)[:10], "archive_url": None,
                                "supports": sorted(fields)})

        n_off = len(offers)
        ct = last["concession_type"]
        kind = {"CL": "composite licence", "ML": "mining lease", "EL": "exploration licence",
                "Offshore-CL": "offshore composite licence", "Offshore-PL": "offshore production lease"}[ct]
        art = "an" if kind[0] in "aeiou" else "a"
        dword = "districts" if re.search(r" and |,", last["district"]) else "district"
        what = (f"A {area:.2f} sq km block offered for {art} {kind}, for {commodity.lower()}, in {last['district']} {dword}, {state}"
                + (f", explored to {stage} level." if stage else ".")) if area else \
               f"A block offered for {art} {kind}, for {commodity.lower()}, in {last['district']} {dword}, {state}."
        tr_last = f"{tranche_label(last['tranche'])}"
        if status == "Preferred bidder":
            if ct == "EL":
                sig = (f"{last['preferred_bidder']} won the exploration licence in {tr_last} ({human_date(status_as_of)}) with the lowest "
                       f"final price offer, {float(last['final_offer_pct']):g}% (exploration-licence auctions are reverse auctions).")
            else:
                sig = (f"{last['preferred_bidder']} won it in {tr_last} ({human_date(status_as_of)}) with a final price offer of "
                       f"{float(last['final_offer_pct']):g}%." + (f" It took {n_off} attempts to auction." if n_off > 1 else ""))
        elif lo == "Pending":
            sig = f"Offered in {tr_last} ({human_date(last['nit_date'])}); the outcome is pending. {last.get('notes') or ''}".strip()
        elif lo == "Offered":
            sig = (f"Offered {n_off} time{'s' if n_off > 1 else ''} by {offered_by}, most recently in {tr_last} "
                   f"({human_date(last['nit_date'])}); no preferred bidder has been published.")
        else:
            sig = (f"Offered {n_off} time{'s' if n_off > 1 else ''} by {offered_by}, most recently in {tr_last}, "
                   f"and the auction was annulled" + (f" ({human_date(status_as_of)})." if status_as_of else "."))
        notes = []
        if last.get("notes"):
            notes.append(last["notes"].strip())
        if m and m.get("resources_snippet"):
            pass
        if ov:
            notes.append("Boundary polygon recovered by OCR of the MBS annexure; checked against the stated block area.")
        if status == "Preferred bidder":
            notes.append("Letter of intent / licence execution status not yet checked (see OPEN_QUESTIONS).")
        rec = {
            "id": rid, "name": name,
            "aliases": sorted({re.sub(r"\s+", " ", o["block_name_as_printed"]).strip() for o in offers} - {name}),
            "layer": "blocks", "stages": ["Exploration"], "minerals": minerals,
            "commodity_as_stated": commodity, "products": [],
            "operator": last.get("preferred_bidder") if status == "Preferred bidder" else None,
            "operator_type": None, "owners": [], "partners": [],
            "location": {"address": None, "village_or_town": village, "state": state,
                         "district": last.get("district") or (re.sub(r"\s*\(.*$|,.*$", "", m["district"]).strip() if m and m.get("district") else None),
                         "country": "India", "lat": lat, "lon": lon, "precision": precision, "geometry": geom},
            "status": status, "status_as_of": status_as_of, "status_detail": status_detail,
            "capacity": {"planned": {"value": None, "unit": None, "basis": None, "phase": None},
                         "installed": {"value": None, "unit": None, "basis": None}},
            "investment": {"amount": None, "currency": None, "basis": None},
            "feedstock": None, "feedstock_detail": None, "schemes": [], "scheme_status": {},
            "dates": {"first_public": first.get("nit_date") or first.get("outcome_date"), "announced": None, "mou": None, "approved": None,
                      "construction_start": None, "original_expected_completion": None,
                      "revised_expected_completion": None, "commissioned": None, "closed": None},
            "milestones": [{"date": h["outcome_date"] or h["nit_date"],
                            "event": f"{tranche_label(h['tranche'])}: {h['outcome'].lower()}"
                                     + (f" ({h['preferred_bidder']}, {h['final_offer_pct']:g}%)" if h["preferred_bidder"] and h["final_offer_pct"] is not None else ""),
                            "source_id": next((s for s in o["source_ids"].split(";") if s.strip() in sources), None)}
                           for h, o in zip(history, offers)],
            "narrative": {"what_it_does": what, "significance": sig},
            "related": [], "see_also": [], "confidence": "medium" if (lo == "Offered" or not (last.get("district") or (m and m.get("district")))) else "high",
            "last_verified": TODAY,
            "notes": " ".join(notes) or None,
            "sources": rec_sources,
            "block": {"concession_type": ct, "auction_route": route, "area_sq_km": area, "exploration_stage": stage,
                      "resources": [], "resources_as_stated": (m.get("resources_snippet") if m else None)},
            "auction": {"history": history, "loi_date": None, "licence_or_lease_executed": None, "production_started": None},
        }
        if not geom:
            rec["notes"] = ((rec["notes"] or "") + " Needs district centroid.").strip()
        records.append(rec)

        # Evidence for fields added in this assembly (T6-T8 offerings, MBS-derived fields)
        if m:
            for field, val, line in (("block.area_sq_km", area, m.get("area_line")), ("block.exploration_stage", stage, m.get("stage_line"))):
                if line:
                    evidence.append({"entity": rid, "field": field, "value": val, "source_id": mbs_sid,
                                     "excerpt": " ".join(line.split()[:30]), "raw_path": m.get("raw_path"), "retrieved": TODAY,
                                     "checked_by": "researcher"})
            if geom:
                evidence.append({"entity": rid, "field": "location", "value": [lat, lon], "source_id": mbs_sid,
                                 "excerpt": f"{len(m.get('polygon') or [])} boundary corner points ({m.get('corner_kind') or 'OCR'}); polygon area "
                                            f"{m.get('polygon_area_sq_km_approx')} sq km vs stated {m.get('area_sq_km')} sq km",
                                 "raw_path": m.get("raw_path"), "retrieved": TODAY, "checked_by": "researcher"})
        for o, h in zip(offers, history):
            if tranche_no(o["tranche"]) < 6:
                continue
            for s in o["source_ids"].split(";"):
                s = s.strip()
                src = sources.get(s)
                if not src or not src.get("raw_path") or not os.path.exists(os.path.join(ROOT, src["raw_path"])):
                    continue
                text = open(os.path.join(ROOT, src["raw_path"]), encoding="utf-8", errors="ignore").read()
                text = re.sub(r"\s+", " ", text)
                needle = re.split(r"[ ,(]", o["block_name_as_printed"].strip())[0]
                ex = excerpt(text, needle)
                if ex:
                    field = "operator" if "results" in s else "auction.history"
                    evidence.append({"entity": rid, "field": field, "value": h["outcome"] if field != "operator" else h["preferred_bidder"],
                                     "source_id": s, "excerpt": " ".join(ex.split()[:30]), "raw_path": src["raw_path"],
                                     "retrieved": TODAY, "checked_by": "researcher"})

    # post-auction status (LoI, licence/lease execution) from Parliament answers and company filings
    upd_path = os.path.join(D, "l1-status-updates.yml")
    if os.path.exists(upd_path):
        by_id = {r["id"]: r for r in records}
        for u in yaml.safe_load(open(upd_path)) or []:
            r = by_id.get(u["id"])
            if not r:
                print("status update for unknown id", u["id"])
                continue
            for k in ("status", "status_as_of", "status_detail", "confidence"):
                if u.get(k):
                    r[k] = u[k]
            for k, v in (u.get("auction") or {}).items():
                r["auction"][k] = v
            r["milestones"] = sorted(r["milestones"] + (u.get("milestones") or []), key=lambda m: str(m["date"]))
            have = {x["id"] for x in r["sources"]}
            r["sources"] += [x for x in u.get("sources") or [] if x["id"] not in have]
            if r.get("notes"):
                r["notes"] = r["notes"].replace("Letter of intent / licence execution status not yet checked (see OPEN_QUESTIONS).", "").strip() or None
    records.sort(key=lambda r: (r["location"]["state"] or "~", r["name"]))
    with open(os.path.join(D, "l1-centre-blocks.yml"), "w", encoding="utf-8") as f:
        yaml.safe_dump(records, f, sort_keys=False, allow_unicode=True, width=120)
    with open(os.path.join(D, "l1-centre-blocks.evidence.jsonl"), "w", encoding="utf-8") as f:
        for line in open(os.path.join(D, "l1-centre.evidence.jsonl"), encoding="utf-8"):
            f.write(line)
        for e in evidence:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")
    print(f"{len(records)} block records; {sum(1 for r in records if r['location']['geometry'])} with polygons; "
          f"{len(evidence)} new evidence lines")


if __name__ == "__main__":
    main()
