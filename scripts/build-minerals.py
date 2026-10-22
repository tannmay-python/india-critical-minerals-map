#!/usr/bin/env python3
"""Build data/reference/minerals.yml from the dashboard's own data files.

Inputs (archived copies of https://indiacriticalminerals.com, see research/raw/MANIFEST.jsonl):
  research/raw/indiacriticalminerals.com/minerals_data.json      -> the 51 canonical names
  research/raw/indiacriticalminerals.com/group_assignments.json  -> dashboard group id per mineral
  research/raw/indiacriticalminerals.com/criteria_data.json      -> group labels and colours
  research/raw/indiacriticalminerals.com/app.js                  -> PT_ELEMENTS (element symbols)

Official-list membership is cross-checked against:
  GoI 30 critical minerals: PIB PRID 1942027 (24 Jul 2023)  research/raw/pib.gov.in/pib-1942027.txt
  MMDR Act First Schedule Part D (24 minerals): Lok Sabha USQ 442, 24 Jul 2024
                                   research/raw/eparlib.sansad.in/LS-AU442-2024.txt
Re-run after any dashboard update: .venv/bin/python -I scripts/build-minerals.py
"""
import json
import os
import re

import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "research", "raw", "indiacriticalminerals.com")

REE = ["Lanthanum", "Cerium", "Praseodymium", "Neodymium", "Promethium", "Samarium", "Europium",
       "Gadolinium", "Terbium", "Dysprosium", "Holmium", "Erbium", "Thulium", "Ytterbium",
       "Lutetium", "Yttrium", "Scandium"]
PGE = ["Platinum", "Palladium", "Rhodium", "Ruthenium", "Iridium", "Osmium"]

# GoI list names exactly as printed in PIB 1942027; "REE" and "PGE" expand to member elements.
GOI_30 = ["Antimony", "Beryllium", "Bismuth", "Cobalt", "Copper", "Gallium", "Germanium", "Graphite",
          "Hafnium", "Indium", "Lithium", "Molybdenum", "Niobium", "Nickel", "PGE", "Phosphorous",
          "Potash", "REE", "Rhenium", "Silicon", "Strontium", "Tantalum", "Tellurium", "Tin",
          "Titanium", "Tungsten", "Vanadium", "Zirconium", "Selenium", "Cadmium"]
# Part D as tabulated in LS USQ 442 Annexure-I (names normalised to dashboard names).
# "Glauconite" is listed there as "Included in Potash"; "Rock Phosphate" maps to Phosphorus.
PART_D = ["Beryllium", "Cadmium", "Cobalt", "Gallium", "Glauconite", "Graphite", "Indium", "Lithium",
          "Molybdenum", "Nickel", "Niobium", "Rock Phosphate", "PGE", "Potash", "REE", "Rhenium",
          "Selenium", "Tantalum", "Tellurium", "Tin", "Titanium", "Tungsten", "Vanadium", "Zirconium"]

LIST_ALIAS = {"Phosphorous": "Phosphorus", "Rock Phosphate": "Phosphorus", "Glauconite": "Potash"}

# Search synonyms: ore minerals, products and spellings used in Indian sources.
# These are discovery aids for the query matrix, not factual claims.
SYNONYMS = {
    "Antimony": ["Sb", "stibnite", "antimonial lead"],
    "Beryllium": ["Be", "beryl", "beryllium-bearing minerals"],
    "Bismuth": ["Bi"],
    "Cadmium": ["Cd"],
    "Cobalt": ["Co", "cobalt hydroxide", "cobalt sulphate", "cobalt sulfate"],
    "Copper": ["Cu", "copper cathode", "copper concentrate", "chalcopyrite", "copper foil"],
    "Gallium": ["Ga", "Bayer liquor gallium"],
    "Germanium": ["Ge"],
    "Graphite": ["natural graphite", "synthetic graphite", "flake graphite", "anode material",
                 "spherical graphite", "graphite anode"],
    "Hafnium": ["Hf"],
    "Indium": ["In", "ITO"],
    "Lithium": ["Li", "spodumene", "lepidolite", "lithium carbonate", "lithium hydroxide", "LCE",
                "lithium brine", "Li-ion"],
    "Molybdenum": ["Mo", "molybdenite", "ferro-molybdenum"],
    "Niobium": ["Nb", "columbite", "columbite-tantalite"],
    "Nickel": ["Ni", "nickel sulphate", "nickel sulfate", "pentlandite", "MHP"],
    "Phosphorus": ["P", "rock phosphate", "phosphorite", "apatite", "phosphorous"],
    "Potash": ["K", "potassium", "glauconite", "sylvite", "polyhalite", "muriate of potash", "MOP"],
    "Rhenium": ["Re"],
    "Selenium": ["Se", "anode slime"],
    "Silicon": ["Si", "silicon metal", "polysilicon", "metallurgical-grade silicon", "ingot", "wafer",
                "ferro-silicon", "high-purity quartz"],
    "Strontium": ["Sr", "celestite"],
    "Tantalum": ["Ta", "tantalite", "coltan"],
    "Tellurium": ["Te", "anode slime"],
    "Tin": ["Sn", "cassiterite"],
    "Titanium": ["Ti", "ilmenite", "rutile", "leucoxene", "TiO2", "titanium dioxide", "titanium sponge",
                 "titanium slag", "heavy mineral sands", "beach sand"],
    "Tungsten": ["W", "wolframite", "scheelite", "tungsten carbide", "APT"],
    "Vanadium": ["V", "V2O5", "vanadium pentoxide", "ferro-vanadium", "vanadiferous magnetite"],
    "Zirconium": ["Zr", "zircon", "zirconia"],
    "Neodymium": ["Nd", "NdFeB", "NdPr", "rare earth magnet"],
    "Praseodymium": ["Pr", "NdPr", "didymium"],
    "Dysprosium": ["Dy", "heavy rare earth"],
    "Terbium": ["Tb", "heavy rare earth"],
    "Samarium": ["Sm", "SmCo"],
    "Yttrium": ["Y", "xenotime"],
    "Scandium": ["Sc"],
}
for el in REE:
    SYNONYMS.setdefault(el, []).extend(["REE", "rare earth", "rare earth elements", "monazite"])
