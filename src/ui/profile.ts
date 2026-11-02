// Full profile of one project, after the facility pages of Pranay Kotasthane's India Semiconductor
// Tracker: what it is, the facts an investor asks about (mineral, step, capacity, money, owners,
// partners, feedstock, state support), the first promise against delivery, a dated timeline and
// every source. Rows appear only where the data has a sourced value.
import type { Entity } from "../lib/types";
import { esc, fmtDate, fmtInvestment, fmtNum, fmtQuantity, place } from "../lib/format";
import { hasProfile, mineralChips, months, seeAlsoLabel, sourceList, TIER } from "./parts";
import { colorOf } from "../data";

const LAYER_LABEL: Record<string, string> = {
  mines: "Mine", processing: "Processing and refining", materials: "Battery materials", magnets: "Rare earths and magnets",
  rnd: "Research", overseas: "Asset abroad", demand: "Demand: cells and devices", blocks: "Auction block", recycling: "Recycling",
};
const ROLE: Record<string, string> = {
  technology: "technology partner", jv: "joint-venture partner", offtake: "offtaker", epc: "builder (EPC)",
  finance: "financier", supply: "supplier",
};
const FEEDSTOCK_SKIP = new Set(["Not applicable", "Unknown"]);
/** Dated events that the date fields carry; targets go in the promise block instead. */
const DATE_EVENT: [string, string][] = [
  ["announced", "Announced"], ["mou", "MoU signed"], ["approved", "Approved"], ["construction_start", "Construction begins"],
  ["commissioned", "Commissioned"], ["closed", "Closed"], ["reopened", "Restarted"],
];
const ISSUES = "https://github.com/tannmay-python/india-critical-minerals-map/issues/new";

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
const row = (label: string, value: string) => (value ? `<tr><th scope="row">${esc(label)}</th><td>${value}</td></tr>` : "");
const note = (s: string | null | undefined) => (s ? ` <span class="muted">${esc(s)}</span>` : "");

function capacity(e: Entity): string {
  const inst = fmtQuantity(e.capacity?.installed);
  const plan = fmtQuantity(e.capacity?.planned);
  const phase = e.capacity?.planned?.phase;
  const lines = [
    inst && `${esc(inst)}${note("installed")}`,
    plan && `${esc(plan)}${note(`planned${phase ? `, ${phase}` : ""}`)}`,
  ].filter(Boolean);
  if (!lines.length && e.demand?.capacity_gwh) lines.push(`<span class="num">${fmtNum(e.demand.capacity_gwh)}</span> GWh`);
  return lines.join("<br>");
}

function partners(e: Entity): string {
  const byName = new Map<string, { country?: string; roles: string[] }>();
  for (const p of e.partners ?? []) {
    const cur = byName.get(p.name) ?? { country: p.country, roles: [] };
    if (p.role) cur.roles.push(ROLE[p.role] ?? p.role);
    byName.set(p.name, cur);
  }
  return [...byName]
    .map(([name, v]) => `${esc(name)}${v.country && v.country !== "India" ? ` (${esc(v.country)})` : ""}${v.roles.length ? note(v.roles.join(", ")) : ""}`)
    .join("<br>");
}

function facts(e: Entity): string {
  const os = e.overseas;
  const owners = (e.owners ?? [])
    .map((o) => `${esc(o.entity)}${o.stake_pct !== null && o.stake_pct !== undefined ? ` <span class="num">${fmtNum(o.stake_pct)}%</span>` : ""}`)
    .join("<br>");
  const feed = e.feedstock && !FEEDSTOCK_SKIP.has(e.feedstock) ? e.feedstock : "";
  const feedstock = feed || e.feedstock_detail ? `${esc(feed || e.feedstock_detail)}${feed && e.feedstock_detail ? note(e.feedstock_detail) : ""}` : "";
  const support = e.scheme_links
    .map((s) => `${esc(s.name)}${note([s.role === "bidder" ? "bidder" : "", e.scheme_status[s.id] ?? ""].filter(Boolean).join(", "))}`)
    .join("<br>");
  const funding = e.rnd?.funding;
  return [
    row("Minerals", mineralChips(e)),
    row("Step in the chain", esc(e.stages.join(" · "))),
    row("Products", esc((e.products ?? []).join(", ") || e.demand?.product || "")),
    row("Inputs", sameSet(e.demand?.inputs ?? [], e.minerals) ? "" : esc((e.demand?.inputs ?? []).join(", "))),
    row("Capacity", capacity(e)),
    row("Investment", fmtInvestment(e) ? `${esc(fmtInvestment(e))}${note(e.investment?.basis)}` : ""),
    row("Operator", e.operator ? `${esc(e.operator)}${note(e.operator_type)}` : ""),
    row("Owners", owners),
    row("Indian holders", esc(os?.indian_entities.join(", ") ?? "")),
    row("Stake", os?.stake_pct !== null && os?.stake_pct !== undefined ? `<span class="num">${fmtNum(os.stake_pct)}%</span>` : ""),
    row("Deal", esc(os?.deal_type ?? "")),
    row("Partners", partners(e)),
    row("Feedstock", feedstock),
    row("Government support", support),
    row("Institution", esc(e.rnd?.institution_type ?? "")),
    row("Research focus", esc((e.rnd?.focus ?? []).join("; "))),
    row("Funding", funding && (funding.amount || funding.funder) ? esc([funding.amount ? `${fmtNum(funding.amount)} ${funding.currency ?? ""}`.trim() : "", funding.funder ?? ""].filter(Boolean).join(" · ")) : ""),
    row("Location", esc(place(e))),
  ].join("");
}

