// Detail panel for one record: what it is, where it stands, the key numbers, and the sources.
import type { Entity } from "../lib/types";
import { concessionLabel, esc, fmtDate, fmtInvestment, fmtNum, fmtQuantity, place, trancheLabel } from "../lib/format";
import { hasProfile, mineralChips, promiseText, seeAlsoLabel, sourceList } from "./parts";

function row(label: string, value: string): string {
  return value ? `<dt>${esc(label)}</dt><dd>${value}</dd>` : "";
}

function auction(e: Entity): string {
  const h = e.auction?.history ?? [];
  if (!h.length) return "";
  const items = [...h].reverse().map((o) => {
    const bits = [`<span class="a-tranche">${esc(trancheLabel(o.tranche))}</span>`];
    let what = esc(o.outcome);
    if (o.preferred_bidder) {
      what = `${esc(o.outcome)}: ${esc(o.preferred_bidder)}${o.final_offer_pct !== null ? ` <span class="num">(${fmtNum(o.final_offer_pct)}%)</span>` : ""}`;
    }
    bits.push(`<span>${what}</span>`);
    const when = fmtDate(o.outcome_date ?? o.nit_date);
    if (when) bits.push(`<span class="muted">${when}</span>`);
    return `<li>${bits.join("")}</li>`;
  });
  return `<ol class="auction">${items.join("")}</ol>`;
}

function milestones(e: Entity): string {
  const items = e.milestones
    .filter((m) => m.date && m.event)
    .map((m) => `<li><span class="muted num">${esc(fmtDate(m.date))}</span><span>${esc(m.event)}</span></li>`);
  return items.length ? `<ol class="auction">${items.join("")}</ol>` : "";
}

export function renderDrawer(el: HTMLElement, e: Entity, byId: Map<string, Entity>): void {
  const stageDots = e.stages.map((s) => `<span class="stage">${esc(s)}</span>`).join("");

  const isBlock = e.layer === "blocks";
  const blk = e.block;
  const cap = fmtQuantity(e.capacity?.installed) || (fmtQuantity(e.capacity?.planned) ? `${fmtQuantity(e.capacity?.planned)} (planned)` : "");
  const loc = place(e);

  const os = e.overseas;
  const schemes = e.scheme_links.map((s) => esc(s.role === "bidder" ? `${s.name} (bidder)` : s.name)).join("<br>");
  const related = e.related
    .map((id) => byId.get(id))
    .filter((r): r is Entity => !!r)
    .map((r) => `<a href="#" data-open="${esc(r.id)}">${esc(r.name)}</a>`)
    .join("<br>");
  const seeAlso = e.see_also
    .map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(seeAlsoLabel(u))}</a>`)
    .join("<br>");

  const facts = [
    row("Minerals", mineralChips(e)),
    row("Indian holders", esc(os?.indian_entities.join(", ") ?? "")),
    row("Stake", os?.stake_pct !== null && os?.stake_pct !== undefined ? `<span class="num">${fmtNum(os.stake_pct)}%</span>` : ""),
    row("Deal", esc(os?.deal_type ?? "")),
    row(isBlock ? "Preferred bidder" : "Operator", esc(isBlock ? lastBidder(e) : e.operator ?? "")),
    row("Product", esc(e.demand?.product ?? "")),
    row("Concession", esc(concessionLabel(blk?.concession_type))),
    row("Area", blk?.area_sq_km ? `<span class="num">${fmtNum(blk.area_sq_km)}</span> sq km${blk.exploration_stage ? ` · ${esc(blk.exploration_stage)} exploration` : ""}` : ""),
    row("Capacity", esc(cap)),
    row("Investment", esc(fmtInvestment(e))),
    row("Location", esc(loc)),
    row("Promised", promiseText(e)),
    row("Schemes", schemes),
    row("Related", related),
    row("More", seeAlso),
  ].join("");

  const narrative = e.narrative.what_it_does;
  const why = isBlock ? "" : e.narrative.why_it_matters;

  el.innerHTML = `
    <div class="drawer-head">
      <div class="stages">${stageDots}</div>
      <button class="icon-btn drawer-copy" type="button" aria-label="Copy link to this record" title="Copy link">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </button>
      <button class="icon-btn drawer-close" type="button" aria-label="Close">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
    <h2 id="drawer-title" tabindex="-1">${esc(e.name)}</h2>
    <p class="status status-${e.status_group}"><strong>${esc(e.status)}</strong><span class="muted">as of ${fmtDate(e.status_as_of)}</span>${e.confidence === "low" ? `<span class="tag">Unconfirmed</span>` : ""}</p>
    ${e.status_detail ? `<p class="status-detail">${esc(e.status_detail)}</p>` : ""}
    ${narrative ? `<p class="lede">${esc(narrative)}</p>` : ""}
    ${why ? `<p>${esc(why)}</p>` : ""}
    ${hasProfile(e) ? `<a class="profile-link" href="#/p/${encodeURIComponent(e.id)}">Full profile<span aria-hidden="true">→</span></a>` : ""}
    <dl class="facts">${facts}</dl>
    ${isBlock && e.auction?.history?.length ? `<h3>Auction history</h3>${auction(e)}` : ""}
    ${!isBlock && milestones(e) ? `<h3>Milestones</h3>${milestones(e)}` : ""}
    <h3>Sources</h3>
    ${sourceList(e)}
  `;
  const copy = el.querySelector<HTMLButtonElement>(".drawer-copy")!;
  copy.onclick = () => {
    navigator.clipboard?.writeText(location.href).then(
      () => { copy.classList.add("done"); copy.title = "Copied"; setTimeout(() => { copy.classList.remove("done"); copy.title = "Copy link"; }, 1500); },
      () => { /* clipboard blocked: the address bar still holds the link */ },
    );
  };
}

function lastBidder(e: Entity): string {
  const h = [...(e.auction?.history ?? [])].reverse().find((o) => o.preferred_bidder);
  return h?.preferred_bidder ?? "";
}
