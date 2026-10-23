// Hash routing: everything is linkable and works on static hosting.
//   #/                         map (home)       #/globe  #/chain  #/auctions  #/timeline
//   #/policy  #/method  #/data #/e/<id>         entity page
// Filter state rides in the query: #/?stage=Refining,Magnets&mineral=Graphite&t=2025-06
export type View = "map" | "globe" | "chain" | "auctions" | "timeline" | "policy" | "method" | "data" | "entity";

export interface Route {
  view: View;
  entityId?: string;
  params: URLSearchParams;
}

const VIEWS: Record<string, View> = {
  "": "map", globe: "globe", chain: "chain", auctions: "auctions", timeline: "timeline",
  policy: "policy", method: "method", data: "data",
};

export function parseHash(hash = location.hash): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const params = new URLSearchParams(query);
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "e" && parts[1]) return { view: "entity", entityId: decodeURIComponent(parts[1]), params };
  return { view: VIEWS[parts[0] ?? ""] ?? "map", params };
}

export function buildHash(view: View, params?: URLSearchParams, entityId?: string): string {
  const path = view === "entity" ? `e/${encodeURIComponent(entityId ?? "")}` : view === "map" ? "" : view;
  const q = params && [...params.keys()].length ? `?${params.toString().replace(/%2C/g, ",")}` : "";
  return `#/${path}${q}`;
}

const listeners = new Set<(r: Route) => void>();
export function onRoute(fn: (r: Route) => void): void { listeners.add(fn); }

/** Update the query of the current view without adding a history entry. */
export function replaceParams(params: URLSearchParams): void {
  const r = parseHash();
  const h = buildHash(r.view, params, r.entityId);
  if (h !== location.hash) history.replaceState(null, "", h);
}

export function go(view: View, params?: URLSearchParams, entityId?: string): void {
  location.hash = buildHash(view, params, entityId);
}

window.addEventListener("hashchange", () => {
  const r = parseHash();
  listeners.forEach((fn) => fn(r));
});
