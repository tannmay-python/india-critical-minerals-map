# L3b research log: electrolyte salts/solvents, additives, separators, Cu/Al foil, conductive additives, binders

Researcher agent, started 2026-10-23 (system date `Fri Oct 23 2026 IST`). Data file target: `materials.yml`. Saved incrementally.

Yield = number of NEW in-scope L3b entities first surfaced by that query/registry.

## Network / tool notes
- 2026-10-23 00:30 IST: WebSearch tool hit a session limit ("resets 3:50am"). Switched discovery to curl-based Bing RSS (`bing.com/search?format=rss`) via a scratch helper, plus direct registry/IR fetches. All facts still read from `fetch.py` raw text.

## Registries

| # | Date | Registry / query | Result | Yield |
|---|---|---|---|---|
| R1 | 2026-10-23 | Lok Sabha local index (`sansad_index.py search "electrolyte\|separator\|copper foil\|aluminium foil\|battery material\|acetylene\|ECMS\|Electronics Component Manufacturing"`) | 1 hit (USQ 1702, 10 Dec 2025, ECMS tranche 2 totals) | 0 |
| R2 | 2026-10-23 | LS index `"battery\|batteries\|lithium\|component manufactur\|electronic component\|foil\|fluoro\|carbon black"` | 29 hits; fetched USQ 1521 (28 Jul 2026, MHI: CAM, AAM, separators, electrolytes and foils "largely imported"), USQ 3696, USQ 510, USQ 2833, USQ 4164, SQ 126. No named L3b plants. | 0 |
| R3 | 2026-10-23 | LS index MeitY `"component\|ECMS\|electronics manufactur"` | 8 hits; USQ 1702 confirms T2 = 17 approvals, 24 cumulative, ₹12,704 cr | 0 |
| R4 | 2026-10-23 | **ECMS round 1** PIB 2182986 + backgrounder 2183028 (27 Oct 2025): 7 projects, ₹5,532 cr; products PCB, HDI PCB, camera module, CCL, polypropylene (capacitor) film | No battery-material project (PP film is capacitor film, not separator; CCL is PCB laminate) | 0 |
| R5 | 2026-10-23 | **ECMS round 2** PIB 2190872 (17 Nov 2025): 17 projects, ₹7,172 cr | No battery-material project | 0 |
| R6 | 2026-10-23 | **ECMS round 3** PIB 2210864 (2 Jan 2026): 22 projects, ₹41,863 cr; 46 cumulative, ₹54,567 cr | Anode (NPSPL) = L3a hand-off; Hindalco approval is aluminium *extrusion* for phone enclosures, not battery foil; ATL Li-ion cell = L9 | 0 |
| R7 | 2026-10-23 | **ECMS round 4** PIB 2247040 (30 Mar 2026): 29 projects, ₹7,104 cr; 75 cumulative, ₹61,671 cr | REPM (Lohum) = L2; Munoth Li-ion cell = L9; no L3b project | 0 |
| R8 | 2026-10-23 | **ECMS round 5** PIB 2300625 (17 Aug 2026) + MeitY deck (Google Drive link in release, 16 pp): 31 projects, ₹6,844 cr (+₹1,033 cr Wipro top-up = ₹7,877 cr); 106 cumulative, 15 states, ₹69,548 cr | **PCBL Chemical (acetylene black, ₹329 cr)**, **Acutaas Chemicals (electrolyte additives, ₹119 cr)**; Epsilon C2GR anode = L3a hand-off; Quantum Magnetics = L2 | 2 |
| R9 | 2026-10-23 | PIB backgrounder 2222519 (3 Feb 2026): tranche table T1 7 (27 Oct 2025), T2 17, T3 22; ECMS outlay raised to ₹40,000 cr | Anchor confirmation | 0 |

ECMS anchor: 5 rounds, 7 + 17 + 22 + 29 + 31 = 106 applications, ₹69,548 cr, 15 states (PIB 2300625). L3b-relevant: 2 of 106.

## Query log (discovery)

| # | Date | Type | Query | Yield (new L3b entities) |
|---|---|---|---|---|
| Q1 | 2026-10-23 | registry | WebSearch "ECMS approval tranche MeitY ... 2026 PIB" | 0 (located tranche releases) |
| Q2 | 2026-10-23 | snowball | WebSearch "ECMS approvals PCBL acetylene black Acutaas electrolyte additives approval MeitY" | 0 (confirms R8 names; Acutaas Jhagadia lead) |
| Q3 | 2026-10-23 | registry | WebSearch "ECMS 106 projects 69,548 crore approved tranche" | 0 |
| Q4 | 2026-10-23 | registry | WebSearch site:pib.gov.in ECMS 31 proposals Aug 2026 | 0 |
| Q5 | 2026-10-23 | registry | WebSearch site:pib.gov.in ECMS 29 proposals | 0 |
