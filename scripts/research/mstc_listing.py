#!/usr/bin/env python3
"""Parse an MSTC mlcl container.jsp listing page into (section, file_id, title, url) rows.
Usage: mstc_listing.py <html> [<html>...]   -> TSV on stdout.
Section = the most recent heading text before the link (e.g. 'TRANCHE VIII').
"""
import html as H, re, sys, urllib.parse
for path in sys.argv[1:]:
    h = open(path, encoding="utf-8", errors="ignore").read()
    h = re.sub(r"(?is)<script.*?</script>|<style.*?</style>", "", h)
    section = ""
    for m in re.finditer(r'(?is)<a[^>]+href="(download_docs\.jsp\?FILE_ID=[^"]+)"[^>]*>(.*?)</a>|>\s*([^<>\s][^<>]{2,79}?)\s*(?=<)', h):
        if m.group(1):
            href = H.unescape(m.group(1))
            fid = re.match(r"download_docs\.jsp\?FILE_ID=(\d+)", href).group(1)
            title = re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", "", m.group(2)))).strip()
            url = "https://www.mstcecommerce.com/auctionhome/" + urllib.parse.quote(href, safe="?=&/._-")
            print(f"{path.split('/')[-1]}\t{section}\t{fid}\t{title}\t{url}")
        else:
            t = H.unescape(m.group(3)).strip()
            if re.match(r"(?i)^(tranche|exploration|offshore|el\b|ml\b|cl\b|critical)", t) and len(t) < 60:
                section = re.sub(r"\s+", " ", t)
