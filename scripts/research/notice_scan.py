#!/usr/bin/env python3
"""For each keyword, list fetched MSTC notices mentioning it with dated outcome lines.
Usage: notice_scan.py KEYWORD [KEYWORD...]
Prints file, notice date (first date found), and lines with 'preferred bidder', 'annul', 'nil bid', 'technically qualified'."""
import glob, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
files = glob.glob(os.path.join(ROOT, "research/raw/mstcecommerce.com/*.txt"))
DATE = re.compile(r"(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})")
OUT = re.compile(r"(?i)preferred bidder|annul|nil bid|no bid|technically qualified|final price offer|declared")
for kw in sys.argv[1:]:
    print(f"##### {kw}")
    for f in sorted(files):
        name = os.path.basename(f)
        if re.search(r"(?i)summ|mbs|model|tender-doc|blank", name):
            continue
        t = open(f, encoding="utf-8", errors="ignore").read()
        if kw.lower() not in t.lower():
            continue
        flat = re.sub(r"\s+", " ", t)
        d = DATE.search(flat)
        hits = []
        for m in re.finditer(re.escape(kw), flat, re.I):
            seg = flat[max(0, m.start() - 160): m.end() + 220]
            if OUT.search(seg):
                hits.append(seg)
        print(f"  {name[:95]} | {d.group(0) if d else '?'}")
        for h in hits[:2]:
            print(f"      … {h[:380]}")
