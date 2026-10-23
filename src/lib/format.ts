// Display helpers. Keep every label short; the data carries the detail.
import type { Entity, Quantity } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07-29" -> "29 Jul 2026"; "2026-07" -> "Jul 2026"; "2026" -> "2026". */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!m) return y;
  const mon = MONTHS[Number(m) - 1] ?? m;
  return d ? `${Number(d)} ${mon} ${y}` : `${mon} ${y}`;
}

export function fmtNum(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : String(v);
}

export function fmtInvestment(e: Entity): string {
  const i = e.investment;
  if (!i || i.amount === null || i.amount === undefined) return "";
  const a = fmtNum(i.amount);
  if (i.currency === "INR_crore") return `₹${a} crore`;
  if (i.currency === "USD_million") return `US$${a} million`;
  return `${a} ${i.currency ?? ""}`.trim();
}

export function fmtQuantity(q: Quantity | undefined | null): string {
  if (!q || q.value === null || q.value === undefined) return "";
  return [fmtNum(q.value), q.unit, q.basis].filter(Boolean).join(" ");
}

const CONCESSION: Record<string, string> = {
  CL: "Composite licence", ML: "Mining lease", EL: "Exploration licence",
  "Offshore-CL": "Offshore composite licence", "Offshore-PL": "Offshore production lease",
  "ISA-contract": "ISA exploration contract", "ISA-application": "ISA application",
};
export const concessionLabel = (c: string | undefined | null): string => (c ? CONCESSION[c] ?? c : "");

const STATE_CODE: Record<string, string> = {
  AP: "Andhra Pradesh", BR: "Bihar", CG: "Chhattisgarh", GJ: "Gujarat", JH: "Jharkhand", KA: "Karnataka",
  MH: "Maharashtra", MP: "Madhya Pradesh", OD: "Odisha", RJ: "Rajasthan", TN: "Tamil Nadu", UP: "Uttar Pradesh",
};

/** "Centre-T5" -> "Centre tranche 5"; "MP-Phase-XI" -> "Madhya Pradesh phase XI"; "RJ-2025-09" -> "Rajasthan, Sep 2025". */
export function trancheLabel(t: string): string {
  let m = /^Centre-T(\d+)$/.exec(t);
  if (m) return `Centre tranche ${m[1]}`;
  if ((m = /^Centre-EL(\d+)$/.exec(t))) return `Centre exploration licence tranche ${m[1]}`;
  if ((m = /^Offshore-T(\d+)$/.exec(t))) return `Offshore tranche ${m[1]}`;
  if ((m = /^([A-Z]{2})-(.+)$/.exec(t)) && STATE_CODE[m[1]]) {
    const st = STATE_CODE[m[1]];
    const rest = m[2];
    let r: RegExpExecArray | null;
    if ((r = /^EL-Phase-(\w+)$/.exec(rest))) return `${st} exploration licence phase ${r[1]}`;
    if ((r = /^EL-(\d{4})$/.exec(rest))) return `${st} exploration licence, ${r[1]}`;
    if ((r = /^Phase-(\w+)$/.exec(rest))) return `${st} phase ${r[1]}`;
    if ((r = /^(\d{4})-(\d{2})$/.exec(rest))) return `${st}, ${fmtDate(`${r[1]}-${r[2]}`)}`;
    if ((r = /^(\d{4})-2nd$/.exec(rest))) return `${st}, ${r[1]} second round`;
    return `${st}, ${rest.replace(/-/g, " ")}`;
  }
  return t.replace(/-/g, " ");
}

export function place(e: Entity): string {
  const l = e.location;
  const parts = [l.village_or_town, l.district, l.state].filter(Boolean) as string[];
  if (!parts.length) return l.country ?? "";
  if (l.country && l.country !== "India") parts.push(l.country);
  return [...new Set(parts)].join(", ");
}

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
