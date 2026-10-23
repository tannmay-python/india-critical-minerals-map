// Keyless OpenFreeMap basemap with every administrative boundary, disputed-area line and
// country/state label stripped, then the official India boundary (DataMeet / Survey of India
// composite) drawn on top. CLAUDE.md §5: the map must never show a non-official depiction
// of India's boundary at any zoom or in either projection.
import type { StyleSpecification, LayerSpecification, FilterSpecification } from "maplibre-gl";

export type Theme = "light" | "dark";

const STYLE_URL: Record<Theme, string> = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const styleCache = new Map<Theme, StyleSpecification>();

function mentionsAdminPlace(filter: FilterSpecification | undefined): boolean {
  const s = JSON.stringify(filter ?? "");
  return /"(country|state|province)"/.test(s);
}

/** True for any layer that could draw a boundary or name a country/state from OSM data. */
export function isForbiddenLayer(l: LayerSpecification): boolean {
  const sl = (l as { "source-layer"?: string })["source-layer"];
  if (sl === "boundary") return true;
  if (sl === "place" && mentionsAdminPlace((l as { filter?: FilterSpecification }).filter)) return true;
  if (/country|boundary|disputed/i.test(l.id)) return true;
  return false;
}

export async function loadBaseStyle(theme: Theme): Promise<StyleSpecification> {
  const hit = styleCache.get(theme);
  if (hit) return structuredClone(hit);
  const res = await fetch(STYLE_URL[theme]);
  if (!res.ok) throw new Error(`basemap style ${res.status}`);
  const style = (await res.json()) as StyleSpecification;
  style.layers = style.layers.filter((l) => !isForbiddenLayer(l));
  styleCache.set(theme, style);
  return structuredClone(style);
}

export interface BoundaryPaint {
  outline: string;
  state: string;
  stateLabel: string;
  halo: string;
  world: string;
}

/** Official boundary overlays. Added after the base layers, below data layers. */
export function boundaryLayers(p: BoundaryPaint, opts: { world: boolean }): {
  sources: Record<string, { type: "geojson"; data: string }>;
  layers: LayerSpecification[];
} {
  const sources: Record<string, { type: "geojson"; data: string }> = {
    "india-outline": { type: "geojson", data: "data/geo/india-boundary.geojson" },
    "india-states": { type: "geojson", data: "data/geo/states.geojson" },
  };
  const layers: LayerSpecification[] = [];
  if (opts.world) {
    sources["world"] = { type: "geojson", data: "data/geo/world-ind-pov.geojson" };
    layers.push({
      id: "world-outline", type: "line", source: "world",
      filter: ["!=", ["get", "iso_a3"], "IND"],
      paint: { "line-color": p.world, "line-width": 0.6 },
    });
  }
  layers.push(
    {
      id: "india-states-line", type: "line", source: "india-states",
      paint: { "line-color": p.state, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 8, 1] },
    },
    {
      id: "india-outline-line", type: "line", source: "india-outline",
      paint: { "line-color": p.outline, "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 8, 1.6] },
    },
  );
  return { sources, layers };
}
