#!/usr/bin/env python3
"""Archive page text captured in a browser, for sites that refuse scripted downloads.

Usage:
  .venv/bin/python -I scripts/research/archive_text.py URL --slug NAME < captured.txt

Writes research/raw/<domain>/<slug>.txt and appends a MANIFEST.jsonl line like fetch.py does,
with status "browser-capture" so the provenance is explicit. Use only for text read verbatim
from the page (e.g. the browser tool's get_page_text output), never for summaries.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from fetch import MANIFEST, RAW, ROOT, slugify  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--slug", required=True)
    a = ap.parse_args()
    from scrub_contacts import scrub
    text = scrub(sys.stdin.read(), plain=True)[0]   # no contact details in the archive
    if len(text.strip()) < 40:
        raise SystemExit("no text on stdin")
    dom = urllib.parse.urlparse(a.url).netloc.lower().replace("www.", "") or "local"
    d = os.path.join(RAW, dom)
    os.makedirs(d, exist_ok=True)
    txtp = os.path.join(d, slugify(a.slug) + ".txt")
    with open(txtp, "w", encoding="utf-8") as f:
        f.write(text)
    data = text.encode("utf-8")
    rec = {
        "url": a.url, "effective_url": a.url, "path": os.path.relpath(txtp, ROOT), "text_path": os.path.relpath(txtp, ROOT),
        "retrieved": dt.date.today().isoformat(), "sha256": hashlib.sha256(data).hexdigest(),
        "status": "browser-capture", "content_type": "text/plain", "bytes": len(data),
    }
    with open(MANIFEST, "a", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        fcntl.flock(f, fcntl.LOCK_UN)
    print(txtp)


if __name__ == "__main__":
    main()
