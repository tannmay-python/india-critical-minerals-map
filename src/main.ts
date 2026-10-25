import "./styles/app.css";
import type { Entity, StatusGroup } from "./lib/types";
import { loadData, mineralKeys, GROUP_LABEL, GROUP_ORDER, type Dataset, type View } from "./data";
import { createMap, type MapView } from "./map/mapview";
import { renderDrawer } from "./ui/drawer";
import { mountSearch } from "./ui/search";
import { currentTheme, onThemeChange } from "./lib/theme";
import { parseHash, replaceParams, onRoute } from "./lib/router";
import { esc, fmtDate } from "./lib/format";

interface Filters {
  view: View; stages: Set<string>; groups: Set<StatusGroup>; mineral: string; state: string; scheme: string;
  demand: boolean; unconfirmed: boolean;
}

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

/** Overseas records filter by host country; everything else by Indian state. */
function regionOf(e: Entity): string {
  return e.layer === "overseas" ? e.location.country ?? "" : e.location.state ?? e.location.country ?? "";
}

const viewOf = (e: Entity): View => (e.layer === "overseas" ? "abroad" : "india");

async function main(): Promise<void> {
  const app = $("#app");
  app.innerHTML = `
    <section class="view view-map">
      <div id="map" class="map-canvas" aria-label="Map of projects"></div>
      <aside id="panel" class="panel" aria-label="Filters"></aside>
      <button id="panel-toggle" class="panel-toggle" type="button" aria-controls="panel" aria-expanded="false"></button>
      <aside id="drawer" class="drawer" aria-labelledby="drawer-title" hidden></aside>
    </section>`;

  let data: Dataset;
  try {
    data = await loadData();
  } catch (err) {
    app.innerHTML = `<p class="load-error">Could not load the data. Reload the page to try again.</p>`;
    throw err;
  }

  const umbrellas = new Map(data.minerals.filter((m) => m.umbrella).map((m) => [m.name, m.members ?? []]));
  const family = new Map(data.minerals.map((m) => [m.name, m.family]));
  const keys = new Map(data.entities.map((e) => [e.id, mineralKeys(e, umbrellas)]));
  const hasLow = data.entities.some((e) => e.confidence === "low");

  // ---- filter state <-> URL
  const p = parseHash().params;
  const list = (k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
  const f: Filters = {
    view: p.get("view") === "abroad" ? "abroad" : "india",
    stages: new Set(list("stage")),
    groups: new Set((list("status") as StatusGroup[]).filter((g) => GROUP_ORDER.includes(g))),
    mineral: p.get("mineral") ?? "",
    state: p.get("state") ?? "",
    scheme: p.get("scheme") ?? "",
    demand: p.get("demand") === "1",
    unconfirmed: p.get("unconfirmed") === "1",
  };
  if (!f.groups.size) GROUP_ORDER.forEach((g) => f.groups.add(g));
  let selected: string | null = p.get("id");
  const opening = selected ? data.byId.get(selected) : undefined;
  if (opening) { // a shared link to a record decides the view
    f.view = viewOf(opening);
    if (opening.layer === "demand") f.demand = true;
  }

  function writeURL(): void {
    const q = new URLSearchParams();
    if (f.view === "abroad") q.set("view", "abroad");
    if (f.stages.size) q.set("stage", [...f.stages].join(","));
    if (f.groups.size !== GROUP_ORDER.length) q.set("status", [...f.groups].join(","));
    if (f.mineral) q.set("mineral", f.mineral);
    if (f.state) q.set("state", f.state);
    if (f.scheme) q.set("scheme", f.scheme);
    if (f.demand) q.set("demand", "1");
    if (f.unconfirmed) q.set("unconfirmed", "1");
    if (selected) q.set("id", selected);
    replaceParams(q);
  }

  const mineralMatch = (e: Entity, m: string) => {
    if (!m) return true;
    if (m.startsWith("family:")) {
      const fam = m.slice(7);
      return e.minerals.some((x) => family.get(x) === fam || (umbrellas.has(x) && (umbrellas.get(x) ?? []).some((y) => family.get(y) === fam)));
    }
    return keys.get(e.id)!.has(m);
  };
  const confirmed = (e: Entity) => f.unconfirmed || e.confidence !== "low";
  const inView = (e: Entity) => viewOf(e) === f.view && (f.demand || e.layer !== "demand");
  const pass = (e: Entity, skip?: keyof Filters) =>
    inView(e) && confirmed(e) &&
    // demand sites are context, so stage chips do not hide them
    (skip === "stages" || !f.stages.size || e.layer === "demand" || e.stages.some((s) => f.stages.has(s))) &&
    (skip === "groups" || f.groups.has(e.status_group)) &&
    (skip === "mineral" || mineralMatch(e, f.mineral)) &&
    (skip === "state" || !f.state || regionOf(e) === f.state) &&
    (skip === "scheme" || !f.scheme || e.scheme_links.some((s) => s.id === f.scheme));

  // ---- map + drawer
  const panel = $("#panel");
  const drawer = $("#drawer");
  const toggle = $<HTMLButtonElement>("#panel-toggle");
  const mobile = window.matchMedia("(max-width: 760px)");
  const padding = () => ({
    top: 40, bottom: mobile.matches ? (drawer.hidden ? 60 : window.innerHeight * 0.55) : 40,
    left: mobile.matches ? 20 : panel.offsetWidth + 40,
    right: mobile.matches ? 20 : drawer.hidden ? 40 : drawer.offsetWidth + 40,
  });
  const map: MapView = createMap($("#map"), data.stages, (id) => open(id, false), padding, f.view);

  function open(id: string | null, fly: boolean): void {
    const e = id ? data.byId.get(id) : undefined;
    selected = e ? e.id : null;
    if (e) {
      renderDrawer(drawer, e, data.stages, data.byId);
      drawer.hidden = false;
      drawer.scrollTop = 0;
      drawer.querySelector<HTMLButtonElement>(".drawer-close")!.onclick = () => open(null, false);
      if (fly) ($("#drawer-title") as HTMLElement).focus({ preventScroll: true });
    } else {
      drawer.hidden = true;
    }
    map.select(selected, fly);
    writeURL();
  }
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !drawer.hidden) open(null, false); });
  drawer.addEventListener("click", (ev) => { // links to related records inside the drawer
    const a = (ev.target as HTMLElement).closest<HTMLElement>("[data-open]");
    if (!a) return;
    ev.preventDefault();
    choose(a.dataset.open!);
  });
  onThemeChange(() => { if (selected) renderDrawer(drawer, data.byId.get(selected)!, data.stages, data.byId); paint(); });

  function setView(v: View): void {
    if (v === f.view) return;
    f.view = v;
    f.state = ""; // states and countries do not carry over
    f.stages.clear();
    if (selected && viewOf(data.byId.get(selected)!) !== v) open(null, false);
    paint();
    map.setView(v);
    writeURL();
  }

  // ---- filter panel
  function paint(): void {
    const shown = data.entities.filter((e) => pass(e));
    const theme = currentTheme();
    const count = (skip: keyof Filters, test: (e: Entity) => boolean) => data.entities.filter((e) => pass(e, skip) && test(e)).length;
    const filtered = f.stages.size || f.groups.size !== GROUP_ORDER.length || f.mineral || f.state || f.scheme;
    const base = data.entities.filter((e) => inView(e) && confirmed(e));
    const nView = (v: View) => data.entities.filter((e) => viewOf(e) === v && confirmed(e) && e.layer !== "demand").length;

    const stagesPresent = data.stages.filter((s) => s.id !== "Cells & Devices" && base.some((e) => e.stages.includes(s.id)));
    const stageChips = stagesPresent
      .map((s) => {
        const n = count("stages", (e) => e.layer !== "demand" && e.stages.includes(s.id));
        const on = f.stages.has(s.id);
        return `<button type="button" class="chip-btn${on ? " on" : ""}" data-stage="${esc(s.id)}" aria-pressed="${on}">
          <i class="dot" style="background:${s.color[theme]}"></i>${esc(s.id)}<span class="n num">${n}</span></button>`;
      })
      .join("");
    const groupRows = GROUP_ORDER.map((g) => {
      const n = count("groups", (e) => e.status_group === g);
      const on = f.groups.has(g);
      return `<label class="check"><input type="checkbox" data-group="${g}"${on ? " checked" : ""}>
        <i class="glyph glyph-${g}"></i>${GROUP_LABEL[f.view][g]}<span class="n num">${n}</span></label>`;
    }).join("");
    const opt = (v: string, label: string, n: number, cur: string) =>
      `<option value="${esc(v)}"${v === cur ? " selected" : ""}${n === 0 && v !== cur ? " disabled" : ""}>${esc(label)}${n ? ` (${n})` : ""}</option>`;
    const mineralNames = [...new Set(base.flatMap((e) => [...keys.get(e.id)!]))].filter((m) => !umbrellas.has(m)).sort();
    const families = (["REE", "PGE"] as const).filter((fam) => base.some((e) => mineralMatch(e, `family:${fam}`)));
    const mineralOpts = [
      `<option value="">All minerals</option>`,
      ...families.map((fam) => opt(`family:${fam}`, fam === "REE" ? "Rare earths, all" : "Platinum group, all", count("mineral", (e) => mineralMatch(e, `family:${fam}`)), f.mineral)),
      ...mineralNames.map((m) => opt(m, m, count("mineral", (e) => keys.get(e.id)!.has(m)), f.mineral)),
    ].join("");
    const regions = [...new Set(base.map(regionOf).filter(Boolean))].sort();
    const abroad = f.view === "abroad";
    const stateOpts = [`<option value="">All ${abroad ? "countries" : "states"}</option>`,
      ...regions.map((r) => opt(r, r, count("state", (e) => regionOf(e) === r), f.state))].join("");
    const schemes = new Map<string, string>();
    for (const e of base) for (const s of e.scheme_links) schemes.set(s.id, s.name);
    const schemeOpts = [`<option value="">All</option>`,
      ...[...schemes].sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => opt(id, name, count("scheme", (e) => e.scheme_links.some((s) => s.id === id)), f.scheme))].join("");
    const nDemand = data.entities.filter((e) => e.layer === "demand" && confirmed(e)).length;

    panel.innerHTML = `
      <div class="seg" role="group" aria-label="Where">
        ${(["india", "abroad"] as View[]).map((v) => `<button type="button" data-view="${v}" aria-pressed="${f.view === v}">${v === "india" ? "In India" : "Abroad"}<span class="n num">${nView(v)}</span></button>`).join("")}
      </div>
      <div class="panel-head">
        <p class="count"><strong class="num">${shown.length}</strong>${filtered ? ` of ${base.length}` : ""} sites</p>
        ${filtered ? `<button type="button" class="link-btn" data-reset>Reset</button>` : ""}
      </div>
      <fieldset><legend class="eyebrow">Stage</legend><div class="chips">${stageChips}</div></fieldset>
      <fieldset><legend class="eyebrow">Status</legend>${groupRows}</fieldset>
      <fieldset class="selects">
        <label><span class="eyebrow">Mineral</span><select data-select="mineral">${mineralOpts}</select></label>
        <label><span class="eyebrow">${abroad ? "Country" : "State"}</span><select data-select="state">${stateOpts}</select></label>
        ${schemes.size ? `<label><span class="eyebrow">Scheme</span><select data-select="scheme">${schemeOpts}</select></label>` : ""}
      </fieldset>
      ${abroad ? "" : `<label class="check"><input type="checkbox" data-demand${f.demand ? " checked" : ""}>Show demand: cell plants, gallium fabs<span class="n num">${nDemand}</span></label>`}
      ${hasLow ? `<label class="check"><input type="checkbox" data-unconfirmed${f.unconfirmed ? " checked" : ""}>Show unconfirmed</label>` : ""}
      <footer class="panel-foot">
        <span>Updated ${fmtDate(data.meta.built.slice(0, 10))}</span>
        <span>Data: <a href="downloads/blocks.csv" download>blocks</a> · <a href="downloads/magnets.csv" download>magnets</a> · <a href="downloads/all-entities.geojson" download>GeoJSON</a></span>
      </footer>`;
    toggle.innerHTML = `Filters<span class="num">${shown.length}</span>`;
    map.setEntities(shown);
  }

  panel.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    const viewBtn = t.closest<HTMLElement>("[data-view]");
    if (viewBtn) { setView(viewBtn.dataset.view as View); return; }
    const chip = t.closest<HTMLElement>("[data-stage]");
    if (chip) {
      const s = chip.dataset.stage!;
      f.stages.has(s) ? f.stages.delete(s) : f.stages.add(s);
    } else if (t.closest("[data-reset]")) {
      f.stages.clear(); f.mineral = ""; f.state = ""; f.scheme = "";
      GROUP_ORDER.forEach((g) => f.groups.add(g));
    } else return;
    paint(); writeURL();
  });
  panel.addEventListener("change", (ev) => {
    const t = ev.target as HTMLInputElement | HTMLSelectElement;
    if (t.dataset.group) {
      const g = t.dataset.group as StatusGroup;
      (t as HTMLInputElement).checked ? f.groups.add(g) : f.groups.delete(g);
    } else if (t.dataset.select === "mineral") f.mineral = t.value;
    else if (t.dataset.select === "state") f.state = t.value;
    else if (t.dataset.select === "scheme") f.scheme = t.value;
    else if ("demand" in t.dataset) {
      f.demand = (t as HTMLInputElement).checked;
      if (!f.demand && selected && data.byId.get(selected)?.layer === "demand") open(null, false);
    } else if ("unconfirmed" in t.dataset) f.unconfirmed = (t as HTMLInputElement).checked;
    paint(); writeURL();
  });
  toggle.addEventListener("click", () => {
    const openNow = !panel.classList.contains("open");
    panel.classList.toggle("open", openNow);
    toggle.setAttribute("aria-expanded", String(openNow));
  });

  /** Open a record from search or a related link: switch view and clear filters that would hide it. */
  function choose(id: string): void {
    const e = data.byId.get(id);
    if (!e) return;
    const switching = viewOf(e) !== f.view;
    if (switching) { f.view = viewOf(e); f.state = ""; f.stages.clear(); }
    if (e.layer === "demand") f.demand = true;
    if (!pass(e)) {
      f.stages.clear(); f.mineral = ""; f.state = ""; f.scheme = ""; GROUP_ORDER.forEach((g) => f.groups.add(g)); f.unconfirmed = true;
    }
    paint();
    if (switching) map.setView(f.view);
    panel.classList.remove("open");
    open(id, true);
  }
  mountSearch($("#search-input"), $("#search-results"), data.entities, choose);

  paint();
  if (opening) open(opening.id, true);
  else selected = null;
  onRoute((r) => { // pasted or edited links
    const id = r.params.get("id");
    if (id === selected) return;
    if (id && data.byId.has(id)) choose(id);
    else open(null, false);
  });
}

void main();