function promise(e: Entity): string {
  const p = e.promise;
  if (!p) return "";
  const cell = (label: string, value: string) => `<div><span class="eyebrow">${esc(label)}</span><strong>${value}</strong></div>`;
  const verdict =
    p.state === "delivered" ? (p.months > 0 ? `${months(p.months)} late` : "On time")
    : p.state === "revised" ? `Moved ${months(p.months)} later`
    : p.state === "overdue" ? `${months(p.months)} past the first date, not delivered`
    : "Not yet due";
  const tone = p.state === "pending" ? "pending" : p.state === "overdue" ? "bad" : p.state === "delivered" && p.months <= 0 ? "good" : "late";
  return `
    <h2>Promised and delivered</h2>
    <div class="promise tone-${tone}">
      ${cell("First promised", esc(fmtDate(p.due)))}
      ${p.now ? cell(p.state === "delivered" ? "Revised to" : "Now due", esc(fmtDate(p.now))) : ""}
      ${cell(p.restart ? "Restarted" : "Delivered", p.done ? esc(fmtDate(p.done)) : "Not yet")}
      <p class="verdict">${verdict}</p>
    </div>
    <p class="note">"First promised" is the earliest dated target found in the sources, which may itself be a revision.</p>`;
}

function timeline(e: Entity): string {
  const src = new Map(e.sources.map((s) => [s.id, s]));
  const supporting = (field: string) => e.sources.find((s) => s.supports?.includes(`dates.${field}`));
  const items: { date: string; event: string; source?: (typeof e.sources)[number] }[] = e.milestones
    .filter((m) => m.date && m.event)
    .map((m) => ({ date: m.date, event: m.event, source: m.source_id ? src.get(m.source_id) : undefined }));
  const taken = new Set(items.map((i) => i.date));
  for (const [field, label] of DATE_EVENT) {
    const d = e.dates[field];
    if (d && !taken.has(d)) { items.push({ date: d, event: label, source: supporting(field) }); taken.add(d); }
  }
  const first = e.dates.first_public;
  if (first && !taken.has(first) && !items.some((i) => i.date < first))
    items.push({ date: first, event: "First public record", source: supporting("first_public") });
  if (!items.length) return "";
  items.sort((a, b) => a.date.localeCompare(b.date));
  const li = items.map((i) => `<li><time class="num">${esc(fmtDate(i.date))}</time><div><p>${esc(i.event)}</p>${
    i.source ? `<a class="muted" href="${esc(i.source.url)}" target="_blank" rel="noopener"><span class="tier tier-${esc(i.source.tier)}">${TIER[i.source.tier] ?? ""}</span>${esc(i.source.publisher || i.source.title)}</a>` : ""}</div></li>`);
  return `<h2>Timeline</h2><ol class="timeline">${li.join("")}</ol>`;
}

export function renderProfile(el: HTMLElement, e: Entity, byId: Map<string, Entity>): void {
  const related = e.related
    .map((id) => byId.get(id))
    .filter((r): r is Entity => !!r)
    .map((r) => `<li><a href="#/${hasProfile(r) ? "p" : "e"}/${encodeURIComponent(r.id)}">${esc(r.name)}</a> <span class="muted">${esc(LAYER_LABEL[r.layer] ?? "")} · ${esc(r.status)}</span></li>`)
    .join("");
  const more = e.see_also
    .map((u) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(seeAlsoLabel(u))}</a></li>`)
    .join("");
  const issue = `${ISSUES}?title=${encodeURIComponent(`Correction: ${e.name}`)}&body=${encodeURIComponent(`Record: ${e.id}\n\nWhat should change, with a source:\n`)}`;
  const back = `#/?id=${encodeURIComponent(e.id)}`;

  el.innerHTML = `
    <article class="page profile">
      <p><a class="back" href="${back}">← Back to the map</a></p>
      <span class="pill"><i class="band-dot" style="--c:${colorOf(e)}"></i>${esc(LAYER_LABEL[e.layer] ?? e.layer)}</span>
      <h1 tabindex="-1">${esc(e.name)}</h1>
      ${e.operator ? `<p class="profile-sub">${esc(e.operator)}</p>` : ""}
      <p class="status status-${e.status_group}"><strong>${esc(e.status)}</strong><span class="muted">as of ${fmtDate(e.status_as_of)}</span>${e.confidence === "low" ? `<span class="tag">Unconfirmed</span>` : ""}</p>
      ${e.status_detail ? `<p class="status-detail">${esc(e.status_detail)}</p>` : ""}
      ${e.narrative.what_it_does ? `<p class="lede">${esc(e.narrative.what_it_does)}</p>` : ""}
      ${e.narrative.why_it_matters ? `<p>${esc(e.narrative.why_it_matters)}</p>` : ""}

      <h2>Key facts</h2>
      <table class="facts-table"><tbody>${facts(e)}</tbody></table>
      ${promise(e)}
      ${timeline(e)}
      ${related ? `<h2>Related</h2><ul class="plain">${related}</ul>` : ""}
      ${more ? `<h2>Elsewhere</h2><ul class="plain">${more}</ul>` : ""}
      <h2>Sources</h2>
      ${sourceList(e)}
      <p class="note profile-foot">Checked ${fmtDate(e.last_verified)}. Every fact above cites a dated source. <a href="${esc(issue)}" target="_blank" rel="noopener">Suggest a correction</a> · <a href="${back}">Show on the map</a></p>
    </article>`;
}
