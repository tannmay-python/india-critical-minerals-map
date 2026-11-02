// The map: official boundary over a stripped basemap, block polygons, and one marker per record.
// Colour = status (plum: operating or held; marigold: in progress; grey: stopped). Shape = kind
// (circle: a project or site; square: an auction block). In the India view everything outside
// India's official outline is masked, so the map reads as India alone.
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, GeoJSONSourceSpecification, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre resolves its worker relative to its own module URL, which bundling breaks; hand it the bundled worker.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { loadBaseStyle, boundaryLayers } from "./basemap";
import type { Entity, StatusGroup } from "../lib/types";
import type { View } from "../data";

maplibregl.setWorkerUrl(workerUrl);

const INDIA: [[number, number], [number, number]] = [[68.0, 6.5], [97.5, 37.2]];
const ATTRIBUTION =
  "Official boundary of India: DataMeet (CC0), Survey of India depiction; states DataMeet (CC BY 4.0) · " +
  "Natural Earth · © OpenStreetMap contributors · OpenFreeMap · OpenMapTiles";

/** Marker colours by status group; shared with the legend and panel swatches (app.css --st-*). */
export const STATUS_FILL: Record<StatusGroup, string> = { active: "#620d3c", pipeline: "#f1a222", inactive: "#c4baa6" };
const STATUS_STROKE: Record<StatusGroup, string> = { active: "#ffffff", pipeline: "#a86a00", inactive: "#ffffff" };
const P = { page: "#fffbe2", ink: "#1a0804", label: "#4a2c14", outline: "#620d3c", state: "#d8c585", world: "#d8c585", select: "#1a0804" };

export interface MapView {
  setEntities(list: Entity[]): void;
  select(id: string | null, fly?: boolean): void;
  setView(view: View): void;
  resize(): void;
}

type LngLat = [number, number];
type Geom = { type: string; coordinates: unknown };

