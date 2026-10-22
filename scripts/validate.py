#!/usr/bin/env python3
"""Validate the YAML data against docs/SCHEMA.md §5 and RESEARCH_PROTOCOL.md §8.2.

Usage:
  .venv/bin/python -I scripts/validate.py                 # all data/*.yml
  .venv/bin/python -I scripts/validate.py research/drafts/l2-magnets.yml   # a draft (ids checked against data/ too)
  options: --quiet (errors only)  --max N (print at most N issues per rule)

Exit 1 if any ERROR. WARNINGs never fail (narrative style, duplicates, staleness).
A failing validator blocks commits and deploys.
"""
import argparse
import datetime as dt
import glob
import os
import re
import sys
from collections import defaultdict

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data")
ENTITY_FILES = ["blocks", "mines", "processing", "materials", "magnets", "recycling", "rnd", "overseas", "demand"]
AUX_FILES = ["schemes", "tranches", "gsi_exploration"]
TODAY = dt.date.today()

LAYERS = set(ENTITY_FILES)
PRECISION = {"exact", "site", "town", "district", "state"}
CONFIDENCE = {"high", "medium", "low"}
TIERS = {"T1", "T2", "T3", "T4", "T5"}
OPERATOR_TYPES = {"PSU (Central)", "PSU (State)", "Government / Ministry", "Listed private", "Unlisted private",
                  "Startup", "Foreign MNC", "JV", "Academic", "Research lab", "Consortium"}
FEEDSTOCK = {None, "Domestic ore", "Imported intermediate", "Imported ore", "Scrap/secondary", "Mixed",
             "Not applicable", "Unknown"}
BLOCK_STATUS = {"Identified", "Offered", "Annulled", "Re-offered", "Preferred bidder", "LoI issued",
                "Licence / lease executed", "Operational"}
PLANT_STATUS = {"Announced", "MoU signed", "Bid submitted", "Approved", "Under construction", "Pilot",
                "Operational", "Expanding", "Stalled", "Cancelled", "Closed"}
OVERSEAS_STATUS = PLANT_STATUS | {"Under evaluation", "Bid submitted", "Bid lost", "Withdrawn"}
RND_STATUS = {"Active", "Concluded", "Pilot"}
STATUS_BY_LAYER = {"blocks": BLOCK_STATUS, "overseas": OVERSEAS_STATUS, "rnd": RND_STATUS}
CONCESSION = {"ML", "CL", "EL", "Offshore-PL", "Offshore-CL", "ISA-contract", "ISA-application"}
ROUTE = {"Centre", "State", "ISA"}
EXPLO_STAGE = {None, "G1", "G2", "G3", "G4", "unknown"}
OUTCOME = {"Offered", "Annulled", "Preferred bidder", "No bids", "Pending", "Withdrawn"}
DEAL_TYPE = {"Equity", "Exploration rights", "Offtake+equity", "Bid", "Evaluation", "Processing plant abroad"}
INSTITUTION = {"Academic", "CSIR", "DAE", "Ministry lab", "Corporate R&D", "Startup pilot"}
PARTNER_ROLE = {"technology", "jv", "offtake", "epc", "finance", "supply"}
# RESEARCH_PROTOCOL §8.2 / SCHEMA §5.6: these statuses need T1/T2, or two T3 from different publishers.
STRONG_STATUS = {"Operational", "Expanding", "Preferred bidder", "LoI issued", "Licence / lease executed", "Approved",
                 "Cancelled", "Annulled", "Closed", "Stalled", "Bid lost", "Withdrawn"}
BANNED = ["pivotal", "landmark", "game-changer", "game changer", "robust", "cutting-edge", "cutting edge",
          "poised to", "testament to"]
DATE_FIELDS = ["first_public", "announced", "mou", "approved", "construction_start", "original_expected_completion",
               "revised_expected_completion", "commissioned", "closed"]
FUTURE_OK = {"original_expected_completion", "revised_expected_completion"}
ID_RX = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RX = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
OQ_RX = re.compile(r"OPEN_QUESTIONS\s*#?\s*\d+|OQ-?\d+", re.I)


