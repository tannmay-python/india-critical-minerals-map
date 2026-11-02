// Pieces shared by the map drawer and the full profile page.
import type { Entity } from "../lib/types";
import { esc, fmtDate } from "../lib/format";

/** Records that get a full profile page; auction blocks and registry recyclers keep the drawer. */
const PROFILE_LAYERS = new Set(["mines", "processing", "materials", "magnets", "rnd", "overseas", "demand"]);
export const hasProfile = (e: Entity): boolean => PROFILE_LAYERS.has(e.layer);

/** Source tiers in words a reader can weigh (RESEARCH_PROTOCOL §2). */
export const TIER: Record<string, string> = { T1: "Official", T2: "Company", T3: "Press", T4: "Other", T5: "Other" };

export function mineralChips(e: Entity): string {
  return e.minerals
    .map((m) => {
      const link = e.dashboard_links.find((d) => d.name === m);
      return link
        ? `<a class="chip" href="${esc(link.url)}" target="_blank" rel="noopener">${esc(m)}</a>`
        : `<span class="chip">${esc(m)}</span>`;
    })
    .join("");
}

export function sourceList(e: Entity): string {
  const items = e.sources.map((s) => {
    const meta = [s.publisher, fmtDate(s.date)].filter(Boolean).map(esc).join(" · ");
    return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><span class="muted"><span class="tier tier-${esc(s.tier)}">${TIER[s.tier] ?? ""}</span>${meta}${s.archive_url ? ` · <a href="${esc(s.archive_url)}" target="_blank" rel="noopener">archived copy</a>` : ""}</span></li>`;
  });
  return `<ol class="sources">${items.join("")}</ol>`;
}

export const months = (m: number): string => `<span class="num">${m}</span> month${m === 1 ? "" : "s"}`;

/** The first dated target against what happened, in one line: delivered (late or on time), moved, or past due. */
export function promiseText(e: Entity): string {
  const p = e.promise;
  if (!p) return "";
  const due = esc(fmtDate(p.due));
  const verb = p.restart ? "restarted" : "delivered";
  if (p.state === "delivered")
    return p.months > 0
      ? `${due}; ${verb} ${esc(fmtDate(p.done))}, ${months(p.months)} late`
      : `${due}; ${verb} ${esc(fmtDate(p.done))}, on time`;
  if (p.state === "revised") return `${due}; now ${esc(fmtDate(p.now))}, ${months(p.months)} later`;
  if (p.state === "overdue") return `${due}; not delivered, ${months(p.months)} past`;
  return due;
}

/** "https://fabs.pranaykotas.com/..." -> "India Semiconductor Tracker"; anything else -> its host name. */
export function seeAlsoLabel(u: string): string {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    return h === "fabs.pranaykotas.com" ? "India Semiconductor Tracker" : h;
  } catch {
    return u;
  }
}
