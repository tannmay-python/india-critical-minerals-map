#!/usr/bin/env python3
"""Build and search a local index of Lok Sabha questions (sansad.in API).

The sansad.in API ignores its filter parameters, so this pulls whole sessions and
filters locally. Each session index is cached at research/raw/sansad.in/ls-index-<L>-<S>.json.

Usage:
  .venv/bin/python -I scripts/research/sansad_index.py pull --lok 18 --sessions 1-7
  .venv/bin/python -I scripts/research/sansad_index.py pull --lok 17 --sessions 12-15
  .venv/bin/python -I scripts/research/sansad_index.py search "graphite|lithium|critical mineral" [--ministry MINES]

search prints: date | type+number | ministry | subject | PDF link (sansad.in mirror).
Fetch a hit with scripts/research/fetch.py <link>.
"""
import argparse
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
D = os.path.join(ROOT, "research", "raw", "sansad.in")
API = "https://sansad.in/api_ls/question/qetFilteredQuestionsAns"


def pull(lok, session):
    out = os.path.join(D, f"ls-index-{lok}-{session}.json")
    url = f"{API}?loksabhaNo={lok}&sessionNumber={session}&pageNo=1&locale=en&pageSize=10000"
    r = subprocess.run(["curl", "-s", "-m", "180", "-A", "Mozilla/5.0", url],
                       capture_output=True, text=True)
    try:
        data = json.loads(r.stdout)
        qs = data[0]["listOfQuestions"]
    except Exception:  # noqa: BLE001
        print(f"lok {lok} session {session}: no data", file=sys.stderr)
        return 0
    slim = [{
        "lok": lok, "session": session, "no": q.get("quesNo"), "type": q.get("type"),
        "date": q.get("date"), "ministry": q.get("ministry"),
        "subject": (q.get("subjects") or "").strip(), "members": q.get("member"),
        "pdf": q.get("questionsFilePath"),
    } for q in qs]
    os.makedirs(D, exist_ok=True)
    json.dump(slim, open(out, "w"), ensure_ascii=False)
    print(f"lok {lok} session {session}: {len(slim)} questions -> {os.path.relpath(out, ROOT)}")
    return len(slim)


def search(pattern, ministry=None):
    rx = re.compile(pattern, re.I)
    rows = []
    for f in sorted(os.listdir(D)):
        if not f.startswith("ls-index-"):
            continue
        for q in json.load(open(os.path.join(D, f))):
            if ministry and ministry.lower() not in (q["ministry"] or "").lower():
                continue
            if rx.search(q["subject"] or ""):
                rows.append(q)

    def key(q):
        d = q["date"] or "00.00.0000"
        dd, mm, yy = d.split(".")
        return yy + mm + dd
    for q in sorted(rows, key=key, reverse=True):
        print(f'{q["date"]} | {q["type"][:1]}{q["no"]} | {q["ministry"]} | {q["subject"][:90]} | {q["pdf"]}')
    print(f"-- {len(rows)} hits", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("pull")
    p.add_argument("--lok", type=int, required=True)
    p.add_argument("--sessions", required=True, help="e.g. 1-7 or 3")
    s = sub.add_parser("search")
    s.add_argument("pattern")
    s.add_argument("--ministry")
    a = ap.parse_args()
    if a.cmd == "pull":
        lo, _, hi = a.sessions.partition("-")
        for n in range(int(lo), int(hi or lo) + 1):
            pull(a.lok, n)
    else:
        search(a.pattern, a.ministry)


if __name__ == "__main__":
    main()
