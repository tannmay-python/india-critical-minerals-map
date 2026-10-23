# L0 geodata log (Phase 0, boundaries)

Agent: geodata engineer subagent. Date: 2026-10-23 (system clock, IST). Build script: `scripts/build-reference-geodata.py`.
Raw downloads: `research/raw/geodata/` (sha256 in `data/reference/ATTRIBUTION.md`).

## 2026-10-23 — sources inspected

| Query / fetch | Result |
|---|---|
| `gh api repos/pranaykotas/india-semiconductor-tracker/contents/data/shp/datameet` | 1 file, `india-composite.geojson`, 10,761,294 bytes, added in commit a9d61ba8 (2026-04-03). |
| raw download of that file | 1 Feature, empty properties, MultiPolygon of 80 polygons, CRS84. **Outline only (no states).** bbox 68.16239–97.39536 E, 6.75292–37.09759 N; geodesic area 3,270,564 km². |
| Pranay's `index.qmd` | `st_read("data/shp/datameet/india-composite.geojson")` then `addPolygons(color="#620d3c", weight=2, fillOpacity=0.1, group="Official Boundary")` over a CARTO raster basemap. He draws the outline only; his basemap supplies state lines. Repo also holds `data/shp/India_Country_Boundary.shp` (byte-identical size to DataMeet's SoI `IndiaBoundary.shp`), unused by the map. |
| `gh api repos/datameet/maps/git/trees/master` | `Country/india-composite.geojson` is the same size (10,761,294 B) — Pranay's file is DataMeet's file. Also `States/Admin2.shp` (36 states/UTs), `Survey-of-India-Index-Maps/StateBoundary` (SoI download, 2018, pre-2019 J&K, 37 features), `Districts/Census_2011` (640). |
| datameet/maps `Country/README.md` | composite = "land area of India including disputed territories in accordance with the Official boundary of India as per the Survey of India"; built from LSIB (Aksai Chin/China border), Alhasan Pakistan admin (PoK), NE breakaway (Shaksgam). Licence stated: **CC-0**. Repo README: data CC BY 4.0 unless stated; code MIT. |
| datameet/maps commit history `States/` | 2020-05-06 "Updated the States & UT to status as per Jan 2020 (#50)" (DNH&DD merger); 2021-08-24 "Updated Ladhak & J&K boundry as per latest SOI Map (#70)"; 2021-10-25 "Merged the two Ladhak features (#73)". → Admin2 is the current 28+8 set. |
| datameet org repo list | `indian-district-boundaries` (Guneet Narula, MIT, 2020): `india-districts-2019-734.json` (734 districts, "all districts recognized by GoI in 2019 except Saitual"), state-wise files later corrected (CG adds Gaurela-Pendra-Marwahi 2020-05-27; Mizoram "Aizawal"→"Aizawl"; Sikkim double space). `India_Official_Boundaries_2019` (no licence file) not used. |
| nvkelso/natural-earth-vector tree + naciscdn HEAD | IND POV exists **only at 10m**: `ne_10m_admin_0_countries_ind` (v5.1.1). `ne_50m_admin_0_countries_ind.zip` and `ne_110m_..._ind.zip` → HTTP 403 (do not exist). Licence: public domain (LICENSE.md). |
| Marine Regions WFS (geo.vliz.be) `MarineRegions:eez` sovereign1='India' | 2 features: Indian EEZ (mrgid 8480, 1,659,500 km²), Indian EEZ (Andaman and Nicobar Islands) (mrgid 8333, 664,448 km²). Layer title "Exclusive Economic Zones (200 NM) (v12, world, 2023)". sovereign2/3='India' → 0 features (no joint regime/overlapping-claim polygon with India as party). `eez_internal_waters` → 1 feature (Indian Internal Waters, 119,669 km²). |
| marineregions.org/disclaimer.php | "Marine Regions' products have been licensed under CC-BY since Maritime Boundaries version 11 (2019)"; requests (not licence terms) users not to redistribute downloads and to inform info@marineregions.org of use. |

## Comparison of candidate state layers with the official outline (geodesic km²)

| Layer | Features | Union area | Outline minus union (gaps) | Union minus outline (overhang) |
|---|---|---|---|---|
| DataMeet `States/Admin2` | 36 | 3,270,090 | 10,584 (13,248 parts; 468 km² in parts <1 km²) | 10,110 (13,516 parts) |
| DataMeet SoI `StateBoundary` (2018) | 37 (pre-2019: J&K undivided, DNH and DD separate) | 3,270,775 | 11,516 | 11,726 |

Both cover the full claimed extent; differences are linework (LSIB/Alhasan-derived composite vs SoI-derived states), concentrated on the China border (largest overhang 1,276 km² near 35.6N 80.0E, Aksai Chin edge), Gulf of Kutch (1,261 km² gap: composite counts part of the inner gulf as land), Sundarbans and the Arunachal–China/Myanmar border. No overlaps between Admin2 states. Chosen: **Admin2** (current set), reconciled to the composite.
