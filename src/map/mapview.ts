// The map: official boundary over a stripped basemap, block polygons, and one marker per record.
// Colour = value-chain stage. Fill = status group (solid: operating or licensed; ring: in progress;
// grey: annulled or closed). Theme changes swap the basemap and re-add the data layers.
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, GeoJSONSourceSpecification, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre resolves its worker relative to its own module URL, which bundling breaks; hand it the bundled worker.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { loadBaseStyle, boundaryLayers, type Theme } from "./basemap";
import { currentTheme, onThemeChange } from "../lib/theme";
import type { Entity, Stage } from "../lib/types";
import { primaryStage } from "../data";

maplibregl.setWorkerUrl(workerUrl);

const INDIA: [[number, number], [number, number]] = [[68.0, 6.5], [97.5, 37.2]];
const ATTRIBUTION =
  "Official boundary of India: DataMeet (CC0), Survey of India depiction; states DataMeet (CC BY 4.0) · " +
  "Natural Earth · © OpenStreetMap contributors · OpenFreeMap · OpenMapTiles";

interface Palette { surface: string; ink: string; muted: string; inactive: string; outline: string; state: string; halo: string; world: string; select: string }

function palette(theme: Theme): Palette {
  return theme === "dark"
    ? { surface: "#18171a", ink: "#f0efec", muted: "#9a978f", inactive: "#6d6b66", outline: "#c3c2b7", state: "#45443f", halo: "#0f0e10", world: "#3a3936", select: "#e39abd" }
    : { surface: "#fcfcfb", ink: "#141317", muted: "#76736e", inactive: "#a9a69f", outline: "#4f4d4a", state: "#c3c2b7", halo: "#ffffff", world: "#d6d4cc", select: "#620d3c" };
}

export interface MapView {
  setEntities(list: Entity[]): void;
  select(id: string | null, fly?: boolean): void;
  resize(): void;
}

