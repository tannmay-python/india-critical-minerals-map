// Header search over names, operators, bidders, places and minerals. "/" focuses it.
import Fuse from "fuse.js";
import type { Entity } from "../lib/types";
import { esc } from "../lib/format";

export function mountSearch(input: HTMLInputElement, list: HTMLUListElement, entities: Entity[], onChoose: (id: string) => void): void {
  const docs = entities.map((e) => ({
    id: e.id,
    name: e.name,
    aliases: e.aliases.join(" "),
    who: [e.operator, ...(e.auction?.history ?? []).map((h) => h.preferred_bidder)].filter(Boolean).join(" "),
    where: [e.location.village_or_town, e.location.district, e.location.state, e.location.country].filter(Boolean).join(" "),
    minerals: e.minerals.join(" "),
    label: [e.location.state ?? e.location.country, e.status].filter(Boolean).join(" · "),
  }));
  const fuse = new Fuse(docs, {
    keys: [{ name: "name", weight: 3 }, { name: "aliases", weight: 2 }, "who", "where", "minerals"],
    threshold: 0.32, ignoreLocation: true, minMatchCharLength: 2,
  });
  let hits: typeof docs = [];
  let active = -1;

  const close = () => { list.hidden = true; active = -1; input.setAttribute("aria-expanded", "false"); };
  const paint = () => {
    list.innerHTML = hits
      .map((h, i) => `<li role="option" data-id="${esc(h.id)}" aria-selected="${i === active}"><span>${esc(h.name)}</span><small>${esc(h.label)}</small></li>`)
      .join("");
    list.hidden = hits.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
  };
  const choose = (id: string) => { onChoose(id); input.value = ""; hits = []; close(); input.blur(); };

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-controls", list.id);
  input.addEventListener("input", () => {
    const q = input.value.trim();
    hits = q.length < 2 ? [] : fuse.search(q, { limit: 8 }).map((r) => r.item);
    active = hits.length ? 0 : -1;
    paint();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" && hits.length) { active = (active + 1) % hits.length; paint(); ev.preventDefault(); }
    else if (ev.key === "ArrowUp" && hits.length) { active = (active - 1 + hits.length) % hits.length; paint(); ev.preventDefault(); }
    else if (ev.key === "Enter" && active >= 0) { choose(hits[active].id); ev.preventDefault(); }
    else if (ev.key === "Escape") { input.value = ""; hits = []; close(); input.blur(); }
  });
  list.addEventListener("mousedown", (ev) => {
    const li = (ev.target as HTMLElement).closest("li");
    if (li?.dataset.id) { ev.preventDefault(); choose(li.dataset.id); }
  });
  input.addEventListener("blur", () => setTimeout(close, 120));
  document.addEventListener("keydown", (ev) => {
    const t = ev.target as HTMLElement;
    if (ev.key === "/" && !/input|textarea|select/i.test(t.tagName)) { ev.preventDefault(); input.focus(); }
  });
}
