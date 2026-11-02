#!/usr/bin/env python3
"""Remove email addresses and phone numbers from archived source text.

Usage:
  .venv/bin/python -I scripts/research/scrub_contacts.py            # all .txt/.html under research/raw
  .venv/bin/python -I scripts/research/scrub_contacts.py FILE ...   # only these files
  add --dry-run to list what would change

Official documents (inspection reports, tender notices, registries) print officers' and
lessees' mobile numbers and emails; the archive keeps none of them. Each match becomes
"[email removed]" or "[phone removed]". A bare 10-digit number counts as a mobile only next
to a phone label, a +91 prefix or an email, so figures in statistical tables are left alone.
MANIFEST.jsonl keeps the sha256 of the original download, so the archived copy is a redacted
copy of that file. A file is left unwritten if scrubbing would break a cited evidence excerpt.
Run after fetch.py and before committing.
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from build_entities import squash  # noqa: E402
from fetch import RAW, ROOT  # noqa: E402

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.(?!(?:png|jpe?g|gif|svg|webp|js|css)\b)[A-Za-z]{2,}")
LABEL = (r"(?:[Pp]hone|PHONE|Ph|PH|[Tt]el(?:ephone)?|TEL(?:EPHONE)?|[Ff]ax|FAX|[Mm]ob(?:ile)?|MOB(?:ILE)?"
         r"|[Mm]o\.?\s*[Nn]o|[Cc]ell\s*[Nn]o|[Cc]ontact\s*(?:[Nn]o|[Nn]umber)|WhatsApp(?:\s*[Nn]umber)?)")
# A number written right after a phone-type label (landlines with STD codes, fax, mobiles).
LABELLED = re.compile(r"(\b" + LABEL + r"\b[^0-9A-Za-z\n]{0,6})(\+?\(?\d[\d\s()/-]{5,}\d)")
# Indian mobile numbers: 10 digits from 6-9, optional +91/0 prefix, optional 5+5 split.
MOBILE = re.compile(r"(?<![\w/.-])(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\w/-])")
NEAR_LABEL = re.compile(LABEL + r"|\+91|\[email removed\]|\[phone removed\]|ഫോൺ|फोन|दूरभाष")
EMAILWORD = re.compile(r"(?i)\be-?mail\b")
EMAIL_TOKEN, PHONE_TOKEN = "[email removed]", "[phone removed]"


def scrub(text: str, plain: bool = False) -> tuple[str, int]:
    """plain=True (extracted .txt) also removes a lone 10-digit mobile number in a line that is
    not a row of figures; .html keeps only label-, prefix- or email-adjacent numbers."""
    n = 0
    text, k = EMAIL.subn(EMAIL_TOKEN, text)
    n += k

    def lab(m):
        nonlocal n
        if sum(c.isdigit() for c in m.group(2)) < 8:
            return m.group(0)
        n += 1
        return m.group(1) + PHONE_TOKEN

    text = LABELLED.sub(lab, text)

    for _ in range(3):   # repeat so a second number after "[phone removed] /" is caught
        changed = 0

        def mob(m, t):
            nonlocal n, changed
            g = m.group(0)
            before, after = t[max(0, m.start() - 80):m.start()], t[m.end():m.end() + 60]
            near = g.startswith("+91") or NEAR_LABEL.search(before) or EMAIL_TOKEN in after or EMAILWORD.search(after)
            if not near and plain and not re.search(r"\s", g):
                a, b = t.rfind("\n", 0, m.start()) + 1, t.find("\n", m.end())
                line = t[a:b if b >= 0 else len(t)]
                near = len(re.findall(r"\d{3,}", line)) <= 2 and "**" not in line
            if near:
                n += 1
                changed += 1
                return PHONE_TOKEN
            return g

        t0 = text
        text = MOBILE.sub(lambda m: mob(m, t0), text)
        if not changed:
            break
    return text, n


def excerpts_by_raw() -> dict:
    out = {}
    for p in glob.glob(os.path.join(ROOT, "research", "**", "*.evidence.jsonl"), recursive=True) + \
            glob.glob(os.path.join(ROOT, "research", "evidence", "*.jsonl")):
        for line in open(p, encoding="utf-8"):
            if line.strip():
                e = json.loads(line)
                if e.get("raw_path") and e.get("excerpt"):
                    out.setdefault(os.path.normpath(os.path.join(ROOT, e["raw_path"])), set()).add(e["excerpt"])
    return out


def main():
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry = "--dry-run" in sys.argv
    files = args or sorted(glob.glob(os.path.join(RAW, "**", "*.txt"), recursive=True)
                           + glob.glob(os.path.join(RAW, "**", "*.html"), recursive=True))
    cited = excerpts_by_raw()
    total, held = 0, []
    for p in files:
        with open(p, encoding="utf-8", errors="ignore") as f:
            t = f.read()
        s, n = scrub(t, plain=p.endswith(".txt"))
        if not n:
            continue
        sq_t, sq_s = squash(t), squash(s)
        broken = [e for e in cited.get(os.path.normpath(os.path.abspath(p)), ()) if squash(e) in sq_t and squash(e) not in sq_s]
        if broken:
            held.append((p, broken))
            continue
        total += n
        print(f"{n:5d}  {os.path.relpath(p, ROOT)}")
        if not dry:
            with open(p, "w", encoding="utf-8") as f:
                f.write(s)
    for p, broken in held:
        print(f"HELD  {os.path.relpath(p, ROOT)}: scrubbing would break {len(broken)} excerpt(s), e.g. {broken[0][:70]!r}")
    print(f"{total} contact details {'would be ' if dry else ''}removed; {len(held)} file(s) held")


if __name__ == "__main__":
    main()