class Report:
    def __init__(self, maxn):
        self.err = defaultdict(list)
        self.warn = defaultdict(list)
        self.maxn = maxn

    def e(self, rule, where, msg):
        self.err[rule].append(f"{where}: {msg}")

    def w(self, rule, where, msg):
        self.warn[rule].append(f"{where}: {msg}")

    def dump(self, quiet):
        def show(kind, d):
            for rule in sorted(d):
                items = d[rule]
                print(f"{kind} [{rule}] x{len(items)}")
                for it in items[: self.maxn]:
                    print(f"   - {it}")
                if len(items) > self.maxn:
                    print(f"   … {len(items) - self.maxn} more")
        show("ERROR", self.err)
        if not quiet:
            show("WARN ", self.warn)
        ne = sum(len(v) for v in self.err.values())
        nw = sum(len(v) for v in self.warn.values())
        print(f"\n{ne} error(s), {nw} warning(s)")
        return ne


def load_yaml(path):
    with open(path, encoding="utf-8") as f:
        d = yaml.safe_load(f)
    if d is None:
        return []
    if isinstance(d, dict):
        for k in ("records", "entities", "items", "schemes", "tranches", "rows"):
            if isinstance(d.get(k), list):
                return d[k]
        return [d]
    return d


def parse_date(s):
    if s is None:
        return None
    s = str(s)
    if not DATE_RX.match(s):
        return False
    parts = [int(x) for x in s.split("-")]
    try:
        if len(parts) == 3:
            return dt.date(*parts)
        if len(parts) == 2:
            return dt.date(parts[0], parts[1], 1)
        return dt.date(parts[0], 1, 1)
    except ValueError:
        return False


def get(d, path):
    cur = d
    for p in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(p)
    return cur


def covered(field, supports_all):
    """field 'capacity.planned' is covered by supports 'capacity.planned' or 'capacity'."""
    parts = field.split(".")
    return any(".".join(parts[:i]) in supports_all for i in range(1, len(parts) + 1))


