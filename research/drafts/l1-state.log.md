# L1 Blocks — STATE auctions: research log (researcher)

Started 2026-10-23 (system date checked with `date`: Fri 23 Oct 2026 IST). Written incrementally.

## 1. Anchor verification — NCMM note, 10 Jan 2026
- Fetched `https://mines.gov.in/admin/storage/ckeditor/NCMM%27_1768030756.pdf` → `research/raw/mines.gov.in/ncmm-status-note-2026-01-10.pdf/.txt` (27 pages). Text layer of the state-wise slide (p.25) is scrambled; rendered p.25–26 to PNG and read visually, then matched each number to the text layer.
- VERIFIED (p.25): "59 critical mineral blocks (13 ML, 46 CL) have been auctioned till date across 12 states, out of those 34 blocks auctioned by the Central Govt. and 25 blocks auctioned by the State Govt."
- By state (total = Centre + State): Rajasthan 2 CL (Potash & Halite 2); MP 3 ML 12 CL = 15 (Graphite 7, Phosphorite 3, REE 1, Phosphate 4); Maharashtra 1 ML 1 CL (Ni,Cr,Co 1; Graphite 1); Karnataka 4 CL (Ni,Cr&PGE 1; Co 1; Phosphate 1; Graphite 1); Tamil Nadu 2 CL (Graphite 1, Tungsten 1); Andhra Pradesh 1 CL (Tungsten 1); UP 1 ML 6 CL = 7 (Phosphorite 4, Glauconite 1, REE 1, Phosphate 1); Bihar 3 CL (Glauconite 2, Ni,Cr&PGE 1); Arunachal 4 CL (Graphite & Vanadium 4); Jharkhand 3 ML (Graphite 3); Odisha 4 ML 2 CL (Graphite 6); Chhattisgarh 1 ML 9 CL (Glauconite 2, Ni,Cr&PGE 2, Graphite 3, Lithium 1, Phosphorite 2). Seed values all match.
- p.6: "34 blocks auctioned since April 2024 (Total 59)"; "23 blocks currently under auction"; "100 blocks targeted under NCMM".
- Seed correction: AP's single block is **Tungsten** (Balepalyam, Centre), not cobalt.

## 2. Registry discovery: mines.gov.in "Successful Auction Since 2015"
- LS USQ 316 (27.11.2024) points to `https://mines.gov.in/webportal/content/successful-auction-since-2015`. Page is an Angular SPA: curl/fetch.py returns only the shell (archived as `mom-successful-auction-since-2015.html`, no data).
- Reverse-engineered the SPA bundle (`main.0be1b058d5f079ff.js`): content comes from `POST https://mines.gov.in/admin/api/ManageContent/viewAll` with base64 JSON + HMAC-SHA256 token (key embedded in bundle) and an `Authorization` header of the same shape. Archive versions: `POST /admin/ArchivedContent` (list) and `/admin/archivedContentData` (view). Site search: `/admin/getSearchData`.
- Results (all decoded JSON + text tables archived under `research/raw/mines.gov.in/`, logged in MANIFEST.jsonl with note of the POST payload):
  - `sucessfully-auction-since-2015` (current, created 2025-05-29): **500 blocks (ML-313, CL-187) as on 27.05.2025**, columns: State, Block, Mineral, Date of auction, ML/CL, Area (ha), Reserves (MT), Final bid %, Preferred bidder. → `mom-successful-auction-since-2015-as-on-2025-05-27.txt`
  - archived `successful-auction-since-2015` version 6551 (427 blocks as on 11.11.2024) → `mom-successful-auction-since-2015-archived-2024-11-13.txt`; 45 other archived versions exist (Sep 2023–Nov 2024), not pulled (superseded).
  - `mineral-auction-summary` (2025-05-19), `year-wise-state-wise-auction-summary` (as on 05.05.2025), `successful-auction` (FY2025-26, as on 27.05.2025), ManageAuction state/mineral counts (to 2023-24).
  - Home-page counter (AuctionBlockStatus, updated 2026-10-22): 762 auctioned blocks since 2015, 111 operationalised, 254 deeds executed — i.e. the block-level list (500 as of May 2025) is ~262 blocks stale.
- Yield: 25 state-auctioned Part-D critical blocks + 5 state copper blocks (canonical, non-Part-D) + 6 base-metal/gold-base-metal CLs (borderline, see excluded/questions).

## 3. Reconciliation logic (centre vs state split)
- Central auctions in the MoM list are labelled "Central Government/<State>": 34 rows (S.No 467–500 incl. Ponchi graphite ML, Jharkhand and Vadakhol-Asoli Ni-Cr-Co CL, Maharashtra) = NCMM's 34. Remaining critical-mineral rows labelled with a plain state name = 25 = NCMM's state count. Per-state subtraction matches exactly (table in §6).

## 4. Rows written
- 2026-10-23: MP 12 rows (11 critical + Shitalpani copper); CG 6; UP 3; Odisha 2; Jharkhand 2; Maharashtra 1 critical + 4 copper. Total 30.
