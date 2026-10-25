// About and data: how to read the map, what it covers, downloads, credits.
// One page, kept short; the map is the product.
import type { Dataset } from "../data";
import { esc, fmtDate } from "../lib/format";
import { currentTheme } from "../lib/theme";

const LAYERS: { id: string; label: string; what: string }[] = [
  { id: "blocks", label: "Auction blocks", what: "Critical-mineral blocks offered by the Centre and the states, with each tranche's outcome" },
  { id: "mines", label: "Mines", what: "Operating mines, including zinc-lead mines as cadmium sources" },
  { id: "processing", label: "Processing and refining", what: "Smelters, refineries, by-product recovery, silicon and processing parks" },
  { id: "materials", label: "Battery materials", what: "Cathode, anode, electrolyte, foil and other cell materials" },
  { id: "magnets", label: "Rare earths and magnets", what: "Rare-earth separation, metals and permanent-magnet plants" },
  { id: "recycling", label: "Recycling", what: "Registered battery recyclers and other critical-mineral recovery" },
  { id: "rnd", label: "Research", what: "Centres of Excellence and national labs" },
  { id: "overseas", label: "Abroad", what: "Assets Indian entities hold abroad, and their bids and evaluations" },
  { id: "demand", label: "Demand", what: "Cell plants of 1 GWh or more and gallium-using fabs (off by default)" },
];

export function renderAbout(el: HTMLElement, data: Dataset): void {
  const theme = currentTheme();
  const n = (layer: string) => data.entities.filter((e) => e.layer === layer).length;
  const stages = data.stages
    .filter((s) => data.entities.some((e) => e.stages.includes(s.id)))
    .map((s) => `<li><i class="dot" style="background:${s.color[theme]}"></i>${esc(s.id)}</li>`)
    .join("");
  const layers = LAYERS.map(
    (l) => `<tr><th scope="row">${esc(l.label)}</th><td class="num">${n(l.id)}</td><td>${esc(l.what)}</td></tr>`,
  ).join("");
  const downloads = LAYERS.map((l) => `<a href="downloads/${l.id}.csv" download>${esc(l.label)}</a>`).join(" · ");

  el.innerHTML = `
    <article class="page about">
      <p><a class="back" href="#/">← Back to the map</a></p>
      <span class="pill">About and data</span>
      <h1>India Critical Minerals Project Map</h1>
      <p class="lede">Where India's critical-minerals projects are, from auctioned blocks to magnet plants, and what Indian entities hold abroad. Every record cites dated sources.</p>

      <h2>Reading the map</h2>
      <div class="legend">
        <div><h3>Colour is the stage</h3><ul class="stage-list">${stages}</ul></div>
        <div><h3>Fill is the status</h3><ul class="key">
          <li><i class="glyph glyph-active"></i>Operating, licensed or held</li>
          <li><i class="glyph glyph-pipeline"></i>In progress: announced to under construction, or still at auction</li>
          <li><i class="glyph glyph-inactive"></i>Annulled, stalled, closed, lost or withdrawn</li>
          <li><i class="glyph glyph-approx"></i>Soft halo: location known only to the district or state</li>
          <li><i class="glyph glyph-faint"></i>Faint: demand sites, and unconfirmed records when shown</li>
          <li><i class="line-key"></i>Abroad: solid line for assets held, dashed for bids and evaluations</li>
        </ul></div>
      </div>

      <h2>What is included</h2>
      <table class="layers"><tbody>${layers}</tbody></table>
      <p class="note">Left out by design: coking coal; bauxite, manganese, chromite, zinc and lead except where they yield a listed critical mineral; lead-acid battery recycling; scrap copper refining; ferro-silicon; fertiliser phosphates.</p>

      <h2>Data</h2>
      <p>CSV by layer: ${downloads}. All records with coordinates: <a href="downloads/all-entities.geojson" download>GeoJSON</a>. Data under CC BY 4.0. Updated ${fmtDate(data.meta.built.slice(0, 10))}.</p>

      <h2>Credits</h2>
      <p>Tannmay Kumarr Baid and Shobhankita Reddy, High-Tech Geopolitics Programme, Takshashila Institution. Companion to the <a href="https://indiacriticalminerals.com" target="_blank" rel="noopener">India Critical Minerals Dashboard</a> and Pranay Kotasthane's <a href="https://fabs.pranaykotas.com" target="_blank" rel="noopener">India Semiconductor Tracker</a>.</p>
      <p class="note">India's boundary: DataMeet composite (Survey of India depiction), CC0; states: DataMeet, CC BY 4.0; world: Natural Earth, India's point of view. Basemap: OpenFreeMap, OpenMapTiles, © OpenStreetMap contributors.</p>
    </article>`;
}
