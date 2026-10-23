#!/usr/bin/env python3
"""Keyword-in-context over raw text files: unique snippets around canonical-mineral words.
Usage: kwic.py [--kw REGEX] [--w N] [--max M] FILE..."""
import argparse, re
ap = argparse.ArgumentParser()
ap.add_argument("files", nargs="+")
ap.add_argument("--kw", default=r"graphite|phosphor|\bPGE\b|platinum|copper|vanadium|\bREE\b|rare earth|nickel|cobalt|glauconit|molybden|tungsten|lithium|titanium|zircon|potash|\btin\b")
ap.add_argument("--w", type=int, default=60)
ap.add_argument("--max", type=int, default=8)
a = ap.parse_args()
rx = re.compile(a.kw, re.I)
for f in a.files:
    t = re.sub(r"\s+", " ", open(f, encoding="utf-8", errors="ignore").read())
    seen, out = set(), []
    for m in rx.finditer(t):
        s = t[max(0, m.start() - a.w): m.end() + a.w]
        k = s[a.w - 20: a.w + 40].lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(s)
    print(f"=== {f.split('/')[-1][:90]} ({len(out)} snippets)")
    for s in out[: a.max]:
        print("   ", s)
