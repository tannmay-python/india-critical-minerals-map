# Geodata sources, licences and provenance

Built by `scripts/build-reference-geodata.py` from the raw downloads in `research/raw/geodata/` (large files are gitignored; checksums below). Retrieved 2026-10-23. Full build log: `research/drafts/l0-geodata.log.md`.

| Output | Source | Licence | Raw file (sha256) |
|---|---|---|---|
| `india-boundary.geojson` | DataMeet `maps/Country/india-composite.geojson` — "land area of India including disputed territories in accordance with the Official boundary of India as per the Survey of India". Same file Pranay Kotasthane's India Semiconductor Tracker uses (`data/shp/datameet/india-composite.geojson`, byte-identical, 10,761,294 B). | CC-0 (per DataMeet `Country/README.md`) | `pranay/india-composite.geojson` `5e44c39b18aa8fe57267d8018fa4ad4a10eaa3aa4cb7cb7382a1813ef8eb8c53` |
| `states.geojson` | DataMeet `maps/States/Admin2.shp` (36 states/UTs; updated Jan 2020 for the DNH & DD merger and Aug 2021 for Ladakh and J&K per the latest SoI map), clipped and reconciled to the official outline (union of states = outline). | CC BY 4.0 (DataMeet `maps` README: "Unless explicitly stated, all datasets in this repository is shared under CC BY 4.0") | `datameet/States/Admin2.shp` `b61ebc11a7487ce1c340d55fc9d0c1a2b63af1f73191fef691c11693c726130d` |
| `districts.geojson` | DataMeet / Guneet Narula `indian-district-boundaries`, `india-districts-2019-734.json` (734 districts recognised by GoI in 2019, except Saitual), plus state-wise corrections (Chhattisgarh, Mizoram, Tamil Nadu, Sikkim); reconciled to `states.geojson`. 735 features. Districts created after 2019 are **missing**; the property `source_year` records the vintage per feature. District-centroid fallbacks for newer districts use the parent 2019 district and say so in `notes`. | MIT (`idb_LICENSE`, © 2020 Guneet Narula) | `datameet/india-districts-2019-734.json` `115c895755d7c0a4bda0636acf4e95526d0121c67f56ffe4668ee85ff3952ed9` |
| `world-ind-pov.geojson` | Natural Earth v5.1.1 `ne_10m_admin_0_countries_ind` (India point-of-view edition; the IND POV exists only at 10m), with India's polygon replaced by the official outline. | Public domain (Natural Earth terms of use) | `naturalearth/ne_10m_admin_0_countries_ind.geojson` `3e67a5a6ddeff3247ca8400cd2514fd4a5ac6e5432823b25d610a7028597d45f` |
| `eez-india.geojson` | Marine Regions, Maritime Boundaries v12 (2023), layer `eez`, sovereign India (mainland EEZ, mrgid 8480; Andaman & Nicobar EEZ, mrgid 8333), via WFS. **Used only by `scripts/geocheck.py` to test offshore points; never displayed.** | CC BY 4.0 (Marine Regions disclaimer: licensed under CC-BY since Maritime Boundaries v11) | `marineregions/eez_india_wfs.json` `d391da62b94827457b6eec8fed6065365b9a009fe4bbff6bc5cc07f40e99cc2c` |
| `web/*.geojson` | Topology-preserving simplifications of the above (mapshaper), coordinates rounded to 5 decimals. | as above | — |

## Attribution strings for the app footer
- Boundaries: "Official boundary of India: DataMeet (CC0), Survey of India depiction. States: DataMeet (CC BY 4.0). Districts: DataMeet / Guneet Narula (MIT)."
- World: "Natural Earth (public domain), India point-of-view edition."
- Basemap: "© OpenStreetMap contributors · OpenFreeMap · OpenMapTiles" (boundary and country/state label layers removed).

## Known linework differences (logged, not hidden)
The SoI-derived state polygons and the LSIB/Alhasan-derived composite outline differ by about 10,000 km² of slivers, mostly along the China border, the Gulf of Kutch and the Sundarbans. States were clipped to the composite and slivers assigned to the neighbouring state, so the union of states equals the official outline exactly.

Point-in-outline test (2026-10-23, Nominatim points): Gilgit (35.921, 74.314), Skardu (35.287, 75.655), Muzaffarabad (34.373, 73.470) and Aksai Chin (34.690, 79.081) fall inside the official outline; Tawang and Itanagar fall inside Arunachal Pradesh; controls Lahore and Kathmandu fall outside.
