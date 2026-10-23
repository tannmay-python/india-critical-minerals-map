#!/usr/bin/env python3
"""Spot-verify block records against the raw text of their cited sources (RESEARCH_PROTOCOL §8.1).
Usage: verify_l1.py [--sample N] [--seed S] [--all]
For each sampled record and each check, searches the raw text of the record's sources (via MANIFEST)
and reports confirmed / mismatch. Writes research/drafts/l1-verify.evidence.jsonl and prints a tally."""
import argparse, json, os, random, re
import yaml
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
man = {}
for l in open(os.path.join(ROOT, "research/raw/MANIFEST.jsonl")):
    r = json.loads(l); man.setdefault(r["url"], r)
import glob
ALIAS = {"https://mines.gov.in/webportal/content/successful-auction-since-2015":
         "research/raw/mines.gov.in/mom-successful-auction-since-2015-as-on-2025-05-27.txt"}
def raw_text(url):
    if url in ALIAS:
        p = os.path.join(ROOT, ALIAS[url])
    else:
        r = man.get(url)
        fid = re.search(r"FILE_ID=(\d+)", url)
        if fid:  # same MSTC document may be cited with different URL quoting
            hits = glob.glob(os.path.join(ROOT, "research/raw/mstcecommerce.com", f"mstc-{fid.group(1)}-*.txt"))
            hits += glob.glob(os.path.join(ROOT, "research/raw/mstcecommerce.com", f"mstc-*-{fid.group(1)}-*.txt"))
            hits = [h for h in hits if not h.endswith(".ocr.txt")]
            if hits:
                r = {"text_path": os.path.relpath(hits[0], ROOT)}
        if not r: return None
        p = os.path.join(ROOT, r["text_path"])
    ocr = p[:-4] + ".ocr.txt"
    t = open(p, encoding="utf-8", errors="ignore").read() if os.path.exists(p) else ""
    if len(t.strip()) < 200 and os.path.exists(ocr): t += open(ocr, encoding="utf-8", errors="ignore").read()
    return re.sub(r"\s+", " ", t).lower()
def squash(x):
    return re.sub(r"[^a-z0-9.]+", "", x.lower())
def found(texts, needle):
    n = squash(needle)
    return any(n in squash(t) for t in texts if t)
ap = argparse.ArgumentParser(); ap.add_argument("--sample", type=int, default=19); ap.add_argument("--seed", type=int, default=20261023); ap.add_argument("--all", action="store_true")
a = ap.parse_args()
recs = yaml.safe_load(open(os.path.join(ROOT, "data/blocks.yml")))
random.seed(a.seed); sample = recs if a.all else random.sample(recs, a.sample)
out, tally = [], {"confirmed": 0, "mismatch": 0, "unverifiable": 0}
for r in sample:
    texts = [raw_text(s["url"]) for s in r["sources"]]
    checks = []
    d = (r["location"].get("district") or "").split(" and ")[0].split(",")[0].strip()
    d = {"Palamu": "Palam"}.get(d, d)  # sources spell it Palamu / Palamau
    if d: checks.append(("location.district", d))
    for h in r["auction"]["history"]:
        if h.get("preferred_bidder"):
            checks.append(("auction.preferred_bidder", re.sub(r"^m/s\.?\s*", "", h["preferred_bidder"], flags=re.I).split(" ")[0]))
        if h.get("final_offer_pct") is not None:
            v = h["final_offer_pct"]; checks.append(("auction.final_offer_pct", f"{v:g}"))
    nm = re.sub(r"\(.*?\)", "", r["name"]).split()[0].strip(",")
    checks.append(("name", nm))
    for field, needle in checks:
        texts_ok = [t for t in texts if t]
        if not texts_ok: res = "unverifiable"
        else: res = "confirmed" if found(texts_ok, needle) else "mismatch"
        tally[res] += 1
        out.append({"entity": r["id"], "field": field, "value": needle, "result": res, "checked_by": "verifier", "retrieved": "2026-10-23"})
        if res != "confirmed": print(f"{res.upper():12s} {r['id']:45s} {field:28s} {needle}")
open(os.path.join(ROOT, "research/drafts/l1-verify.evidence.jsonl"), "w").write("".join(json.dumps(x) + "\n" for x in out))
print(len(sample), "records;", tally)