def sentences(t):
    t = re.sub(r"\b(?:e\.g|i\.e|etc|vs|Ltd|Pvt|Co|Inc|No|approx|Dr|Mr|Ms|St|Rs|Govt|Dept|Corp|Mt)\.", "_", t or "")
    t = re.sub(r"(\d)\.(\d)", r"\1_\2", t)
    return [s for s in re.split(r"(?<=[.!?])\s+", t.strip()) if s]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="*")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--max", type=int, default=25)
    a = ap.parse_args()
    R = Report(a.max)

    mref = yaml.safe_load(open(os.path.join(DATA, "reference", "minerals.yml")))["minerals"]
    MINERALS = {m["name"] for m in mref}
    sref = yaml.safe_load(open(os.path.join(DATA, "reference", "stages.yml")))["stages"]
    STAGES = {s["id"] for s in sref}

    data_files = {f: os.path.join(DATA, f + ".yml") for f in ENTITY_FILES + AUX_FILES}
    targets = [os.path.abspath(f) for f in a.files] if a.files else [p for p in data_files.values() if os.path.exists(p)]

    # Load everything in data/ (for id uniqueness and reference resolution) plus the targets.
    loaded = {}
    for p in set(list(data_files.values()) + targets):
        if os.path.exists(p):
            try:
                loaded[p] = load_yaml(p) or []
            except yaml.YAMLError as ex:
                R.e("yaml", os.path.relpath(p, ROOT), str(ex).splitlines()[0])
                loaded[p] = []

    all_ids = defaultdict(list)
    for p, recs in loaded.items():
        for r in recs:
            if isinstance(r, dict) and r.get("id"):
                all_ids[r["id"]].append(os.path.relpath(p, ROOT))
    scheme_ids = {r.get("id") for r in loaded.get(data_files["schemes"], []) if isinstance(r, dict)}

    for rid, where in all_ids.items():
        if len(where) > 1:
            R.e("2-unique-id", rid, f"appears {len(where)}x in {sorted(set(where))}")

    entity_recs = []
    for p in targets:
        recs = loaded.get(p, [])
        base = os.path.splitext(os.path.basename(p))[0]
        rel = os.path.relpath(p, ROOT)
        if base in AUX_FILES:
            for r in recs:
                if not isinstance(r, dict) or not r.get("id"):
                    R.e("1-schema", rel, "aux record without id")
                    continue
                if not r.get("sources"):
                    R.e("4-required", f"{rel}:{r['id']}", "no sources")
            continue
        if not isinstance(recs, list):
            R.e("1-schema", rel, "file must be a YAML list of records")
            continue
        for r in recs:
            if not isinstance(r, dict):
                R.e("1-schema", rel, "non-mapping record")
                continue
            entity_recs.append((rel, base, r))

    for rel, base, r in entity_recs:
        rid = r.get("id") or "<no id>"
        W = f"{rid}"
        layer = r.get("layer")
        # ---- 1 schema / enums
        if not ID_RX.match(str(rid)):
            R.e("1-schema", W, "id must be kebab-case")
        if layer not in LAYERS:
            R.e("1-schema", W, f"layer {layer!r} not in {sorted(LAYERS)}")
        elif base in LAYERS and layer != base:
            R.e("1-schema", W, f"layer {layer} does not match file {base}.yml")
        for k in ("name", "stages", "minerals", "location", "sources", "dates"):
            if k not in r:
                R.e("1-schema", W, f"missing key '{k}'")
        st = r.get("stages") or []
        if not st:
            R.e("1-schema", W, "stages empty")
        for s in st:
            if s not in STAGES:
                R.e("1-schema", W, f"stage {s!r} not in stages.yml")
        if "minerals_pending" in r and r["minerals_pending"]:
            (R.w if "drafts" in rel else R.e)("3-minerals", W, f"minerals_pending {r['minerals_pending']} must be resolved")
        for m in r.get("minerals") or []:
            if m not in MINERALS:
                R.e("3-minerals", W, f"mineral {m!r} not in minerals.yml")
        for m in get(r, "demand.inputs") or []:
            if m not in MINERALS:
                R.e("3-minerals", W, f"demand.inputs {m!r} not in minerals.yml")
        if not (r.get("minerals") or []):
            R.w("3-minerals", W, "no canonical minerals tagged")
        status = r.get("status")
        allowed = STATUS_BY_LAYER.get(layer, PLANT_STATUS)
        if status not in allowed:
            R.e("1-schema", W, f"status {status!r} not valid for layer {layer}")
        ot = r.get("operator_type")
        if ot is not None and ot not in OPERATOR_TYPES:
            R.e("1-schema", W, f"operator_type {ot!r}")
        if r.get("feedstock") not in FEEDSTOCK:
            R.e("1-schema", W, f"feedstock {r.get('feedstock')!r}")
        if r.get("confidence") not in CONFIDENCE:
            R.e("4-required", W, f"confidence {r.get('confidence')!r}")
        for pt in r.get("partners") or []:
            if isinstance(pt, dict) and pt.get("role") and pt["role"] not in PARTNER_ROLE:
                R.e("1-schema", W, f"partner role {pt['role']!r}")
        loc = r.get("location") or {}
        if loc.get("precision") not in PRECISION:
            R.e("4-required", W, f"location.precision {loc.get('precision')!r}")
        if layer == "blocks":
            b = r.get("block") or {}
            if b.get("concession_type") not in CONCESSION:
                R.e("1-schema", W, f"block.concession_type {b.get('concession_type')!r}")
            if b.get("auction_route") not in ROUTE:
                R.e("1-schema", W, f"block.auction_route {b.get('auction_route')!r}")
            if b.get("exploration_stage") not in EXPLO_STAGE:
                R.e("1-schema", W, f"block.exploration_stage {b.get('exploration_stage')!r}")
            for h in get(r, "auction.history") or []:
                if h.get("outcome") not in OUTCOME:
                    R.e("1-schema", W, f"auction outcome {h.get('outcome')!r}")
        if layer == "overseas":
            o = r.get("overseas") or {}
            if o.get("deal_type") not in DEAL_TYPE:
                R.e("1-schema", W, f"overseas.deal_type {o.get('deal_type')!r}")
            if not o.get("host_country"):
                R.e("1-schema", W, "overseas.host_country missing")
        if layer == "rnd":
            it = get(r, "rnd.institution_type")
            if it not in INSTITUTION:
                R.e("1-schema", W, f"rnd.institution_type {it!r}")

        # ---- 4 required
        if not get(r, "dates.first_public"):
            R.e("4-required", W, "dates.first_public missing")
        for k in ("status", "status_as_of", "last_verified"):
            if not r.get(k):
                R.e("4-required", W, f"{k} missing")
        srcs = r.get("sources") or []
        if not srcs:
            R.e("4-required", W, "no sources")

        # ---- sources
        supports_all, tiers_for = set(), defaultdict(list)
        sids = set()
        for s in srcs:
            if not isinstance(s, dict):
                R.e("1-schema", W, "source is not a mapping")
                continue
            if s.get("id") in sids:
                R.e("1-schema", W, f"duplicate source id {s.get('id')}")
            sids.add(s.get("id"))
            if not s.get("url") or not str(s["url"]).startswith(("http://", "https://")):
                R.e("1-schema", W, f"source {s.get('id')} url invalid")
            if s.get("tier") not in TIERS:
                R.e("1-schema", W, f"source {s.get('id')} tier {s.get('tier')!r}")
            for k in ("title", "publisher", "retrieved"):
                if not s.get(k):
                    R.e("1-schema", W, f"source {s.get('id')} missing {k}")
            for k in ("date", "retrieved"):
                d = parse_date(s.get(k))
                if d is False:
                    R.e("8-dates", W, f"source {s.get('id')} {k} {s.get(k)!r} not ISO")
                elif d and d > TODAY:
                    R.e("8-dates", W, f"source {s.get('id')} {k} in the future")
            sup = s.get("supports") or []
            if not sup:
                R.e("5-coverage", W, f"source {s.get('id')} supports nothing")
            for f in sup:
                supports_all.add(f)
                # register every prefix so 'capacity' covers 'capacity.planned'
                tiers_for[f].append((s.get("tier"), s.get("publisher")))

        def tiers_covering(field):
            parts = field.split(".")
            out = []
            for i in range(1, len(parts) + 1):
                out += tiers_for.get(".".join(parts[:i]), [])
            # a source supporting a sub-field (e.g. 'capacity.planned') also counts for 'capacity'
            out += [t for k, v in tiers_for.items() if k.startswith(field + ".") for t in v]
            return out

        # ---- 5 field-to-source coverage
        key_fields = []
        if status:
            key_fields.append("status")
        if r.get("operator"):
            key_fields.append("operator")
        if loc.get("precision") in ("exact", "site"):
            key_fields.append("location")
        for ph in ("planned", "installed"):
            if get(r, f"capacity.{ph}.value") is not None:
                key_fields.append(f"capacity.{ph}")
        if get(r, "investment.amount") is not None:
            key_fields.append("investment")
        for df in DATE_FIELDS:
            if get(r, f"dates.{df}"):
                key_fields.append(f"dates.{df}")
        if get(r, "auction.history"):
            key_fields.append("auction.history")
        if r.get("minerals"):
            key_fields.append("minerals")
        for f in key_fields:
            if not covered(f, supports_all):
                (R.w if f == "minerals" else R.e)("5-coverage", W, f"'{f}' has no source in supports")
            else:
                tl = tiers_covering(f)
                if tl and all(t == "T5" for t, _ in tl):
                    R.e("5-coverage", W, f"'{f}' rests only on T5 sources")

        # ---- 6 status evidence bar
        if status in STRONG_STATUS:
            tl = tiers_covering("status")
            strong = any(t in ("T1", "T2") for t, _ in tl)
            t3pubs = {p for t, p in tl if t == "T3"}
            if not strong and len(t3pubs) < 2:
                R.e("6-status-bar", W, f"status {status!r} needs a T1/T2 source or two T3 publishers in supports:[status]")

        # ---- 7 coordinates (precise test is scripts/geocheck.py)
        lat, lon = loc.get("lat"), loc.get("lon")
        country = (loc.get("country") or "India")
        if lat is None or lon is None:
            if loc.get("precision") in PRECISION:
                R.e("7-coords", W, "lat/lon missing")
        else:
            try:
                lat, lon = float(lat), float(lon)
            except (TypeError, ValueError):
                R.e("7-coords", W, "lat/lon not numeric")
                lat = lon = None
            if lat is not None:
                if layer != "overseas" and country == "India" and not (3.0 <= lat <= 37.6 and 65.0 <= lon <= 98.5):
                    R.e("7-coords", W, f"({lat},{lon}) outside India's bounding box")
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    R.e("7-coords", W, "lat/lon out of range")
        if loc.get("precision") == "state":
            R.w("7-coords", W, "state-precision location (list it in OPEN_QUESTIONS)")

        # ---- 8 dates
        for df in DATE_FIELDS:
            v = get(r, f"dates.{df}")
            d = parse_date(v)
            if d is False:
                R.e("8-dates", W, f"dates.{df} {v!r} not ISO")
            elif d and d > TODAY and df not in FUTURE_OK:
                R.e("8-dates", W, f"dates.{df} {v} is in the future")
        for k in ("status_as_of", "last_verified"):
            d = parse_date(r.get(k))
            if d is False:
                R.e("8-dates", W, f"{k} {r.get(k)!r} not ISO")
            elif d and d > TODAY:
                R.e("8-dates", W, f"{k} in the future")
        for m in r.get("milestones") or []:
            d = parse_date(m.get("date"))
            if d is False:
                R.e("8-dates", W, f"milestone date {m.get('date')!r} not ISO")
            elif d and d > TODAY:
                R.e("8-dates", W, f"milestone {m.get('date')} in the future")
            if m.get("source_id") and m["source_id"] not in sids:
                R.e("11-refs", W, f"milestone source_id {m['source_id']} not in sources")
        for h in get(r, "auction.history") or []:
            for k in ("nit_date", "outcome_date"):
                d = parse_date(h.get(k))
                if d is False:
                    R.e("8-dates", W, f"auction {k} {h.get(k)!r} not ISO")
                elif d and d > TODAY:
                    R.e("8-dates", W, f"auction {k} in the future")
        lv = parse_date(r.get("last_verified"))
        if lv and (TODAY - lv).days > 120:
            R.w("13-stale", W, f"last_verified {r.get('last_verified')} is >120 days old")

        # ---- 9 low confidence needs an open question
        if r.get("confidence") == "low" and not OQ_RX.search(str(r.get("notes") or "")):
            R.e("9-low-conf", W, "confidence low but notes cite no OPEN_QUESTIONS item")

        # ---- 10 narrative style (warning)
        for k, t in (r.get("narrative") or {}).items():
            if not t:
                continue
            if len(sentences(t)) > 2:
                R.w("10-narrative", W, f"narrative.{k} has >2 sentences")
            for b in BANNED:
                if re.search(r"\b" + re.escape(b) + r"\b", t, re.I):
                    R.w("10-narrative", W, f"narrative.{k} uses banned word '{b}'")

        # ---- 11 references resolve
        for x in r.get("related") or []:
            if x not in all_ids:
                R.e("11-refs", W, f"related id {x!r} does not resolve")
        for x in r.get("schemes") or []:
            if scheme_ids and x not in scheme_ids:
                R.e("11-refs", W, f"scheme id {x!r} not in schemes.yml")
            elif not scheme_ids:
                R.w("11-refs", W, f"scheme id {x!r} unchecked (schemes.yml empty)")

    # ---- 12 duplicates (warning)
    try:
        from rapidfuzz import fuzz
    except ImportError:
        fuzz = None

    def norm_name(n):
        n = (n or "").lower()
        n = re.sub(r"\b(block|mineral|minerals|associated|and|&|the|cluster|ree|graphite|phosphorite|potash|ltd|limited|pvt|private)\b", " ", n)
        return re.sub(r"[^a-z0-9]+", " ", n).strip()

    by_key = defaultdict(list)
    for rel, base, r in entity_recs:
        loc = r.get("location") or {}
        if r.get("operator") and loc.get("district"):
            by_key[(str(r.get("operator")).lower(), str(loc.get("district")).lower())].append(r)
    for (op, dist), rs in by_key.items():
        for i in range(len(rs)):
            for j in range(i + 1, len(rs)):
                if set(rs[i].get("minerals") or []) & set(rs[j].get("minerals") or []) and \
                        set(rs[i].get("stages") or []) & set(rs[j].get("stages") or []):
                    R.w("12-duplicates", rs[i]["id"], f"same operator+district+minerals+stage as {rs[j]['id']}")
    if fuzz:
        blocks = [r for _, _, r in entity_recs if r.get("layer") == "blocks"]
        for i in range(len(blocks)):
            for j in range(i + 1, len(blocks)):
                a_, b_ = norm_name(blocks[i].get("name")), norm_name(blocks[j].get("name"))
                if a_ and b_ and fuzz.ratio(a_, b_) / 100 > 0.85:
                    R.w("12-duplicates", blocks[i]["id"], f"block name near-identical to {blocks[j]['id']}")

    print(f"validated {len(entity_recs)} entity records in {len(targets)} file(s)")
    sys.exit(1 if R.dump(a.quiet) else 0)


if __name__ == "__main__":
    main()
