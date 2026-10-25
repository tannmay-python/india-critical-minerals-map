// Browser QA (BUILD_SPEC §6): count parity with entities.json, deep links, filter links,
// console errors, screenshots at three widths, and boundary close-ups.
// Usage: npm run dev (or preview), then  node scripts/qa.mjs [base-url]
// Screenshots go to qa/screenshots/ (git-ignored). Exits non-zero on any problem.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5179/";
const OUT = "qa/screenshots";
fs.mkdirSync(OUT, { recursive: true });
const ents = JSON.parse(fs.readFileSync("public/data/entities.json", "utf8"));
const problems = [];
const say = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) problems.push(msg); };

// ---- the panel's filter rules, restated independently of the app code
const viewOf = (e) => (e.layer === "overseas" ? "abroad" : "india");
const region = (e) => (e.layer === "overseas" ? e.location.country ?? "" : e.location.state ?? e.location.country ?? "");
function expected(query) {
  const q = new URLSearchParams(query);
  const view = q.get("view") === "abroad" ? "abroad" : "india";
  const demand = q.get("demand") === "1", unconf = q.get("unconfirmed") === "1";
  const stages = (q.get("stage") ?? "").split(",").filter(Boolean);
  const groups = (q.get("status") ?? "active,pipeline,inactive").split(",");
  const mineral = q.get("mineral") ?? "", state = q.get("state") ?? "", scheme = q.get("scheme") ?? "";
  return ents.filter((e) => viewOf(e) === view && (demand || e.layer !== "demand") && (unconf || e.confidence !== "low") &&
    (!stages.length || e.layer === "demand" || e.stages.some((s) => stages.includes(s))) &&
    groups.includes(e.status_group) &&
    (!mineral || e.minerals.includes(mineral) || (e.minerals_expanded ?? []).includes(mineral)) &&
    (!state || region(e) === state) &&
    (!scheme || (e.scheme_links ?? []).some((s) => s.id === scheme))).length;
}

// A cached Chromium can be used when the pinned Playwright build is not downloaded: QA_CHROMIUM=/path/to/chrome
const browser = await chromium.launch(process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {});
let n = 0;
async function fresh(hash, size = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport: size });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`console ${m.type()} at ${hash}: ${m.text()}`); });
  page.on("pageerror", (err) => problems.push(`page error at ${hash}: ${err.message}`));
  await page.goto(`${BASE}?qa=${n++}#/${hash}`);
  await page.waitForSelector(".count strong", { timeout: 20000 });
  return page;
}
async function settle(page) { // wait for tiles, if the dev map hook is present
  await page.evaluate(() => new Promise((res) => {
    const m = window.__icmMap; if (!m) return setTimeout(res, 2500);
    const t = setTimeout(res, 12000); m.once("idle", () => { clearTimeout(t); setTimeout(res, 500); }); m.triggerRepaint();
  }));
}
const shownCount = async (page) => Number(await page.textContent(".count strong"));

// 1. default view parity, plus filter links that must restore exactly
const filterLinks = [
  "", "?view=abroad", "?demand=1", "?stage=Refining,Magnets", "?mineral=Lithium", "?view=abroad&state=Argentina",
  "?scheme=repm", "?status=active", "?demand=1&state=Karnataka", "?mineral=Graphite&status=pipeline", "?unconfirmed=1",
];
for (const q of filterLinks) {
  const page = await fresh(q);
  const got = await shownCount(page), want = expected(q.slice(1));
  say(got === want, `count ${q || "(default)"}: shown ${got}, data ${want}`);
  const hash = decodeURIComponent(new URL(page.url()).hash).replace(/%2C/g, ",");
  for (const kv of q.slice(1).split("&").filter(Boolean)) say(hash.includes(kv), `link keeps ${kv}`);
  await page.close();
}

// 2. stage chip counts on the default view equal the data
{
  const page = await fresh("");
  const chips = await page.$$eval("[data-stage]", (els) => els.map((b) => [b.dataset.stage, Number(b.querySelector(".n").textContent)]));
  for (const [st, c] of chips) {
    const want = ents.filter((e) => viewOf(e) === "india" && e.layer !== "demand" && e.confidence !== "low" && e.stages.includes(st)).length;
    say(c === want, `stage chip ${st}: ${c} vs ${want}`);
  }
  await settle(page);
  await page.screenshot({ path: `${OUT}/map-india-1440.png` });
  await page.close();
}

// 3. record links: ten spread across the data, plus the #/e/<id> form
const picks = ents.filter((_, i) => i % Math.floor(ents.length / 10) === 3).slice(0, 10);
for (const e of picks) {
  const page = await fresh(`?id=${encodeURIComponent(e.id)}`);
  const title = await page.textContent("#drawer-title", { timeout: 10000 }).catch(() => null);
  say(title === e.name, `record link ${e.id}`);
  await page.close();
}
{
  const e = ents.find((x) => x.layer === "overseas");
  const page = await fresh(`e/${e.id}`);
  say((await page.textContent("#drawer-title")) === e.name, `record path e/${e.id}`);
  await page.close();
}

// 4. interactions: switch view, search, open, about
{
  const page = await fresh("");
  await page.click('[data-view="abroad"]');
  say((await shownCount(page)) === expected("view=abroad"), "Abroad switch count");
  await settle(page);
  await page.screenshot({ path: `${OUT}/map-abroad-1440.png` });
  await page.fill("#search-input", "Exide");
  await page.waitForSelector("#search-results li");
  await page.keyboard.press("Enter");
  say((await page.textContent("#drawer-title"))?.startsWith("Exide"), "search opens Exide and returns to India");
  await settle(page);
  await page.screenshot({ path: `${OUT}/drawer-1440.png` });
  await page.selectOption('[data-select="mineral"]', "Lithium");
  await page.waitForSelector(".chain");
  await page.screenshot({ path: `${OUT}/mineral-lithium-1440.png` });
  await page.click(".header-link");
  await page.waitForSelector(".about h1");
  await page.screenshot({ path: `${OUT}/about-1440.png`, fullPage: false });
  await page.close();
}

// 5. other widths
for (const [w, h] of [[768, 1024], [375, 812]]) {
  const page = await fresh("", { width: w, height: h });
  await settle(page);
  await page.screenshot({ path: `${OUT}/map-india-${w}.png` });
  await page.close();
}

// 6. boundary close-ups: J&K and Ladakh, Arunachal; India view and the world view
for (const [name, center, zoom] of [["jk-ladakh", [76.8, 34.6], 5.6], ["arunachal", [94.3, 28.0], 6]]) {
  for (const v of ["", "?view=abroad"]) {
    const page = await fresh(v);
    await page.evaluate(([c, z]) => window.__icmMap?.jumpTo({ center: c, zoom: z }), [center, zoom]);
    await settle(page);
    await page.screenshot({ path: `${OUT}/boundary-${name}${v ? "-world" : ""}.png` });
    await page.close();
  }
}

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join("\n- ")}` : "\nAll checks passed.");
process.exit(problems.length ? 1 : 0);