export function createMap(
  container: HTMLElement,
  stages: Stage[],
  onPick: (id: string | null) => void,
  padding: () => maplibregl.PaddingOptions,
): MapView {
  let theme = currentTheme();
  let visible: Entity[] = [];
  let selected: string | null = null;
  const stageColor = (id: string) => {
    const s = stages.find((x) => x.id === id);
    return s ? s.color[theme] : "#888";
  };

  const map: MLMap = new maplibregl.Map({
    container,
    style: { version: 8, sources: {}, layers: [] },
    bounds: INDIA,
    fitBoundsOptions: { padding: 24 },
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    renderWorldCopies: false,
    minZoom: 2,
    maxZoom: 14,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-right");
  map.once("load", () => {
    if (!flyTo(selected, 0)) map.fitBounds(INDIA, { padding: padding(), duration: 0 });
    container.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  });

  const hover = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "hover-tip" });

  type FC = Exclude<GeoJSONSourceSpecification["data"], string>;
  function pointData(): FC {
    return {
      type: "FeatureCollection",
      features: visible
        .filter((e) => e.lat !== null && e.lon !== null)
        .map((e) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [e.lon as number, e.lat as number] },
          properties: {
            id: e.id, name: e.name, status: e.status, group: e.status_group,
            color: stageColor(primaryStage(e)),
            rank: e.status_group === "active" ? 2 : e.status_group === "pipeline" ? 1 : 0,
          },
        })),
    };
  }

  function idFilter(): maplibregl.FilterSpecification {
    return ["in", ["get", "id"], ["literal", visible.map((e) => e.id)]];
  }

  function addDataLayers(): void {
    const p = palette(theme);
    const b = boundaryLayers(
      { outline: p.outline, state: p.state, stateLabel: p.muted, halo: p.halo, world: p.world },
      { world: true },
    );
    for (const [id, src] of Object.entries(b.sources)) if (!map.getSource(id)) map.addSource(id, src);
    for (const l of b.layers) if (!map.getLayer(l.id)) map.addLayer(l);

    const expl = stageColor("Exploration");
    map.addSource("blocks", { type: "geojson", data: "data/blocks-polygons.geojson" });
    map.addLayer({
      id: "blocks-fill", type: "fill", source: "blocks", minzoom: 6, filter: idFilter(),
      paint: {
        "fill-color": ["match", ["get", "status_group"], "inactive", p.inactive, expl],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.08, 10, 0.22],
      },
    });
    map.addLayer({
      id: "blocks-line", type: "line", source: "blocks", minzoom: 6, filter: idFilter(),
      paint: {
        "line-color": ["match", ["get", "status_group"], "inactive", p.inactive, expl],
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 11, 1.6],
      },
    });

    map.addSource("points", { type: "geojson", data: pointData() });
    // Zoom must be the outermost expression; status picks the size at each stop.
    const r = (on: number, off: number): maplibregl.ExpressionSpecification => [
      "interpolate", ["linear"], ["zoom"],
      3, ["match", ["get", "group"], "inactive", off * 0.8, on * 0.8],
      6, ["match", ["get", "group"], "inactive", off * 1.2, on * 1.2],
      10, ["match", ["get", "group"], "inactive", off * 1.7, on * 1.7],
    ];
    map.addLayer({
      id: "points-halo", type: "circle", source: "points",
      filter: ["==", ["get", "id"], selected ?? ""],
      paint: { "circle-radius": r(9, 9), "circle-color": "transparent", "circle-stroke-color": p.select, "circle-stroke-width": 2.5 },
    });
    map.addLayer({
      id: "points", type: "circle", source: "points",
      layout: { "circle-sort-key": ["get", "rank"] },
      paint: {
        "circle-radius": r(5.5, 3.5),
        "circle-color": ["match", ["get", "group"], "pipeline", p.surface, "inactive", p.inactive, ["get", "color"]],
        "circle-stroke-color": ["match", ["get", "group"], "inactive", p.inactive, "pipeline", ["get", "color"], p.halo],
        "circle-stroke-width": ["match", ["get", "group"], "pipeline", 2, "inactive", 0, 1],
        "circle-opacity": ["match", ["get", "group"], "inactive", 0.7, 1],
      },
    });
  }

  async function applyStyle(): Promise<void> {
    const style = await loadBaseStyle(theme);
    map.setStyle(style, { diff: false });
    map.once("style.load", addDataLayers);
  }

  function refresh(): void {
    const src = map.getSource("points") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(pointData());
    for (const id of ["blocks-fill", "blocks-line"]) if (map.getLayer(id)) map.setFilter(id, idFilter());
    if (map.getLayer("points-halo")) map.setFilter("points-halo", ["==", ["get", "id"], selected ?? ""]);
  }

  const pick = (f: MapGeoJSONFeature | undefined) => onPick(f ? String(f.properties.id) : null);

  map.on("click", (ev) => {
    const hit = map.queryRenderedFeatures(ev.point, { layers: ["points"] })[0]
      ?? map.queryRenderedFeatures(ev.point, { layers: ["blocks-fill"] })[0];
    pick(hit);
  });
  for (const layer of ["points", "blocks-fill"]) {
    map.on("mousemove", layer, (ev) => {
      map.getCanvas().style.cursor = "pointer";
      const f = ev.features?.[0];
      if (!f || layer !== "points") return;
      hover.setLngLat(ev.lngLat).setHTML(`<strong>${String(f.properties.name).replace(/</g, "&lt;")}</strong><span>${f.properties.status}</span>`).addTo(map);
    });
    map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; hover.remove(); });
  }

  function flyTo(id: string | null, duration: number): boolean {
    const e = id ? visible.find((x) => x.id === id) : undefined;
    if (!e || e.lat === null || e.lon === null) return false;
    map.easeTo({ center: [e.lon, e.lat], zoom: Math.max(map.getZoom(), 7), padding: padding(), duration });
    return true;
  }

  onThemeChange((t) => { theme = t; void applyStyle(); });
  void applyStyle();

  return {
    setEntities(list) { visible = list; refresh(); },
    select(id, fly = false) {
      selected = id;
      refresh();
      if (fly && map.loaded()) flyTo(id, 600);
    },
    resize() { map.resize(); },
  };
}
