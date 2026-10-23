import "./styles/app.css";
import type { Entity, StatusGroup } from "./lib/types";
import { loadData, mineralKeys, GROUP_LABEL, GROUP_ORDER, type Dataset } from "./data";
import { createMap, type MapView } from "./map/mapview";
import { renderDrawer } from "./ui/drawer";
import { mountSearch } from "./ui/search";
import { mountThemeToggle, currentTheme, onThemeChange } from "./lib/theme";
import { parseHash, replaceParams, onRoute } from "./lib/router";
import { esc, fmtDate } from "./lib/format";

interface Filters { stages: Set<string>; groups: Set<StatusGroup>; mineral: string; state: string; unconfirmed: boolean }

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

function regionOf(e: Entity): string {
  return e.location.state ?? e.location.country ?? "";
}

async function main(): Promise<void> {
  mountThemeToggle($("#theme-toggle"));
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
    stages: new Set(list("stage")),
    groups: new Set((list("status") as StatusGroup[]).filter((g) => GROUP_ORDER.includes(g))),
    mineral: p.get("mineral") ?? "",
    state: p.get("state") ?? "",
    unconfirmed: p.get("unconfirmed") === "1",
  };
  if (!f.groups.size) GROUP_ORDER.forEach((g) => f.groups.add(g));
  let selected: string | null = p.get("id");

  function writeURL(): void {
    const q = new URLSearchParams();
    if (f.stages.size) q.set("stage", [...f.stages].join(","));
    if (f.groups.size !== GROUP_ORDER.length) q.set("status", [...f.groups].join(","));
    if (f.mineral) q.set("mineral", f.mineral);
    if (f.state) q.set("state", f.state);
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
  const pass = (e: Entity, skip?: keyof Filters) =>
    (f.unconfirmed || e.confidence !== "low") &&
    (skip === "stages" || !f.stages.size || e.stages.some((s) => f.stages.has(s))) &&
    (skip === "groups" || f.groups.has(e.status_group)) &&
    (skip === "mineral" || mineralMatch(e, f.mineral)) &&
    (skip === "state" || !f.state || regionOf(e) === f.state);

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
  const map: MapView = createMap($("#map"), data.stages, (id) => open(id, false), padding);

  function open(id: string | null, fly: boolean): void {
    const e = id ? data.byId.get(id) : undefined;
    selected = e ? e.id : null;
    if (e) {
      renderDrawer(drawer, e, data.stages);
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
  onThemeChange(() => { if (selected) renderDrawer(drawer, data.byId.get(selected)!, data.stages); paint(); });

  // ---- filter panel
  const stagesPresent = data.stages.filter((s) => data.entities.some((e) => e.stages.includes(s.id)));
  const regions = [...new Set(data.entities.map(regionOf).filter(Boolean))].sort();
  const mineralNames = [...new Set(data.entities.flatMap((e) => [...keys.get(e.id)!]))]
    .filter((m) => !umbrellas.has(m))
    .sort();
  const total = data.entities.filter((e) => f.unconfirmed || e.confidence !== "low").length;

  function paint(): void {
    const shown = data.entities.filter((e) => pass(e));
    const theme = currentTheme();
    const count = (skip: keyof Filters, test: (e: Entity) => boolean) => data.entities.filter((e) => pass(e, skip) && test(e)).length;
    const filtered = f.stages.size || f.groups.size !== GROUP_ORDER.length || f.mineral || f.state;

    const stageChips = stagesPresent
      .map((s) => {
        const n = count("stages", (e) => e.stages.includes(s.id));
        const on = f.stages.has(s.id);
        return `<button type="button" class="chip-btn${on ? " on" : ""}" data-stage="${esc(s.id)}" aria-pressed="${on}">
          <i class="dot" style="background:${s.color[theme]}"></i>${esc(s.id)}<span class="n num">${n}</span></button>`;
      })
      .join("");
    const groupRows = GROUP_ORDER.map((g) => {
      const n = count("groups", (e) => e.status_group === g);
      const on = f.groups.has(g);
      return `<label class="check"><input type="checkbox" data-group="${g}"${on ? " checked" : ""}>
        <i class="glyph glyph-${g}"></i>${GROUP_LABEL[g]}<span class="n num">${n}</span></label>`;
    }).join("");
    const opt = (v: string, label: string, n: number, cur: string) =>
      `<option value="${esc(v)}"${v === cur ? " selected" : ""}${n === 0 && v !== cur ? " disabled" : ""}>${esc(label)}${n ? ` (${n})` : ""}</option>`;
    const mineralOpts = [
      `<option value="">All minerals</option>`,
      opt("family:REE", "Rare earths, all", count("mineral", (e) => mineralMatch(e, "family:REE")), f.mineral),
      opt("family:PGE", "Platinum group, all", count("mineral", (e) => mineralMatch(e, "family:PGE")), f.mineral),
      ...mineralNames.map((m) => opt(m, m, count("mineral", (e) => keys.get(e.id)!.has(m)), f.mineral)),
    ].join("");
    const stateOpts = [`<option value="">All states</option>`, ...regions.map((r) => opt(r, r, count("state", (e) => regionOf(e) === r), f.state))].join("");

    panel.innerHTML = `
      <div class="panel-head">
        <p class="count"><strong class="num">${shown.length}</strong>${filtered ? ` of ${total}` : ""} sites</p>
        ${filtered ? `<button type="button" class="link-btn" data-reset>Reset</button>` : ""}
      </div>
      <fieldset><legend class="eyebrow">Stage</legend><div class="chips">${stageChips}</div></fieldset>
      <fieldset><legend class="eyebrow">Status</legend>${groupRows}</fieldset>
      <fieldset class="selects">
        <label><span class="eyebrow">Mineral</span><select data-select="mineral">${mineralOpts}</select></label>
        <label><span class="eyebrow">State</span><select data-select="state">${stateOpts}</select></label>
      </fieldset>
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
    const chip = t.closest<HTMLElement>("[data-stage]");
    if (chip) {
      const s = chip.dataset.stage!;
      f.stages.has(s) ? f.stages.delete(s) : f.stages.add(s);
    } else if (t.closest("[data-reset]")) {
      f.stages.clear(); f.mineral = ""; f.state = "";
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
    else if ("unconfirmed" in t.dataset) f.unconfirmed = (t as HTMLInputElement).checked;
    paint(); writeURL();
  });
  toggle.addEventListener("click", () => {
    const openNow = !panel.classList.contains("open");
    panel.classList.toggle("open", openNow);
    toggle.setAttribute("aria-expanded", String(openNow));
  });

  mountSearch($("#search-input"), $("#search-results"), data.entities, (id) => {
    const e = data.byId.get(id);
    if (e && !pass(e)) { // make sure a searched record is visible
      f.stages.clear(); f.mineral = ""; f.state = ""; GROUP_ORDER.forEach((g) => f.groups.add(g)); f.unconfirmed = true;
      paint();
    }
    panel.classList.remove("open");
    open(id, true);
  });

  paint();
  if (selected && data.byId.has(selected)) open(selected, true);
  else selected = null;
  onRoute((r) => { // pasted or edited links
    const id = r.params.get("id");
    if (id !== selected) open(id && data.byId.has(id) ? id : null, true);
  });
}

void main();