/** A gentle arc from a to b (quadratic Bezier in lon/lat), so lines from India read as links, not borders. */
function arc(a: LngLat, b: LngLat, n = 48): LngLat[] {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const c: LngLat = [(a[0] + b[0]) / 2 - dy * 0.18, (a[1] + b[1]) / 2 + dx * 0.18];
  const out: LngLat[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

/** Map label: the name without its trailing ", Place" (the place is already on the map). */
function shortName(name: string): string {
  const i = name.lastIndexOf(", ");
  return i > 12 ? name.slice(0, i) : name;
}

/** Square marker images for auction blocks, one per status, drawn at 2x for sharpness. */
function addSquareIcons(map: MLMap): void {
  const size = 22, pad = 3;
  for (const g of ["active", "pipeline", "inactive"] as StatusGroup[]) {
    const id = `sq-${g}`;
    if (map.hasImage(id)) continue;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const x = c.getContext("2d")!;
    x.fillStyle = STATUS_FILL[g];
    x.strokeStyle = STATUS_STROKE[g];
    x.lineWidth = 2;
    x.fillRect(pad, pad, size - 2 * pad, size - 2 * pad);
    x.strokeRect(pad, pad, size - 2 * pad, size - 2 * pad);
    map.addImage(id, x.getImageData(0, 0, size, size), { pixelRatio: 2 });
  }
}

export function createMap(
  container: HTMLElement,
  onPick: (id: string | null) => void,
  padding: () => maplibregl.PaddingOptions,
  initialView: View,
): MapView {
  let view = initialView;
  let visible: Entity[] = [];
  let selected: string | null = null;
  // India's official outline, used to keep only Indian place names in the India view.
  const india = fetch("data/geo/india-boundary.geojson").then((r) => r.json() as Promise<{ features: { geometry: Geom }[] }>);
  let indiaGeom: Geom | null = null;
  const baseLabels = new Map<string, maplibregl.FilterSpecification | undefined>(); // basemap label layers and their own filters

  const map: MLMap = new maplibregl.Map({
    container,
    style: { version: 8, sources: {}, layers: [] },
    bounds: INDIA,
    fitBoundsOptions: { padding: 24 },
    attributionControl: false,
    dragRotate: false,
    pitchWithRotate: false,
    renderWorldCopies: false,
    minZoom: 1,
    maxZoom: 14,
  });
  map.touchZoomRotate.disableRotation();
  if (import.meta.env.DEV) (window as unknown as { __icmMap: MLMap }).__icmMap = map; // QA screenshots only
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: ATTRIBUTION }), "bottom-right");
  map.once("load", () => {
    if (!flyTo(selected, 0)) frame(0);
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
            id: e.id, name: e.name, label: shortName(e.name), status: e.status, group: e.status_group,
            block: e.layer === "blocks" ? 1 : 0,
            rank: e.status_group === "active" ? 2 : e.status_group === "pipeline" ? 1 : 0,
            muted: e.layer === "demand" || e.confidence === "low" ? 1 : 0,
            where: e.layer === "overseas" ? e.location.country ?? "" : "",
          },
        })),
    };
  }

  function arcData(): FC {
    return {
      type: "FeatureCollection",
      features: visible
        .filter((e) => e.overseas?.india_link && e.lat !== null && e.lon !== null)
        .map((e) => ({
          type: "Feature",
          geometry: { type: "LineString", coordinates: arc([e.overseas!.india_link.lon, e.overseas!.india_link.lat], [e.lon as number, e.lat as number]) },
          properties: { id: e.id, group: e.status_group },
        })),
    };
  }

  /** Bounds of what the current view should show: India, or every overseas site plus India. */
  function viewBounds(): maplibregl.LngLatBoundsLike {
    if (view === "india") return INDIA;
    const b = new maplibregl.LngLatBounds(INDIA[0], INDIA[1]);
    for (const e of visible) if (e.lat !== null && e.lon !== null) b.extend([e.lon, e.lat]);
    return b;
  }
  function frame(duration: number): void {
    map.fitBounds(viewBounds(), { padding: padding(), duration, maxZoom: view === "india" ? 6 : 4 });
  }

  function idFilter(): maplibregl.FilterSpecification {
    return ["in", ["get", "id"], ["literal", visible.map((e) => e.id)]];
  }
  const byGroup = (key: string, colours: Record<StatusGroup, string>): maplibregl.ExpressionSpecification =>
    ["match", ["get", key], "active", colours.active, "pipeline", colours.pipeline, colours.inactive];

  function applyViewLayers(): void {
    if (map.getLayer("outside-india")) map.setLayoutProperty("outside-india", "visibility", view === "india" ? "visible" : "none");
    for (const [id, own] of baseLabels) {
      if (!map.getLayer(id)) continue;
      const inIndia: maplibregl.FilterSpecification | undefined = indiaGeom
        ? (["within", indiaGeom] as unknown as maplibregl.FilterSpecification) : undefined;
      const f = view === "india" && inIndia ? (own ? ["all", own, inIndia] : inIndia) : own;
      map.setFilter(id, (f ?? null) as maplibregl.FilterSpecification | null);
    }
  }

  async function addDataLayers(): Promise<void> {
    indiaGeom ??= (await india).features[0].geometry;
    addSquareIcons(map);
    // Basemap labels stay above the mask so names on the coast are not cut; outside-India names are filtered instead.
    baseLabels.clear();
    for (const l of map.getStyle().layers) if (l.type === "symbol") baseLabels.set(l.id, (l as { filter?: maplibregl.FilterSpecification }).filter);
    const firstLabel = [...baseLabels.keys()][0];
    const b = boundaryLayers({ outline: P.outline, state: P.state, stateLabel: P.label, halo: "#ffffff", world: P.world }, { world: true });
    for (const [id, src] of Object.entries(b.sources)) if (!map.getSource(id)) map.addSource(id, src);
    for (const l of b.layers) if (!map.getLayer(l.id)) map.addLayer(l);
    // India view: paint over everything outside India's official outline (basemap, labels, world lines).
    map.addSource("outside-india", { type: "geojson", data: "data/geo/outside-india.geojson" });
    map.addLayer({ id: "outside-india", type: "fill", source: "outside-india", paint: { "fill-color": P.page } }, firstLabel);
    // the world outline belongs to the Abroad view; keep it under the mask
    if (map.getLayer("world-outline")) map.moveLayer("world-outline", "outside-india");

    map.addSource("blocks", { type: "geojson", data: "data/blocks-polygons.geojson" });
    map.addLayer({
      id: "blocks-fill", type: "fill", source: "blocks", minzoom: 6, filter: idFilter(),
      paint: { "fill-color": byGroup("status_group", STATUS_FILL), "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.1, 10, 0.24] },
    });
    map.addLayer({
      id: "blocks-line", type: "line", source: "blocks", minzoom: 6, filter: idFilter(),
      paint: { "line-color": byGroup("status_group", STATUS_FILL), "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 11, 1.6] },
    });

    map.addSource("arcs", { type: "geojson", data: arcData() });
    // solid for assets held, dashed for bids and evaluations
    for (const [id, held] of [["arcs-held", true], ["arcs-other", false]] as const) {
      map.addLayer({
        id, type: "line", source: "arcs",
        filter: held ? ["==", ["get", "group"], "active"] : ["!=", ["get", "group"], "active"],
        paint: {
          "line-color": byGroup("group", { ...STATUS_FILL, pipeline: "#d9860a" }),
          "line-width": 1.2,
          "line-opacity": held ? 0.75 : 0.6,
          ...(held ? {} : { "line-dasharray": [2, 2] }),
        },
      });
    }

    map.addSource("points", { type: "geojson", data: pointData() });
    const size = (base: number): maplibregl.ExpressionSpecification => ["interpolate", ["linear"], ["zoom"], 3, base * 0.8, 6, base * 1.15, 10, base * 1.6];
    map.addLayer({
      id: "points-halo", type: "circle", source: "points",
      filter: ["==", ["get", "id"], selected ?? ""],
      paint: { "circle-radius": size(9), "circle-color": "transparent", "circle-stroke-color": P.select, "circle-stroke-width": 2 },
    });
    map.addLayer({
      id: "points", type: "circle", source: "points",
      filter: ["==", ["get", "block"], 0],
      layout: { "circle-sort-key": ["get", "rank"] },
      paint: {
        "circle-radius": size(5),
        "circle-color": byGroup("group", STATUS_FILL),
        "circle-stroke-color": byGroup("group", STATUS_STROKE),
        "circle-stroke-width": 1.2,
        // demand sites and unconfirmed records are context: drawn fainter
        "circle-opacity": ["case", ["==", ["get", "muted"], 1], 0.5, 1],
        "circle-stroke-opacity": ["case", ["==", ["get", "muted"], 1], 0.6, 1],
      },
    });
    map.addLayer({
      id: "blocks-pts", type: "symbol", source: "points",
      filter: ["==", ["get", "block"], 1],
      layout: {
        "icon-image": ["concat", "sq-", ["get", "group"]],
        "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.1, 10, 1.5],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
        "symbol-sort-key": ["get", "rank"],
      },
      paint: { "icon-opacity": ["case", ["==", ["get", "muted"], 1], 0.5, 1] },
    });
    // Names appear once there is room for them; overlapping labels are dropped, never the markers.
    map.addLayer({
      id: "labels", type: "symbol", source: "points", minzoom: 6.5,
      layout: {
        "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 11,
        "text-anchor": "left", "text-offset": [0.9, 0], "text-max-width": 14, "text-optional": true,
        "symbol-sort-key": ["-", 0, ["get", "rank"]],
      },
      paint: { "text-color": P.label, "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
    });
    applyViewLayers();
  }

  async function applyStyle(): Promise<void> {
    const style = await loadBaseStyle("light");
    map.setStyle(style, { diff: false });
    map.once("style.load", () => void addDataLayers());
  }

  function refresh(): void {
    const src = map.getSource("points") as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(pointData());
    (map.getSource("arcs") as GeoJSONSource | undefined)?.setData(arcData());
    for (const id of ["blocks-fill", "blocks-line"]) if (map.getLayer(id)) map.setFilter(id, idFilter());
    if (map.getLayer("points-halo")) map.setFilter("points-halo", ["==", ["get", "id"], selected ?? ""]);
  }

  const escHtml = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const MARKERS = ["points", "blocks-pts"];
  /** Distinct markers under the cursor (several records can share a district centroid). */
  function pointsAt(pt: maplibregl.Point): MapGeoJSONFeature[] {
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [[pt.x - 4, pt.y - 4], [pt.x + 4, pt.y + 4]];
    const seen = new Set<string>();
    return map.queryRenderedFeatures(box, { layers: MARKERS }).filter((f) => {
      const id = String(f.properties.id);
      return seen.has(id) ? false : (seen.add(id), true);
    });
  }
  const chooser = new maplibregl.Popup({ closeButton: false, offset: 10, className: "pick-list", maxWidth: "300px" });

  map.on("click", (ev) => {
    chooser.remove();
    const hits = pointsAt(ev.point);
    if (hits.length > 1) {
      const items = hits
        .sort((a, b) => Number(b.properties.rank) - Number(a.properties.rank))
        .map((f) => `<li><button type="button" data-id="${escHtml(f.properties.id)}">${escHtml(f.properties.name)}<span>${escHtml(f.properties.status)}</span></button></li>`)
        .join("");
      chooser.setLngLat(ev.lngLat).setHTML(`<p>${hits.length} sites here</p><ul>${items}</ul>`).addTo(map);
      chooser.getElement().addEventListener("click", (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
        if (b) { chooser.remove(); onPick(b.dataset.id!); }
      });
      return;
    }
    const hit = hits[0] ?? map.queryRenderedFeatures(ev.point, { layers: ["blocks-fill"] })[0];
    onPick(hit ? String(hit.properties.id) : null);
  });
  for (const layer of [...MARKERS, "blocks-fill"]) {
    map.on("mousemove", layer, (ev) => {
      map.getCanvas().style.cursor = "pointer";
      if (layer === "blocks-fill") return;
      const hits = pointsAt(ev.point);
      const f = hits[0];
      if (!f) return;
      const bits = [f.properties.status, f.properties.where].filter(Boolean).join(" · ");
      const more = hits.length > 1 ? `<span>+${hits.length - 1} more here</span>` : "";
      hover.setLngLat(ev.lngLat).setHTML(`<strong>${escHtml(f.properties.name)}</strong><span>${escHtml(bits)}</span>${more}`).addTo(map);
    });
    map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; hover.remove(); });
  }

  function flyTo(id: string | null, duration: number): boolean {
    const e = id ? visible.find((x) => x.id === id) : undefined;
    if (!e || e.lat === null || e.lon === null) return false;
    map.easeTo({ center: [e.lon, e.lat], zoom: Math.max(map.getZoom(), view === "india" ? 7 : 4), padding: padding(), duration });
    return true;
  }

  void applyStyle();

  return {
    setEntities(list) { visible = list; refresh(); },
    select(id, fly = false) {
      selected = id;
      refresh();
      if (fly) flyTo(id, 600);
    },
    setView(v) {
      view = v;
      applyViewLayers();
      frame(600);
    },
    resize() { map.resize(); },
  };
}
