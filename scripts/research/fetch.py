#!/usr/bin/env python3
"""Fetch a source as RAW text and archive it for audit.

Usage:
  .venv/bin/python -I scripts/research/fetch.py URL [--slug NAME] [--print N] [--force]

Saves the original bytes to research/raw/<domain>/<slug>.<ext>, extracts plain
text to research/raw/<domain>/<slug>.txt (PDF via pdfplumber, falling back to
pypdf; HTML via BeautifulSoup), and appends one line to research/raw/MANIFEST.jsonl
(url, path, retrieved, sha256, status, content_type, bytes). The manifest write is
locked so parallel agents can share it.

Prints the path of the .txt file, then the first N characters of text (default 0).
Re-running on the same URL reuses the saved copy unless --force is given.

Known routing:
  - eparlib.sansad.in is unreachable from this machine. Use the sansad.in mirror:
    https://sansad.in/getFile/loksabhaquestions/annex/<session-code>/<FILE>.pdf?source=pqals
    (session code: 18th LS session N -> 18N, e.g. 186 = Winter 2025; 17th LS -> 171..1715).
    scripts/research/sansad_index.py builds a searchable index with direct links.
  - indiacode.nic.in often returns 504; retry later or use another official copy.
"""
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "research", "raw")
MANIFEST = os.path.join(RAW, "MANIFEST.jsonl")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126 Safari/537.36")


def slugify(s, maxlen=90):
    s = re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-")
    return s[:maxlen] or "index"


def guess_slug(url):
    p = urllib.parse.urlparse(url)
    tail = os.path.basename(p.path.rstrip("/")) or "index"
    tail = os.path.splitext(tail)[0]
    q = urllib.parse.parse_qs(p.query)
    known = False
    for k in ("PRID", "prid", "NoteId", "id"):
        if k in q:
            tail = f"{tail}-{k}{q[k][0]}"
            known = True
    if p.query and not known:  # keep distinct URLs distinct (e.g. ?p=43205)
        tail = f"{tail}-{hashlib.sha1(p.query.encode()).hexdigest()[:8]}"
    return slugify(tail)


def curl(url, out, timeout):
    cmd = ["curl", "-sSL", "--compressed", "-m", str(timeout), "-A", UA, "-o", out,
           "-w", "%{http_code}\t%{content_type}\t%{url_effective}", url]
    r = subprocess.run(cmd, capture_output=True, text=True)
    parts = (r.stdout or "").split("\t")
    code = parts[0] if parts else "000"
    ctype = parts[1] if len(parts) > 1 else ""
    eff = parts[2] if len(parts) > 2 else url
    return code, ctype, eff, r.stderr.strip()


def pdf_text(path):
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            pages = [(p.extract_text(layout=True) or "") for p in pdf.pages]
        txt = "\n\f\n".join(pages)
        if txt.strip():
            return txt
    except Exception as e:  # noqa: BLE001
        sys.stderr.write(f"pdfplumber failed: {e}\n")
    import pypdf
    r = pypdf.PdfReader(path)
    return "\n\f\n".join((p.extract_text() or "") for p in r.pages)


def html_text(path):
    from bs4 import BeautifulSoup
    raw = open(path, "rb").read().decode("utf-8", errors="ignore")
    s = BeautifulSoup(raw, "lxml")
    for x in s(["script", "style", "noscript"]):
        x.decompose()
    t = s.get_text("\n")
    t = re.sub(r"[ \t]+", " ", t)
    return re.sub(r"\n\s*\n+", "\n", t)


def xlsx_text(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    out = []
    for ws in wb.worksheets:
        out.append(f"### sheet: {ws.title}")
        for row in ws.iter_rows(values_only=True):
            out.append("\t".join("" if v is None else str(v) for v in row))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--slug")
    ap.add_argument("--print", type=int, default=0, dest="nprint")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--timeout", type=int, default=90)
    a = ap.parse_args()

    dom = urllib.parse.urlparse(a.url).netloc.lower().replace("www.", "") or "local"
    d = os.path.join(RAW, dom)
    os.makedirs(d, exist_ok=True)
    slug = slugify(a.slug) if a.slug else guess_slug(a.url)
    tmp = os.path.join(d, f".{slug}.part")

    existing = [f for f in os.listdir(d) if f.startswith(slug + ".") and not f.endswith(".txt")]
    if existing and not a.force:
        path = os.path.join(d, existing[0])
        txtp = os.path.join(d, slug + ".txt")
        print(txtp)
        if a.nprint and os.path.exists(txtp):
            print(open(txtp, encoding="utf-8", errors="ignore").read()[: a.nprint])
        return

    code, ctype, eff, err = curl(a.url, tmp, a.timeout)
    if code != "200" or not os.path.exists(tmp):
        sys.stderr.write(f"FETCH FAILED {code} {err} {a.url}\n")
        if os.path.exists(tmp):
            os.remove(tmp)
        sys.exit(2)
    head = open(tmp, "rb").read(8)
    if head.startswith(b"%PDF"):
        ext = "pdf"
    elif head.startswith(b"PK"):
        ext = "xlsx" if "sheet" in ctype or a.url.lower().endswith("xlsx") else "zip"
    elif "json" in ctype:
        ext = "json"
    else:
        ext = "html"
    path = os.path.join(d, f"{slug}.{ext}")
    os.replace(tmp, path)
    data = open(path, "rb").read()
    sha = hashlib.sha256(data).hexdigest()

    if ext == "pdf":
        txt = pdf_text(path)
    elif ext == "html":
        txt = html_text(path)
    elif ext == "xlsx":
        txt = xlsx_text(path)
    elif ext == "json":
        txt = data.decode("utf-8", errors="ignore")
    else:
        txt = ""
    txtp = os.path.join(d, slug + ".txt")
    with open(txtp, "w", encoding="utf-8") as f:
        f.write(txt)

    rec = {
        "url": a.url, "effective_url": eff, "path": os.path.relpath(path, ROOT),
        "text_path": os.path.relpath(txtp, ROOT),
        "retrieved": dt.date.today().isoformat(), "sha256": sha,
        "status": int(code), "content_type": ctype, "bytes": len(data),
    }
    with open(MANIFEST, "a", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        fcntl.flock(f, fcntl.LOCK_UN)

    print(txtp)
    if len(txt.strip()) < 200:
        sys.stderr.write("WARNING: very little text extracted (scanned PDF or JS-rendered page?)\n")
    if a.nprint:
        print(txt[: a.nprint])


if __name__ == "__main__":
    main()
