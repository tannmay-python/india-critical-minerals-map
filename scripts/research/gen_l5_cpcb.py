#!/usr/bin/env python3
"""Generate compact L5 records from the archived CPCB battery-recycler registry (non-lead-acid units).

Writes research/drafts/l5-cpcb.src.yml for scripts/research/build_entities.py.
Coordinates come from the registry; known registry errors are corrected or replaced as listed in FIXES.
Units registered under a person's name (proprietorships) are published without the name.
"""
import json, os, re, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = "eprbattery.cpcb.gov.in/cpcb-battery-recyclers-2026-10-24"
d = json.load(open(os.path.join(ROOT, "research/raw", RAW + ".json")))["data"]

STATE = {"GUJRAT": "Gujarat", "CHATTISGARH": "Chhattisgarh"}
def state_name(s):
    return STATE.get(s, s.title().replace(" And ", " and "))

PERSON = {444, 487, 700, 805, 853, 874, 937, 963}          # proprietorships named after individuals
SKIP = {1003: "placeholder address ('ABC') and no coordinates"}
# id -> (lat, lon, note) or ("geo", {...}, note)
FIXES = {
    901: (20.093367, 73.809284, "Registry lists latitude and longitude swapped; corrected."),
    902: (18.64124, 73.80684, "Registry gives degrees-and-decimal-minutes (1838.47459, 7348.4103); converted to decimal degrees."),
    805: ("geo", {"district_centroid": "Howrah", "state": "West Bengal"}, "Registry coordinates fall in Uttar Pradesh, not the West Bengal address; point is the Howrah district centroid."),
    931: ("geo", {"q": "Mandideep", "state": "Madhya Pradesh"}, "Registry coordinates fall in Haryana, not the Madhya Pradesh address; point is Mandideep town."),
    124: ("geo", {"q": "Duhai", "state": "Uttar Pradesh"}, "No registry coordinates; point is Duhai village from the address."),
    94: ("geo", {"q": "Kosi Kalan", "state": "Uttar Pradesh"}, "Registry coordinates fall in Rajasthan, not the Kosi Kotwan (Mathura) address; point is Kosi Kalan town."),
    783: ("geo", {"q": "Hapur", "state": "Uttar Pradesh"}, "Registry coordinates fall in Delhi, not the Hapur address; point is Hapur town."),
    317: ("geo", {"district_centroid": "Gautam Buddha Nagar", "state": "Uttar Pradesh"}, "No registry coordinates and no usable plant address; point is a district centroid (see the company's other registered unit)."),
}

# Facts from other sources layered onto registry units: id -> (extra source catalogue entries, field overrides, extra source refs)
ENRICH = {
    619: ({"evr-rocklink-2026": {"raw": "evreporter.com/rocklink-india-sets-up-lithium-ion-battery-and-rare-earth-magnet-recycling-facility-in-sik",
                                 "title": "Rocklink India sets up lithium-ion battery and rare earth magnet recycling facility in Sikandrabad, UP",
                                 "publisher": "EVreporter", "tier": "T3", "date": "2026-04"}},
          {"minerals": ["Lithium", "Cobalt", "Nickel", "Rare earths (unspecified)"],
           "products": ["Black mass", "Recycled rare earth magnet material (60 t/month)", "Rare earth chloride (1,500 t/yr line, due Q1 2026)"],
           "location_town": "Sikandrabad"},
          [{"ref": "evr-rocklink-2026", "supports": ["products", "minerals", "location"],
            "ev": {"products": ["It also includes rare earth magnet dismantling and processing operations with a capacity of 60 tonnes per month.",
                                "A rare earth chloride processing line, with a capacity of 1,500 tonnes per year, is scheduled for completion in Q1 2026."],
                   "location": "integrated recycling facility at the UPSIDC Industrial Area in Sikandrabad, Uttar Pradesh"}}]),
}
RELATED = {95: ["lohum-greater-noida-repm", "lohum-krishnagiri-cam"], 605: ["recyclekaro-palghar"]}


def slug(s):
    s = re.sub(r"\b(private|pvt|limited|ltd|llp|india|m/s|co)\b\.?", "", s.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]

def iso(dstr):
    return datetime.datetime.strptime(dstr, "%b %d, %Y").date().isoformat()

TYPES = {"R2": "black mass (dismantling and separation)", "R3": "refining black mass to metal compounds",
         "R4": "dismantling through refining (integrated)"}

out = {"layer": "recycling", "sources": {"cpcb-battery-registry": {
    "raw": RAW, "title": "CPCB Battery Waste Management EPR portal: registered recyclers",
    "publisher": "Central Pollution Control Board", "tier": "T1", "date": "2026-10-24"}}, "records": []}
