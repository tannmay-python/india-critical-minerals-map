#!/usr/bin/env python3
"""Check every source URL in data/*.yml and report the ones that no longer resolve.

Usage:
  .venv/bin/python -I scripts/linkcheck.py [--workers 16] [--out research/linkcheck.json]

Each unique URL is fetched with curl (HEAD, then GET if HEAD is refused). Status classes:
  ok        2xx/3xx
  blocked   401/403/429 or a bot wall: the page exists but refuses scripts; check by hand
  dead      404/410, DNS failure or connection refused
  error     timeouts and 5xx; often transient
Every source also has a local archive under research/raw (see MANIFEST.jsonl), so a dead link
never leaves a fact unsupported; the report lists which records cite each dead URL.
"""
import argparse
import concurrent.futures as cf
import glob
import json
import os
import subprocess
from collections import defaultdict

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")


def status(url, timeout):
    for method in (["-I"], []):
        r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-L", "--max-redirs", "8", "-m", str(timeout),
                            "-A", UA, *method, "-w", "%{http_code}", url], capture_output=True, text=True)
        code = int(r.stdout or 0)
        if code and code not in (403, 405, 400, 501):   # some servers refuse HEAD only
            return code, r.returncode
    return code, r.returncode


def classify(code, rc):
    if 200 <= code < 400:
        return "ok"
    if code in (401, 403, 429, 999):
        return "blocked"
    if code in (404, 410) or rc in (6, 7):            # 6: DNS, 7: connection refused
        return "dead"
    return "error"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--timeout", type=int, default=25)
    ap.add_argument("--out", default=os.path.join(ROOT, "research", "linkcheck.json"))
    a = ap.parse_args()

    cited = defaultdict(set)
    for p in sorted(glob.glob(os.path.join(ROOT, "data", "*.yml"))):
        recs = yaml.safe_load(open(p, encoding="utf-8")) or []
        if not isinstance(recs, list):
            continue
        for r in recs:
            for s in (r.get("sources") or []) if isinstance(r, dict) else []:
                if isinstance(s, dict) and s.get("url"):
                    cited[s["url"]].add(r.get("id"))

    urls = sorted(cited)
    results = {}
    with cf.ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(status, u, a.timeout): u for u in urls}
        for f in cf.as_completed(futs):
            u = futs[f]
            code, rc = f.result()
            results[u] = {"code": code, "class": classify(code, rc), "records": sorted(x for x in cited[u] if x)}

    counts = defaultdict(int)
    for v in results.values():
        counts[v["class"]] += 1
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"checked": len(urls), "counts": counts, "results": results}, f, indent=1, sort_keys=True)
    print(f"{len(urls)} URLs: " + ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    for u, v in sorted(results.items()):
        if v["class"] == "dead":
            print(f"DEAD {v['code']} {u}  <- {', '.join(v['records'][:4])}{' …' if len(v['records']) > 4 else ''}")


if __name__ == "__main__":
    main()