for el in PGE:
    SYNONYMS.setdefault(el, []).extend(["PGE", "PGM", "platinum group"])


def main():
    minerals = [m["mineral"] for m in json.load(open(os.path.join(RAW, "minerals_data.json")))["minerals"]]
    groups_of = json.load(open(os.path.join(RAW, "group_assignments.json")))
    groups = {g["id"]: g for g in json.load(open(os.path.join(RAW, "criteria_data.json")))["groups"]}
    appjs = open(os.path.join(RAW, "app.js"), encoding="utf-8").read()
    pt = dict((name, sym) for sym, name in re.findall(r'\[\d+,"([A-Za-z]{1,2})","([A-Za-z]+)"', appjs))
    pt_alias = {"Graphite": "Carbon", "Potash": "Potassium"}  # PT_GROUP_ALIAS in app.js, reversed

    assert len(minerals) == 51, len(minerals)
    assert set(minerals) == set(groups_of), set(minerals) ^ set(groups_of)

    def expand(lst):
        out = set()
        for x in lst:
            x = LIST_ALIAS.get(x, x)
            out |= set(REE) if x == "REE" else set(PGE) if x == "PGE" else {x}
        return out
    goi, part_d = expand(GOI_30), expand(PART_D)
    assert goi == set(minerals), goi ^ set(minerals)

    rows = []
    for name in minerals:
        gid = groups_of[name]
        rows.append({
            "name": name,
            "symbol": pt[pt_alias.get(name, name)],
            "dashboard_group": {"id": gid, "label": groups[gid]["name"], "color": groups[gid]["color"]},
            "family": "REE" if name in REE else "PGE" if name in PGE else None,
            "synonyms": SYNONYMS.get(name, []),
            "dashboard_url": f"https://indiacriticalminerals.com/#mineral/{name}",
            "lists": {"goi_critical_2023": name in goi, "mmdr_part_d": name in part_d},
        })
    rows.sort(key=lambda r: (r["dashboard_group"]["id"] or 99, r["name"]))

    # Owner decision 2026-10-23 (research/LOG.md D-001): when a source says only "REE" or
    # "PGE" without naming elements, tag the umbrella. Not dashboard minerals: no deep link of
    # their own; the app expands them to `members` for the mineral lens and chips.
    for name, members, syn in (
        ("Rare earths (unspecified)", REE, ["REE", "rare earth", "rare earth elements", "REO", "monazite"]),
        ("PGEs (unspecified)", PGE, ["PGE", "PGM", "platinum group elements", "platinum group metals"]),
    ):
        rows.append({
            "name": name, "symbol": None, "dashboard_group": None, "family": "REE" if members is REE else "PGE",
            "synonyms": syn, "dashboard_url": None, "umbrella": True, "members": members,
            "lists": {"goi_critical_2023": True, "mmdr_part_d": True},
        })

    header = (
        "# Canonical mineral list for the India Critical Minerals Project Map.\n"
        "# GENERATED by scripts/build-minerals.py from the archived data files of\n"
        "# https://indiacriticalminerals.com (retrieved 2026-10-22). Do not hand-edit.\n"
        "# Names match the dashboard exactly; dashboard_url is the per-mineral deep link.\n"
        "# lists.goi_critical_2023: Ministry of Mines list of 30 (PIB PRID 1942027, 24 Jul 2023),\n"
        "#   with 'REE' and 'PGE' expanded to member elements -> exactly these 51.\n"
        "# lists.mmdr_part_d: MMDR Act First Schedule Part D, 24 entries (Lok Sabha USQ 442,\n"
        "#   24 Jul 2024, Annexure-I). Glauconite (Part D) is tagged Potash; Rock Phosphate is Phosphorus.\n"
        "#   Coking coal was reportedly added to Part D in Jan 2026; it is not on the dashboard list\n"
        "#   and is excluded (owner decision D-004).\n"
        "# The last two entries are UMBRELLA tags (umbrella: true), used only when a source says\n"
        "# 'REE'/'PGE' without naming elements (owner decision D-001). They have no dashboard page.\n"
    )
    out = os.path.join(ROOT, "data", "reference", "minerals.yml")
    with open(out, "w", encoding="utf-8") as f:
        f.write(header)
        yaml.safe_dump({"minerals": rows}, f, sort_keys=False, allow_unicode=True, width=110)
    print(f"wrote {len(rows)} entries (51 minerals + 2 umbrellas) -> {os.path.relpath(out, ROOT)}")
    print("not in Part D:", sorted(set(minerals) - part_d))


if __name__ == "__main__":
    main()
