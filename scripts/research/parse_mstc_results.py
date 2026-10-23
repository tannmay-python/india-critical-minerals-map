#!/usr/bin/env python3
"""Parse MSTC 'Critical Mineral Block Auction Results' page text (fetched by fetch.py) into CSV rows.
Usage: parse_mstc_results.py <txt> [<txt>...]  -> CSV on stdout
Each result row on the page is 10 lines after a serial number: name, auction no, concession,
state, NIT date, auction start, auction close, preferred bidder, MSTC reg no, final price offer.
"""
import csv, re, sys
w = csv.writer(sys.stdout)
w.writerow(["file", "sl", "block", "auction_no", "concession", "state", "nit_date", "auction_start", "auction_close",
            "preferred_bidder", "mstc_reg", "final_offer"])
for path in sys.argv[1:]:
    lines = [l.strip() for l in open(path, encoding="utf-8") if l.strip()]
    try:
        i = lines.index("Final Price Offer") + 1
    except ValueError:
        continue
    while i < len(lines):
        if not re.fullmatch(r"\d+", lines[i]):
            break
        chunk = lines[i:i + 11]
        if len(chunk) < 11 or not chunk[2].startswith("MSTC/"):
            break
        w.writerow([path.split("/")[-1]] + chunk)
        i += 11