skipped = []
for r in d:
    t = r["recycler_type"] or ""
    codes = [c for c in ("R2", "R3", "R4") if c + ":" in t]
    if not codes:
        continue
    rid = r["id"]
    if rid in SKIP:
        skipped.append((r["recycler_name"], SKIP[rid])); continue
    person = rid in PERSON
    st = state_name(r["statelists.name"])
    nm = re.sub(r"\s+", " ", r["recycler_name"]).strip()
    disp = "Registered proprietorship (name withheld)" if person else nm.title().replace("Pvt.", "Pvt").replace("Llp", "LLP")
    disp = re.sub(r"\b(Lico|Hbl|Batx|Asnco|Ewri|Brp|Mbvm|Jcp|Rmv|Adv|Ads)\b", lambda m: m.group(1).upper(), disp)
    addr = (r["recycler_address"] or "").replace("&amp;amp;", "&").replace("&amp;", "&")
    if "@" in addr or len(addr) < 6:
        addr = None
    activity = "; ".join(TYPES[c] for c in codes)
    also_la = "R1:" in t
    stage_word = "black mass" if codes == ["R2"] else "battery recycling"
    rec = {
        "id": f"cpcb-{slug(nm) if not person else 'proprietorship'}-{rid}",
        "name": f"{disp}: {stage_word} unit, {st}",
        "stages": ["Recycling"],
        "minerals": ["Lithium", "Cobalt", "Nickel"],
        "commodity_as_stated": t.replace("#,", "; "),
        "products": ["Black mass"] + (["Metals in compound form"] if set(codes) & {"R3", "R4"} else []),
        "operator": "Proprietorship (name withheld)" if person else nm,
        "operator_type": "Unlisted private",
        "location": {"address": None if person else addr, "state": st, "precision": "site"},
        "status": "Operational",
        "status_as_of": "2026-10-24",
        "status_detail": f"CPCB-registered: {activity}" + ("; also recycles lead-acid batteries" if also_la else ""),
        "capacity": {"installed": {"value": r["recycling_capacity"], "unit": "tpa",
                                   "basis": "registered recycling capacity as per consent to operate" + (" (all battery types)" if also_la else "")}},
        "feedstock": "Scrap/secondary",
        "feedstock_detail": "Waste batteries other than lead-acid",
        "dates": {"first_public": iso(r["certificate_date"])},
        "narrative": {"what_it_does": f"Registered with the Central Pollution Control Board to recycle non-lead-acid batteries ({activity})."},
        "confidence": "medium",
        "notes": "Minerals are those of lithium-ion black mass (the registry says only 'all types of battery except lead acid'). Registry certificate no. "
                 + str(r["certificate_no"]) + ".",
        "sources": [{"ref": "cpcb-battery-registry",
                     "supports": ["status", "status_detail", "capacity.installed", "location", "dates.first_public", "operator", "commodity_as_stated", "products"],
                     "ev": {"capacity.installed": f"capacity {r['recycling_capacity']} | certificate {r['certificate_date']} no {r['certificate_no']}",
                            "status": nm[:60]}}],
    }
    fx = FIXES.get(rid)
    if fx and fx[0] == "geo":
        rec["geo"] = fx[1]
        rec["location"]["precision"] = "district" if "district_centroid" in fx[1] else "town"
        rec["notes"] += " " + fx[2]
    elif fx:
        rec["location"]["lat"], rec["location"]["lon"] = fx[0], fx[1]
        rec["notes"] += " " + fx[2]
    else:
        rec["location"]["lat"], rec["location"]["lon"] = round(float(r["latitude"]), 6), round(float(r["longitude"]), 6)
        rec["notes"] += " Coordinates as registered with CPCB."
    if rid in ENRICH:
        cat, fields, refs = ENRICH[rid]
        out["sources"].update(cat)
        if "minerals" in fields: rec["minerals"] = fields["minerals"]
        if "products" in fields: rec["products"] = fields["products"]
        if "location_town" in fields: rec["location"]["village_or_town"] = fields["location_town"]
        rec["sources"].extend(refs)
    if rid in RELATED:
        rec["related"] = RELATED[rid]
    out["records"].append(rec)

import yaml
p = os.path.join(ROOT, "research/drafts/l5-cpcb.src.yml")
yaml.safe_dump(out, open(p, "w"), sort_keys=False, allow_unicode=True, width=200)
print(len(out["records"]), "records;", "skipped:", skipped)
