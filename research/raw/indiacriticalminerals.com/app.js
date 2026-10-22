/* ============================================================
   CRITICAL MINERALS DASHBOARD — Application Logic
   Takshashila Institution · India Critical Minerals Analysis

   DATA EDITING GUIDE:
   ─ Add / remove a mineral : edit data/minerals_data.json AND data/group_assignments.json
   ─ Change a score          : find the mineral in minerals_data.json → edit vector score/composite
   ─ Edit justification text : find the mineral in minerals_data.json → edit vector "reason"
   ─ Update criteria bands   : edit data/criteria_data.json (the "bands" array per vector)
   ─ Change group assignment : edit data/group_assignments.json
   ─ Change colors / theme   : edit :root variables in style.css
   ============================================================ */

'use strict';

/* ── App Data (populated by loadData()) ────────────────────── */
const AppData = {
  minerals:         [],   // array of mineral objects from minerals_data.json
  criteriaVectors:  [],   // array of vector defs from criteria_data.json
  groups:           [],   // array of group defs from criteria_data.json
  groupAssignments: {},   // { "Beryllium": 4, ... } from group_assignments.json
};

/* ── App State ─────────────────────────────────────────────── */
const AppState = {
  currentPage:        'overview',
  selectedMineral:    null,
  compareSelections:  { a: '', b: '', c: '' },
  explorerSearch:     '',
  explorerGroupFilter:'all',
  explorerSort:       '',
  radarChartMineral:  null, // Chart.js instance
  radarChartCompare:  null, // Chart.js instance
  radarChartCriteria: null, // Chart.js instance
};

/* ── Compare series colors ─────────────────────────────────── */
const COMPARE_COLORS = ['#620d3c', '#f1a222', '#3d6b7d'];

/* ── Group descriptions (from paper) ──────────────────────── */
const GROUP_DESCRIPTIONS = {
  1: {
    tagline: 'Defined by scale, not monopoly leverage.',
    body: `Every mineral here is consumed in hundreds of thousands to millions of tonnes annually. Supply is comparatively diffuse: no single country monopolises mining, and while China dominates refining for some, none approaches the leverage it holds over rare earths. The binding risk is sheer volume: these minerals power construction, energy, transport, and agriculture so broadly that a sustained shortfall would transmit immediately across the entire economy.\n\nCobalt and lithium sit here despite their high import dependence and price volatility because their defining feature is the same as the others: the risk arises from the scale of demand, not from a chokepoint that one supplier controls. Potash and phosphorus, the two primary plant nutrients that have to be mined rather than made, sit here for the same reason: India's exposure is the sheer tonnage it imports for fertiliser. The policy question for this group is not who controls them but whether India has sufficient industrial processing capacity and strategic reserves to absorb a price spike or temporary disruption.`,
    policy: [
      `Aggressively scale up midstream processing infrastructure: target capital-intensive midstream, specifically chemical refining, smelting and precursor manufacturing. Incentivise KABIL and private conglomerates to move beyond upstream mining exploration and invest in overseas processing facilities within resource-rich, friendly nations.`,
      `Diversify supply through international partnerships.`,
      `Scale secondary scrap infrastructure and enforce strict extended producer responsibility (EPR) targets.`,
    ],
  },
  2: {
    tagline: 'Substitution sometime away.',
    body: `This is the tightest group in the dataset, and the one where India's exposure is most acute and its options fewest. Every rare earth here scores at or near the maximum on three vectors simultaneously: refining concentration, reserve concentration, and extraction complexity. Reserves are locked in ion-adsorption clay deposits in southern China and Myanmar. The refining process, multi-stage solvent extraction of chemically near-identical elements, requires capability that no Indian facility has at commercial scale; outside China, only Lynas's plant in Malaysia has begun producing separated heavy rare earths commercially (from May 2025). Substitution is either technically impossible or requires a fundamental product redesign that takes years.\n\nChina's monopoly in these minerals is the hardest to dent in the immediate term. The April 2025 export controls caused Western market prices to triple within weeks, and Indian automotive and EV manufacturers were among the first firms denied licenses.\n\nWe did an explainer and state-of-the-market analysis on rare-earth-free EV motors. <a href="https://tannmay-python.github.io/pmsm-alternatives-visualizations/" target="_blank" rel="noopener noreferrer">Check it out here</a>.`,
    policy: [
      `Aggressively execute the Sintered Rare Earth Permanent Magnet (REPM) scheme.`,
      `Pursue joint stockpiling through international partnerships.`,
      `Ultimately, the way out may be to make these minerals obsolete, specifically via Synchronous Reluctance Motors (SynRM) and induction motors that eliminate rare-earth permanent magnets entirely.`,
    ],
  },
  3: {
    tagline: 'High recycling rates and high-value applications define this group.',
    body: `The commonality in this group lies in high recycling. Reserves for minerals here tend to be concentrated, but are also long-lived relative to demand. This group largely consists of platinum group elements (PGEs) alongside indium, beryllium, hafnium and tantalum, all of which follow similar characterisations: technically demanding to produce, expensive, and consumed in small volumes for high-value applications.\n\nBecause they are expensive and widely deployed in industrial catalysts, electronics, and medical devices, secondary recovery is commercially viable in a way it is not for cheaper, more widely dispersed minerals. This does not make them without risk, reserves are concentrated and extraction barriers are high, but the closed-loop dynamic gives the supply chain a resilience that the heavy rare earths group lacks entirely. The intervention point for this group is maintaining and deepening recycling infrastructure rather than upstream mining investment.`,
    policy: [
      `Double down on recycling. India's transition to Bharat Stage VI (BS-VI) emission standards means a massive, rapidly maturing pool of platinum, palladium and rhodium riding inside vehicle catalytic converters. The National Green Hydrogen Mission also relies heavily on Proton Exchange Membrane (PEM) electrolyzers, which need some of these minerals.`,
      `Streamline collection networks through cross-border B2B "strategic scrap" exchange, introduce specific EPR credits, and expand recycling facilities.`,
    ],
  },
  4: {
    tagline: 'High concentration. Low volatility. The monopoly not being exercised.',
    body: `This group is a direct corrective to the assumption that concentration automatically signals danger. Every member here is dominated by a single country or producer, yet this group records the lowest price volatility and weakest demand growth of any of the six. The monopoly is real; it is simply not being exercised, at least not yet.\n\nThe reasons differ by mineral. Brazil's CBMM manages niobium supply with deliberate discipline, holding prices stable at around $26/kg over years. Lanthanum and cerium come out of the ground mainly as by-products of mining the more valuable neodymium, so they pile up in oversupply whether or not anyone needs them. Vanadium prices fell 27% in 2024 on weak Chinese steel demand. Europium has so few uses left that almost no one buys it. For policy, what matters is that these minerals could become dangerous if geopolitics shift, but this is not happening currently. Monitoring rather than urgent intervention may be the appropriate posture.`,
    policy: [
      `Leverage early-warning tools to track global shifts, such as Chinese real-estate/steel demand (for vanadium) or production shifts at Brazil's CBMM (for niobium), and implement a "just-in-time" blueprint: if China suddenly weaponises its vanadium or lanthanum supply, a pre-drafted policy automatically triggers, such as fast-tracked waivers for steel-slag processing or immediate customs-duty draw-backs for alternative imports.`,
      `Steel-slag harvesting: for vanadium, mandate that domestic steel giants (like SAIL or JSW) monitor and catalogue the vanadium content in their industrial slag.`,
      `Because Brazil's CBMM deliberately keeps niobium prices stable ($26/kg) to protect market share, India's private infrastructure and defence conglomerates should sign long-term, fixed-price offtake agreements, and the government could use bilateral diplomacy to secure "preferred buyer" status. This locks in supply via state-to-state paperwork rather than capital-heavy asset acquisition.`,
    ],
  },
  5: {
    tagline: 'Reserves are everywhere; the processing chokepoint is widening.',
    body: `This group is characterised by extreme refining concentration paired with rapid demand growth and a diversified reserve base. The reserves are well distributed across multiple countries, so geology is not the constraint. Demand is large and accelerating, driven by EV batteries, solar panels, and semiconductor fabs. Several members score at the maximum on the growth vector. The midstream gap is widening.\n\nGraphite: China controls 90% of battery-grade processing while India targets 150 GW of new battery capacity. Silicon: prices spiked 273% in 2022 when Chinese power rationing shut domestic plants, then collapsed equally fast. Neodymium and praseodymium: every EV motor and wind turbine generator depends on them, and the April 2025 export controls hit this supply chain directly. Gallium: India is the world's fifth-largest bauxite producer but does not yet recover gallium (a demonstration plant at NALCO's Damanjodi refinery broke ground in November 2025). The raw resource is globally available in each case; the processing chokepoint is the problem, and it is actively widening.`,
    policy: [
      `Leverage international partnerships for processing and recycling capacities.`,
      `Diversify supply through international partnerships.`,
    ],
  },
  6: {
    tagline: 'No single sharp bottleneck; mostly mined as by-products.',
    body: `These are the least concentrated minerals supply-wise, and also have the lowest scores on the end-use applications vector. The profile that holds them together is the absence of any extreme: demand is moderate, supply concentration is low to middling, reserves are adequate, and extraction is comparatively undemanding. None presents a single sharp bottleneck that would justify urgent strategic intervention.\n\nSome minerals in this group do have isolated extreme features: antimony, germanium and tellurium have high price volatility scores, and rhenium has no substitute in fighter engine superalloys, but they still share the defining feature of low overall constraint. Interestingly, a majority are mined as by-products of other major minerals: bismuth, germanium, and cadmium are by-products of lead and zinc; selenium, tellurium and rhenium are by-products of copper. Their availability is governed less by dedicated supply chains than by the economics of the host metals they accompany.`,
    policy: [
      `Tighten "companionability reporting" for base-metal miners to log concentrations of bismuth, germanium and cadmium in their zinc/lead ores, and selenium, tellurium and rhenium in their copper ores.`,
      `Introduce a "royalty-offset credit" system: if a domestic zinc smelter invests its own capital to install advanced hydrometallurgical circuits to isolate germanium or bismuth, the government offers a matching discount on its primary zinc mining royalties. Processing and recycling of these minerals should also feature in India's international partnerships to insulate against price volatility.`,
      `Build joint "micro-reserves" for select minerals like rhenium.`,
    ],
  },
  0: {
    tagline: 'Not a commercial mineral. A genuine singleton.',
    body: `When the clustering separates minerals more finely, promethium is the only element that splits off entirely on its own. Promethium is not a commercial mineral. It is radioactive, has no stable isotope, does not occur naturally in extractable quantities, and is produced in gram-scale quantities as a fission by-product in nuclear reactors. The US Department of Energy's Isotope Program is the sole global commercial supplier. There is no commodity market, no price index, and no supply chain in the conventional sense. Its presence on India's critical minerals list, and on most others, appears to be an artefact of completeness.`,
  },
};

/* ════════════════════════════════════════════════════════════
   DATA LOADING
   ════════════════════════════════════════════════════════════ */

async function loadData() {
  try {
    const [mRes, cRes, gRes] = await Promise.all([
      fetch('./data/minerals_data.json'),
      fetch('./data/criteria_data.json'),
      fetch('./data/group_assignments.json'),
    ]);
    const mData = await mRes.json();
    const cData = await cRes.json();
    const gData = await gRes.json();

    AppData.minerals         = mData.minerals;
    AppData.criteriaVectors  = cData.vectors;
    AppData.groups           = cData.groups;
    AppData.groupAssignments = gData;

    init();
  } catch (err) {
    document.querySelector('main').innerHTML =
      `<div style="padding:60px 24px;max-width:600px;margin:0 auto;">
         <h2 style="color:#c42b1e;margin-bottom:12px;">Data failed to load</h2>
         <p style="color:#6b4020;line-height:1.7;">If you are opening <code>index.html</code> directly from your filesystem,
         browsers block local <code>fetch()</code> calls. Run a local server instead:<br><br>
         <code style="background:#f5e8b8;padding:4px 8px;border-radius:4px;">python3 -m http.server 8099</code><br><br>
         then open <a href="http://localhost:8099" style="color:#620d3c;">http://localhost:8099</a></p>
         <p style="margin-top:16px;font-size:0.8rem;color:#9a7040;">Error: ${err.message}</p>
       </div>`;
  }
}

/* ════════════════════════════════════════════════════════════
   UTILITY HELPERS
   ════════════════════════════════════════════════════════════ */

/** Returns the vector's raw score (score or composite). Null if not found. */
function getVectorValue(mineral, key) {
  const v = mineral.vectors[key];
  if (!v) return null;
  return v.composite !== undefined ? v.composite : (v.score !== undefined ? v.score : null);
}

/** Returns the vector's max from criteria_data. */
function getVectorMax(key) {
  const v = AppData.criteriaVectors.find(cv => cv.key === key);
  return v ? v.max : 5;
}

/** Normalizes mineral's vector value to a 0-5 display scale. */
function normalizeToFive(mineral, key) {
  const val = getVectorValue(mineral, key);
  const max = getVectorMax(key);
  if (val === null || isNaN(val)) return 0;
  return Math.min((val / max) * 5, 5);
}

/** Normalizes to 0-1. */
function normalizeToOne(mineral, key) {
  const val = getVectorValue(mineral, key);
  const max = getVectorMax(key);
  if (val === null || isNaN(val)) return 0;
  return Math.min(val / max, 1);
}

function getGroup(mineralName) {
  const id = AppData.groupAssignments[mineralName];
  return id !== undefined ? id : 0;
}

function groupColor(id) {
  const g = AppData.groups.find(g => g.id === Number(id));
  return g ? g.color : '#999999';
}

function groupName(id) {
  const g = AppData.groups.find(g => g.id === Number(id));
  return g ? g.name : 'Outlier';
}

function getMineralByName(name) {
  return AppData.minerals.find(m => m.mineral === name);
}

function showToast(msg, dur = 2400) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function buildGroupChipHTML(mineralName) {
  const gid = getGroup(mineralName);
  const col  = groupColor(gid);
  return `<span class="group-chip" style="background:${col}1a;color:${col};border-color:${col}44;">${groupName(gid)}</span>`;
}

function buildGroupLegendHTML(clickable = false) {
  return AppData.groups.map(g =>
    `<span class="group-legend-item" ${clickable ? `data-gid="${g.id}"` : ''}>
       <span class="group-legend-dot" style="background:${g.color}"></span>
       ${g.name}
     </span>`
  ).join('');
}

/* ════════════════════════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════════════════════════ */

function navigate(page, mineralName, fromHash) {
  if (page === 'mineral' && mineralName) {
    AppState.selectedMineral = mineralName;
  }
  AppState.currentPage = page;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const pageEl  = document.getElementById(`page-${page}`);
  const navBtn  = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navBtn) navBtn.classList.add('active');

  switch (page) {
    case 'overview':    renderOverview();    break;
    case 'explorer':    renderExplorer();    break;
    case 'mineral':     renderMineralPage(AppState.selectedMineral); break;
    case 'methodology': renderMethodology(); break;
    case 'groups':      renderGroups();      break;
  }

  // Keep the URL in sync so every page (and mineral) has its own address.
  if (!fromHash) {
    const hash = (page === 'mineral' && mineralName)
      ? `#mineral/${encodeURIComponent(mineralName)}` : `#${page}`;
    if (location.hash !== hash) location.hash = hash;
  }

  trackPageView(page, mineralName);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Send a GA4 page_view for the current SPA route (no-op if GA isn't loaded). */
function trackPageView(page, mineralName) {
  if (typeof gtag !== 'function') return;
  const title = page === 'mineral' && mineralName
    ? `${mineralName} · India Critical Minerals`
    : `${page.charAt(0).toUpperCase() + page.slice(1)} · India Critical Minerals`;
  gtag('event', 'page_view', {
    page_title: title,
    page_location: location.href,
    page_path: location.pathname + location.hash,
  });
}

/* Parse the current URL hash into a route. */
function parseHash() {
  const h = (location.hash || '').replace(/^#/, '');
  if (h.startsWith('mineral/')) {
    const name = decodeURIComponent(h.slice('mineral/'.length));
    return getMineralByName(name) ? { page: 'mineral', mineral: name } : { page: 'explorer' };
  }
  if (['overview', 'methodology', 'explorer', 'groups'].includes(h)) return { page: h };
  return { page: 'overview' };
}

/* Close the mobile hamburger menu (no-op visually on desktop). */
function closeMobileNav() {
  const header = document.getElementById('header');
  if (!header) return;
  header.classList.remove('nav-open');
  document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
}

/* React to back/forward and manual hash edits. */
function handleHash() {
  const { page, mineral } = parseHash();
  if (page === AppState.currentPage && (page !== 'mineral' || mineral === AppState.selectedMineral)) return;
  navigate(page, mineral, true);
}

/* ════════════════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════════════════ */

function init() {
  // Nav clicks
  document.getElementById('main-nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (btn?.dataset.page) { navigate(btn.dataset.page); closeMobileNav(); }
  });

  // Mobile hamburger menu (phone only; no effect on desktop layout)
  const navToggle = document.getElementById('nav-toggle');
  navToggle?.addEventListener('click', () => {
    const header = document.getElementById('header');
    const open = header.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Close the menu when tapping outside it
  document.addEventListener('click', e => {
    const header = document.getElementById('header');
    if (header.classList.contains('nav-open') && !e.target.closest('#header')) closeMobileNav();
  });

  // Mineral page back button
  document.getElementById('mp-back-btn').addEventListener('click', () => navigate('explorer'));

  // Guided tour launcher (footer)
  document.getElementById('tour-btn')?.addEventListener('click', () => showTourWelcome({ manual: true }));
  if (!localStorage.getItem('critminTourSeen')) setTimeout(() => showTourWelcome(), 650);


  // Mineral page: open the group + policy drawer for this mineral's group
  document.getElementById('mp-group-policy').addEventListener('click', () => {
    const name = AppState.selectedMineral;
    if (name) openGroupModal(getGroup(name), name);
  });

  // Group modal close
  document.getElementById('gm-close').addEventListener('click', closeGroupModal);
  document.getElementById('gm-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('gm-overlay')) closeGroupModal();
  });
  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeGroupModal();
  });

  // Scorecard accordion: handled by window.toggleScRow (inline onclick)

  // Add-to-compare button (mineral detail) — folds into the Explorer compare tray
  document.getElementById('mp-add-compare').addEventListener('click', () => {
    const name = AppState.selectedMineral;
    if (!name) return;
    const s = AppState.compareSelections;
    if (s.a === name || s.b === name || s.c === name) {
      showToast(`${name} is already in compare`);
    } else if (!s.a) { s.a = name; showToast(`${name} added to compare`); }
    else if (!s.b)   { s.b = name; showToast(`${name} added to compare`); }
    else if (!s.c)   { s.c = name; showToast(`${name} added to compare`); }
    else             { showToast('Compare is full — clear one to add another'); return; }
    openCompareTray();
    navigate('explorer');
    setTimeout(() => {
      document.getElementById('explorer-compare')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  });

  // Explorer search & sort
  document.getElementById('explorer-search').addEventListener('input', e => {
    AppState.explorerSearch = e.target.value.toLowerCase();
    renderExplorer();
  });
  document.getElementById('explorer-sort').addEventListener('change', e => {
    AppState.explorerSort = e.target.value;
    renderExplorer();
  });

  // Populate compare selects (compare tray now lives inside Explorer)
  const allNames = AppData.minerals.map(m => m.mineral).sort();
  ['a', 'b', 'c'].forEach(slot => {
    const sel = document.getElementById(`compare-${slot}`);
    allNames.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name; opt.textContent = name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', e => {
      AppState.compareSelections[slot] = e.target.value;
      renderCompare();
      updateCompareTray();
    });
  });

  // Compare tray toggle (in Explorer controls)
  document.getElementById('ec-toggle').addEventListener('click', () => {
    const tray = document.getElementById('explorer-compare');
    const willOpen = tray.classList.contains('hidden');
    if (willOpen) openCompareTray(); else tray.classList.add('hidden');
    document.getElementById('ec-toggle').setAttribute('aria-expanded', String(willOpen));
  });

  // Compare tray "Clear all"
  document.getElementById('ec-clear').addEventListener('click', () => {
    AppState.compareSelections = { a: '', b: '', c: '' };
    renderCompare();
    updateCompareTray();
  });

  // Routing: each page / mineral gets its own URL hash
  window.addEventListener('hashchange', handleHash);
  const route = parseHash();
  navigate(route.page, route.mineral);
}

/* ════════════════════════════════════════════════════════════
   OVERVIEW PAGE
   ════════════════════════════════════════════════════════════ */

function renderOverview() {
  renderPeriodicTable();
  renderListsChart();
}

/* Hero line chart: how many elements sit on each country's critical-minerals
   list over time. India is highlighted; single-year lists show just a marker. */
let listsChart = null;
function renderListsChart() {
  const canvas = document.getElementById('lists-line-chart');
  if (!canvas || listsChart) return;

  const series = [
    { label: 'European Union', color: '#3d6b7d', pt: 'circle',   data: [[2011,33],[2014,36],[2017,42],[2020,45],[2023,49]] },
    { label: 'United States',  color: '#c42b1e', pt: 'rect',     data: [[2018,35],[2022,50],[2025,60]] },
    { label: 'Australia',      color: '#7d6b9e', pt: 'crossRot', data: [[2019,43],[2024,51]] },
    { label: 'Canada',         color: '#8a5a44', pt: 'triangle', data: [[2021,51],[2024,54]] },
    { label: 'Russia',         color: '#2e8b57', pt: 'rectRot',  data: [[2024,61]] },
    { label: 'India',          color: '#620d3c', pt: 'triangle', data: [[2023,51]], india: true },
  ];

  const datasets = series.map(s => ({
    label: s.label,
    data: s.data.map(([x, y]) => ({ x, y })),
    borderColor: s.color,
    backgroundColor: s.color,
    pointStyle: s.pt,
    pointRadius: s.india ? 8 : 4.5,
    pointHoverRadius: s.india ? 10 : 6.5,
    borderWidth: s.india ? 0 : 2,
    showLine: s.data.length > 1,
    tension: 0,
  }));

  listsChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: true },
      layout: { padding: { top: 4, right: 8 } },
      scales: {
        x: {
          type: 'linear', min: 2010, max: 2026,
          ticks: { stepSize: 4, color: '#9a7040', font: { size: 10, family: 'Hanken Grotesk' }, callback: (v) => `${v}` },
          grid: { color: 'rgba(98,13,60,0.06)' },
          title: { display: false },
        },
        y: {
          min: 0, max: 70,
          ticks: { stepSize: 20, color: '#9a7040', font: { size: 10, family: 'Hanken Grotesk' } },
          grid: { color: 'rgba(98,13,60,0.06)' },
          title: { display: true, text: 'Elements on list', color: '#9a7040', font: { size: 10, family: 'Hanken Grotesk' } },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 7, padding: 12, color: '#6b4020', font: { size: 11, family: 'Hanken Grotesk' } },
        },
        tooltip: {
          backgroundColor: '#fff', titleColor: '#1a0804', bodyColor: '#6b4020',
          borderColor: '#e4d49c', borderWidth: 1, padding: 8, usePointStyle: true,
          callbacks: {
            title: items => items.length ? items[0].parsed.x : '',
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} expanded elements`,
          },
        },
      },
    },
  });
}

/* Methodology page = the scoring framework (criteria). */
function renderMethodology() {
  renderCriteria();
}

/* ── Interactive periodic table ───────────────────────────────
   Walks the reduction from 118 known elements down to the ~76 that
   are actually mined for commercial use, then highlights the 51 that
   India designates critical. Element rows: [Z, symbol, name, gridRow,
   gridCol, category, isCritical]. Categories: com (commercial),
   syn (synthetic, Z95–118), rad (non-commercial radioactive),
   gas (atmospheric gas), hhe (hydrogen/helium).
   ───────────────────────────────────────────────────────────── */
const PT_ELEMENTS = [
  [1,"H","Hydrogen",1,1,"hhe",0],[2,"He","Helium",1,18,"hhe",0],[3,"Li","Lithium",2,1,"com",1],[4,"Be","Beryllium",2,2,"com",1],[5,"B","Boron",2,13,"com",0],[6,"C","Carbon",2,14,"com",1],
  [7,"N","Nitrogen",2,15,"gas",0],[8,"O","Oxygen",2,16,"gas",0],[9,"F","Fluorine",2,17,"gas",0],[10,"Ne","Neon",2,18,"gas",0],[11,"Na","Sodium",3,1,"com",0],[12,"Mg","Magnesium",3,2,"com",0],
  [13,"Al","Aluminium",3,13,"com",0],[14,"Si","Silicon",3,14,"com",1],[15,"P","Phosphorus",3,15,"com",1],[16,"S","Sulfur",3,16,"com",0],[17,"Cl","Chlorine",3,17,"gas",0],[18,"Ar","Argon",3,18,"gas",0],
  [19,"K","Potassium",4,1,"com",1],[20,"Ca","Calcium",4,2,"com",0],[21,"Sc","Scandium",4,3,"com",1],[22,"Ti","Titanium",4,4,"com",1],[23,"V","Vanadium",4,5,"com",1],[24,"Cr","Chromium",4,6,"com",0],
  [25,"Mn","Manganese",4,7,"com",0],[26,"Fe","Iron",4,8,"com",0],[27,"Co","Cobalt",4,9,"com",1],[28,"Ni","Nickel",4,10,"com",1],[29,"Cu","Copper",4,11,"com",1],[30,"Zn","Zinc",4,12,"com",0],
  [31,"Ga","Gallium",4,13,"com",1],[32,"Ge","Germanium",4,14,"com",1],[33,"As","Arsenic",4,15,"com",0],[34,"Se","Selenium",4,16,"com",1],[35,"Br","Bromine",4,17,"com",0],[36,"Kr","Krypton",4,18,"gas",0],
  [37,"Rb","Rubidium",5,1,"com",0],[38,"Sr","Strontium",5,2,"com",1],[39,"Y","Yttrium",5,3,"com",1],[40,"Zr","Zirconium",5,4,"com",1],[41,"Nb","Niobium",5,5,"com",1],[42,"Mo","Molybdenum",5,6,"com",1],
  [43,"Tc","Technetium",5,7,"rad",0],[44,"Ru","Ruthenium",5,8,"com",1],[45,"Rh","Rhodium",5,9,"com",1],[46,"Pd","Palladium",5,10,"com",1],[47,"Ag","Silver",5,11,"com",0],[48,"Cd","Cadmium",5,12,"com",1],
  [49,"In","Indium",5,13,"com",1],[50,"Sn","Tin",5,14,"com",1],[51,"Sb","Antimony",5,15,"com",1],[52,"Te","Tellurium",5,16,"com",1],[53,"I","Iodine",5,17,"com",0],[54,"Xe","Xenon",5,18,"com",0],
  [55,"Cs","Caesium",6,1,"com",0],[56,"Ba","Barium",6,2,"com",0],[57,"La","Lanthanum",9,3,"com",1],[58,"Ce","Cerium",9,4,"com",1],[59,"Pr","Praseodymium",9,5,"com",1],[60,"Nd","Neodymium",9,6,"com",1],
  [61,"Pm","Promethium",9,7,"com",1],[62,"Sm","Samarium",9,8,"com",1],[63,"Eu","Europium",9,9,"com",1],[64,"Gd","Gadolinium",9,10,"com",1],[65,"Tb","Terbium",9,11,"com",1],[66,"Dy","Dysprosium",9,12,"com",1],
  [67,"Ho","Holmium",9,13,"com",1],[68,"Er","Erbium",9,14,"com",1],[69,"Tm","Thulium",9,15,"com",1],[70,"Yb","Ytterbium",9,16,"com",1],[71,"Lu","Lutetium",9,17,"com",1],[72,"Hf","Hafnium",6,4,"com",1],
  [73,"Ta","Tantalum",6,5,"com",1],[74,"W","Tungsten",6,6,"com",1],[75,"Re","Rhenium",6,7,"com",1],[76,"Os","Osmium",6,8,"com",1],[77,"Ir","Iridium",6,9,"com",1],[78,"Pt","Platinum",6,10,"com",1],
  [79,"Au","Gold",6,11,"com",0],[80,"Hg","Mercury",6,12,"com",0],[81,"Tl","Thallium",6,13,"com",0],[82,"Pb","Lead",6,14,"com",0],[83,"Bi","Bismuth",6,15,"com",1],[84,"Po","Polonium",6,16,"rad",0],
  [85,"At","Astatine",6,17,"rad",0],[86,"Rn","Radon",6,18,"rad",0],[87,"Fr","Francium",7,1,"rad",0],[88,"Ra","Radium",7,2,"rad",0],[89,"Ac","Actinium",10,3,"rad",0],[90,"Th","Thorium",10,4,"com",0],
  [91,"Pa","Protactinium",10,5,"rad",0],[92,"U","Uranium",10,6,"com",0],[93,"Np","Neptunium",10,7,"com",0],[94,"Pu","Plutonium",10,8,"rad",0],[95,"Am","Americium",10,9,"syn",0],[96,"Cm","Curium",10,10,"syn",0],
  [97,"Bk","Berkelium",10,11,"syn",0],[98,"Cf","Californium",10,12,"syn",0],[99,"Es","Einsteinium",10,13,"syn",0],[100,"Fm","Fermium",10,14,"syn",0],[101,"Md","Mendelevium",10,15,"syn",0],[102,"No","Nobelium",10,16,"syn",0],
  [103,"Lr","Lawrencium",10,17,"syn",0],[104,"Rf","Rutherfordium",7,4,"syn",0],[105,"Db","Dubnium",7,5,"syn",0],[106,"Sg","Seaborgium",7,6,"syn",0],[107,"Bh","Bohrium",7,7,"syn",0],[108,"Hs","Hassium",7,8,"syn",0],
  [109,"Mt","Meitnerium",7,9,"syn",0],[110,"Ds","Darmstadtium",7,10,"syn",0],[111,"Rg","Roentgenium",7,11,"syn",0],[112,"Cn","Copernicium",7,12,"syn",0],[113,"Nh","Nihonium",7,13,"syn",0],[114,"Fl","Flerovium",7,14,"syn",0],
  [115,"Mc","Moscovium",7,15,"syn",0],[116,"Lv","Livermorium",7,16,"syn",0],[117,"Ts","Tennessine",7,17,"syn",0],[118,"Og","Oganesson",7,18,"syn",0],
];

/* The category removed at each step, the running count, and the caption. */
const PT_STEPS = [
  { num: 118, label: 'known elements', pill: '118 elements',
    caption: 'Highlighted are the 51 minerals India designates critical. They look like a handful against all 118 known elements. Step through to see how small the pool they are actually drawn from is.' },
  { num: 94, label: 'occur in nature', pill: '−24 synthetic', removes: 'syn',
    caption: 'Elements 95 to 118 are synthetic, created in particle accelerators and never mined. Set them aside and 94 occur in nature.' },
  { num: 85, label: 'non-radioactive', pill: '−9 radioactive', removes: 'rad',
    caption: 'Nine more are radioactive with no commercial supply chain, like technetium, polonium and plutonium. That leaves 85.' },
  { num: 78, label: 'solids & metals', pill: '−7 gases', removes: 'gas',
    caption: 'Seven are atmospheric gases such as nitrogen, oxygen and the noble gases, not mined as ores. Down to 78.' },
  { num: 76, label: 'commercially mined', pill: '−2 H, He', removes: 'hhe',
    caption: 'Set aside hydrogen and helium, and roughly 76 elements are actually mined for commercial use. That is the usable periodic table.' },
  { num: 51, label: 'designated critical', pill: '51 critical', highlightCritical: true,
    caption: 'India designates 51 of these 76 as critical, fully two-thirds. When the label covers that much of what we mine, it can no longer tell policymakers where to act first.' },
];

/* Number of the five major national critical-mineral lists (US, EU, China,
   Russia, India) on which each element appears, 0–5. Read from the paper's
   "elements by number of lists" figure; symbols absent here are on 0 lists.
   ▸ VERIFY against the author's source spreadsheet and correct any cell. */
const PT_LISTS = {
  Li:4, Be:4, B:2, C:2, N:1, O:1, F:3,
  Na:1, Mg:3, Al:2, Si:3, P:3, S:1, Cl:1,
  K:1, Ca:1, Sc:3, Ti:4, V:4, Cr:4, Mn:3, Fe:2, Co:5, Ni:4, Cu:4, Zn:2, Ga:5, Ge:4, As:2, Se:3, Br:1,
  Rb:1, Sr:3, Y:4, Zr:4, Nb:5, Mo:4, Tc:1, Ru:3, Rh:3, Pd:4, Ag:2, Cd:3, In:4, Sn:4, Sb:5, Te:4, I:1,
  Cs:2, Ba:3, Hf:3, Ta:4, W:5, Re:3, Os:2, Ir:3, Pt:4, Au:1, Hg:2, Tl:1, Pb:2, Bi:3,
  La:4, Ce:4, Pr:4, Nd:5, Pm:1, Sm:3, Eu:4, Gd:4, Tb:5, Dy:5, Ho:3, Er:4, Tm:3, Yb:4, Lu:4,
  Th:2, U:3,
};

let ptStep = 0;
let ptMode = 'india';   // 'india' (reduction) | 'lists' (national-list count) | 'groups' (by group)

/* Two of the 51 are listed under a mineral name, not the element name. */
const PT_GROUP_ALIAS = { Carbon: 'Graphite', Potassium: 'Potash' };

function renderPeriodicTable() {
  const grid = document.getElementById('pt-grid');
  if (!grid) return;

  // Build the cells once
  if (!grid.dataset.built) {
    grid.innerHTML = PT_ELEMENTS.map(([z, sym, name, row, col, cat, crit]) => {
      const lists = PT_LISTS[sym] || 0;
      const gid   = crit ? getGroup(PT_GROUP_ALIAS[name] || name) : '';
      return `<div class="pt-cell" data-cat="${cat}" data-crit="${crit}" data-lists="${lists}" data-group="${gid}"
            style="grid-row:${row};grid-column:${col}"
            title="${name} (${sym}, ${z})">
         <span class="pt-z">${z}</span>
         <span class="pt-sym">${sym}</span>
       </div>`;
    }).join('');

    // f-block connector labels + a thin spacer row between the main table and the f-block
    grid.insertAdjacentHTML('beforeend',
      `<div class="pt-fnote" style="grid-row:6;grid-column:3">57–71</div>
       <div class="pt-fnote" style="grid-row:7;grid-column:3">89–103</div>
       <div class="pt-spacer" style="grid-row:8;grid-column:1 / -1"></div>`);

    grid.dataset.built = 'true';
  }

  // Build step pills once
  const stepsEl = document.getElementById('pt-steps');
  if (stepsEl && !stepsEl.dataset.built) {
    stepsEl.innerHTML = PT_STEPS.map((s, i) =>
      `<button class="pt-step-pill" data-step="${i}">${s.pill}</button>`
    ).join('');
    stepsEl.querySelectorAll('.pt-step-pill').forEach(btn =>
      btn.addEventListener('click', () => { setPtMode('india'); setPtStep(Number(btn.dataset.step)); })
    );
    document.getElementById('pt-prev').addEventListener('click', () => setPtStep(ptStep - 1));
    document.getElementById('pt-next').addEventListener('click', () => setPtStep(ptStep + 1));
    stepsEl.dataset.built = 'true';
  }

  // Wire mode toggle once
  const modesEl = document.getElementById('pt-modes');
  if (modesEl && !modesEl.dataset.built) {
    modesEl.querySelectorAll('.pt-mode').forEach(btn =>
      btn.addEventListener('click', () => setPtMode(btn.dataset.mode))
    );
    modesEl.dataset.built = 'true';
  }

  // Build the by-group legend once, from the live group palette
  const glEl = document.getElementById('pt-grouplegend');
  if (glEl && !glEl.dataset.built) {
    const ordered = [...AppData.groups].sort((a, b) =>
      a.id === 0 ? 1 : b.id === 0 ? -1 : a.id - b.id);
    glEl.innerHTML = ordered.map(g =>
      `<span class="pt-legend-item"><span class="pt-swatch" style="background:${g.color}"></span>${g.id === 0 ? 'Outlier' : 'Group ' + g.id}: ${g.name}</span>`
    ).join('') +
      `<span class="pt-legend-item"><span class="pt-swatch pt-sw-mined"></span>Other mineable</span>`;
    glEl.dataset.built = 'true';
  }

  setPtMode(ptMode);
}

/* Switch between the three views of the table. */
function setPtMode(mode) {
  ptMode = mode;
  document.querySelectorAll('#pt-modes .pt-mode').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode));

  // Clear any inline colours left by a previous by-group render
  document.querySelectorAll('#pt-grid .pt-cell').forEach(c => {
    c.style.background = ''; c.style.borderColor = '';
    const sym = c.querySelector('.pt-sym'), z = c.querySelector('.pt-z');
    if (sym) sym.style.color = '';
    if (z)   z.style.color = '';
  });

  document.getElementById('pt-india-controls').classList.toggle('hidden', mode !== 'india');
  document.getElementById('pt-legend').classList.toggle('hidden', mode !== 'india');
  document.getElementById('pt-listlegend').classList.toggle('hidden', mode !== 'lists');
  document.getElementById('pt-grouplegend').classList.toggle('hidden', mode !== 'groups');

  if      (mode === 'lists')  applyListsView();
  else if (mode === 'groups') applyGroupsView();
  else                        setPtStep(ptStep);
}

/* Colour every cell by how many national lists include it (0–5). */
function applyListsView() {
  document.querySelectorAll('#pt-grid .pt-cell').forEach(cell => {
    cell.dataset.state = 'lists';
  });
  document.getElementById('pt-num').textContent   = '5';
  document.getElementById('pt-label').textContent = 'major lists tracked';
  document.getElementById('pt-caption').innerHTML =
    `<strong>The lists are swelling.</strong> Each element is shaded by how many of the five major national lists (US, EU, China, Russia, India) name it. When the same elements land on list after list, "critical" stops telling any one government what to prioritise.`;
}

/* Perceived luminance of a #rrggbb colour (0–255). */
function colorLuminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/* Colour the 51 critical minerals by the group their profile places them in. */
function applyGroupsView() {
  document.querySelectorAll('#pt-grid .pt-cell').forEach(cell => {
    if (cell.dataset.crit === '1') {
      const col   = groupColor(Number(cell.dataset.group));
      const light = colorLuminance(col) > 150;   // pick legible text per fill
      cell.dataset.state = 'group';
      cell.style.background = col;
      cell.style.borderColor = col;
      const sym = cell.querySelector('.pt-sym'), z = cell.querySelector('.pt-z');
      if (sym) sym.style.color = light ? '#1a0804' : '#fff';
      if (z)   z.style.color   = light ? 'rgba(26,8,4,0.55)' : 'rgba(255,255,255,0.7)';
    } else {
      cell.dataset.state = cell.dataset.cat === 'com' ? 'mined' : 'removed';
    }
  });
  document.getElementById('pt-num').textContent   = '6';
  document.getElementById('pt-label').textContent = 'mineral groups';
  document.getElementById('pt-caption').innerHTML =
    `<strong>Same list, six problems.</strong> Each critical mineral is coloured by the group its profile places it in. Minerals in a group share the same kind of bottleneck and call for the same response. Open the <strong>Groups</strong> tab to explore each.`;
}

function setPtStep(step) {
  ptStep = Math.max(0, Math.min(PT_STEPS.length - 1, step));

  // A category is "removed" once we've passed the step that removes it.
  const removedCats = new Set();
  for (let i = 1; i <= ptStep; i++) {
    if (PT_STEPS[i].removes) removedCats.add(PT_STEPS[i].removes);
  }
  // India's 51 stay highlighted at every step; the final step additionally
  // distinguishes the commercial-but-not-listed cells from the empty ones.
  const showMined = PT_STEPS[ptStep].highlightCritical;

  document.querySelectorAll('#pt-grid .pt-cell').forEach(cell => {
    const cat  = cell.dataset.cat;
    const crit = cell.dataset.crit === '1';
    let state;
    if (removedCats.has(cat)) state = 'removed';
    else if (crit)            state = 'critical';   // always show India's list
    else if (showMined)       state = 'mined';      // commercial, not listed
    else                      state = 'neutral';
    cell.dataset.state = state;
  });

  // Readout + caption
  const s = PT_STEPS[ptStep];
  document.getElementById('pt-num').textContent   = s.num;
  document.getElementById('pt-label').textContent = s.label;
  document.getElementById('pt-caption').innerHTML =
    ptStep === PT_STEPS.length - 1
      ? `<strong>51 of 76, about 67%.</strong> ${s.caption}`
      : s.caption;

  // Pill active states (mark current + completed)
  document.querySelectorAll('#pt-steps .pt-step-pill').forEach((btn, i) => {
    btn.classList.toggle('active', i === ptStep);
    btn.classList.toggle('done', i < ptStep);
  });

  // Arrow disabled states
  document.getElementById('pt-prev').disabled = ptStep === 0;
  document.getElementById('pt-next').disabled = ptStep === PT_STEPS.length - 1;
}

/* ── Group modal drawer ──────────────────────────────────────── */

function openGroupModal(gid, activeMineral, mode) {
  const g = AppData.groups.find(gg => gg.id === Number(gid));
  if (!g) return;
  const members = AppData.minerals.filter(m => getGroup(m.mineral) === Number(gid));
  const desc = GROUP_DESCRIPTIONS[Number(gid)] || {};
  const isOut = Number(gid) === 0;

  // 'center' = centered popup (groups page) · 'side' = drawer (mineral page)
  document.getElementById('gm-overlay').classList.toggle('gm-overlay--center', mode === 'center');

  // Reset scroll
  document.getElementById('gm-panel').scrollTop = 0;

  // Header
  const header = document.getElementById('gm-header');
  header.style.borderLeftColor = g.color;

  const badge = document.getElementById('gm-badge');
  badge.textContent = isOut ? 'Outlier' : `Group ${g.id}`;
  badge.style.cssText = `background:${g.color}18;color:${g.color};border-color:${g.color}44`;

  const nameEl = document.getElementById('gm-name');
  nameEl.textContent = g.name;
  nameEl.style.color = g.color;

  document.getElementById('gm-tagline').textContent = desc.tagline || '';

  // Body — render newlines as paragraphs
  const bodyEl = document.getElementById('gm-body');
  bodyEl.innerHTML = (desc.body || '').split('\n\n').map(p => `<p>${p}</p>`).join('');

  // Policy choices for India
  const policyEl = document.getElementById('gm-policy');
  if (policyEl) {
    policyEl.innerHTML = (desc.policy && desc.policy.length)
      ? `<div class="gm-policy-label" style="color:${g.color}">Policy choices for India</div>
         <ul class="gm-policy-list" style="--gc:${g.color}">${desc.policy.map(p => `<li>${p}</li>`).join('')}</ul>`
      : '';
  }

  // Radar
  const canvas = document.getElementById('gm-radar');
  if (canvas && members.length) drawGroupAvgRadar(canvas, members, g.color);

  // Mineral chips (highlight the active one if opened from a mineral page)
  const chipsEl = document.getElementById('gm-chips');
  chipsEl.innerHTML = members.map(m => {
    const on = m.mineral === activeMineral;
    return `<span class="gm-chip${on ? ' gm-chip--active' : ''}" data-mineral="${m.mineral}" style="${on ? `background:${g.color};color:#fff;border-color:${g.color}` : `color:${g.color};border-color:${g.color}`}">${m.mineral}</span>`;
  }).join('');
  chipsEl.querySelectorAll('.gm-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      closeGroupModal();
      navigate('mineral', chip.dataset.mineral);
    });
  });

  document.getElementById('gm-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeGroupModal() {
  document.getElementById('gm-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/** Draws an average-profile radar for a set of minerals, colored by group. */
function drawGroupAvgRadar(canvas, members, color) {
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const r   = Math.min(cx, cy) - 10;
  const n   = AppData.criteriaVectors.length;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Average normalized values per vector
  const avgs = AppData.criteriaVectors.map(v => {
    const vals = members.map(m => normalizeToFive(m, v.key)).filter(v => !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length / 5 : 0;
  });

  // Grid rings
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a  = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = (ring / 5) * r;
      i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
              : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(98,13,60,0.09)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  // Axes
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(98,13,60,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
  }
  // Filled polygon
  ctx.beginPath();
  avgs.forEach((norm, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = norm * r;
    i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
            : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  });
  ctx.closePath();
  ctx.fillStyle   = color + '30';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.stroke();
}

/* ════════════════════════════════════════════════════════════
   EXPLORER PAGE
   ════════════════════════════════════════════════════════════ */

function renderExplorer() {
  // Build group filter chips once
  const chipWrap = document.getElementById('explorer-group-chips');
  if (!chipWrap.hasChildNodes()) {
    chipWrap.innerHTML = `<button class="filter-chip active" data-group="all">All</button>`
      + AppData.groups.map(g =>
          `<button class="filter-chip" data-group="${g.id}">${g.name}</button>`
        ).join('');
    chipWrap.addEventListener('click', e => {
      const btn = e.target.closest('.filter-chip');
      if (!btn) return;
      chipWrap.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.explorerGroupFilter = btn.dataset.group;
      renderExplorer();
    });
  }

  // Sync chip active state to AppState (in case filter was set programmatically)
  const chipWrap2 = document.getElementById('explorer-group-chips');
  chipWrap2.querySelectorAll('.filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.group === AppState.explorerGroupFilter);
  });

  let minerals = AppData.minerals.filter(m => {
    if (AppState.explorerGroupFilter !== 'all' && getGroup(m.mineral) !== Number(AppState.explorerGroupFilter)) return false;
    if (AppState.explorerSearch && !m.mineral.toLowerCase().includes(AppState.explorerSearch)) return false;
    return true;
  });

  if (AppState.explorerSort) {
    minerals = [...minerals].sort((a, b) =>
      (getVectorValue(b, AppState.explorerSort) ?? -1) - (getVectorValue(a, AppState.explorerSort) ?? -1)
    );
  }

  const grid = document.getElementById('minerals-grid');
  grid.innerHTML = minerals.map(m => buildMineralCard(m)).join('');

  grid.querySelectorAll('.mineral-card').forEach(card => {
    card.addEventListener('click', () => navigate('mineral', card.dataset.mineral));
    card.addEventListener('keydown', e => { if (e.key === 'Enter') navigate('mineral', card.dataset.mineral); });
    const canvas = card.querySelector('.mini-10-radar');
    if (canvas) drawMiniRadar10(canvas, card.dataset.mineral);
  });

  // Keep the compare tray in sync whenever Explorer renders.
  // Un-hide the tray first so the radar canvas has real dimensions before Chart.js draws.
  updateCompareTray();
  renderCompare();
}

/* ── Compare tray (Explorer) ─────────────────────────────────── */

/** Count selected, update the toggle badge, and auto-open the tray if non-empty. */
function updateCompareTray() {
  const s = AppState.compareSelections;
  const n = ['a', 'b', 'c'].filter(k => s[k]).length;

  const countEl = document.getElementById('ec-count');
  if (countEl) countEl.textContent = n ? ` (${n})` : '';

  // If something is selected, make sure the tray is visible.
  if (n > 0) {
    const tray = document.getElementById('explorer-compare');
    if (tray) tray.classList.remove('hidden');
    document.getElementById('ec-toggle')?.setAttribute('aria-expanded', 'true');
  }
}

/** Force the compare tray open (used by the mineral-page Add-to-Compare button). */
function openCompareTray() {
  document.getElementById('explorer-compare')?.classList.remove('hidden');
  document.getElementById('ec-toggle')?.setAttribute('aria-expanded', 'true');
}

function buildMineralCard(m) {
  const gid  = getGroup(m.mineral);
  const col  = groupColor(gid);
  const gname = groupName(gid);

  return `
    <div class="mineral-card" data-mineral="${m.mineral}" role="button" tabindex="0">
      <div class="card-header">
        <div class="card-name">${m.mineral}</div>
        <span class="group-chip" style="background:${col}18;color:${col};border-color:${col}40;">${gname}</span>
      </div>
      <canvas class="mini-10-radar" width="120" height="120"></canvas>
    </div>`;
}

/* ── Mini 10-spoke canvas radar ────────────────────────────── */
function drawMiniRadar10(canvas, mineralName) {
  const m = getMineralByName(mineralName);
  if (!m || !canvas) return;
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const r   = Math.min(cx, cy) - 12;
  const n   = AppData.criteriaVectors.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Grid rings
  for (let ring = 1; ring <= 5; ring++) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a  = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = (ring / 5) * r;
      i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
              : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(98,13,60,0.09)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  }

  // Axes
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(98,13,60,0.06)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  }

  // Data polygon — colored by group
  const col = groupColor(getGroup(mineralName));
  ctx.beginPath();
  AppData.criteriaVectors.forEach((v, i) => {
    const norm = normalizeToFive(m, v.key) / 5;
    const a    = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr   = norm * r;
    i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
            : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  });
  ctx.closePath();
  ctx.fillStyle   = col + '28';
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth   = 1.5;
  ctx.stroke();
}

/* ════════════════════════════════════════════════════════════
   MINERAL DETAIL PAGE
   ════════════════════════════════════════════════════════════ */

function renderMineralPage(mineralName) {
  if (!mineralName) return;
  const m = getMineralByName(mineralName);
  if (!m) return;

  const gid  = getGroup(mineralName);
  const col  = groupColor(gid);

  // Header
  const sym = document.getElementById('mp-symbol');
  sym.textContent  = mineralName.slice(0, 2).toUpperCase();
  sym.style.background = col + '22';
  sym.style.color      = col;
  document.getElementById('mp-name').textContent  = mineralName;
  document.getElementById('mp-group-chip').innerHTML = buildGroupChipHTML(mineralName);

  // Destroy old chart if any
  if (AppState.radarChartMineral) { AppState.radarChartMineral.destroy(); AppState.radarChartMineral = null; }

  // Radar chart — all 10 vectors normalized to 0-5
  const radarLabels = AppData.criteriaVectors.map(v => v.name.split(' ').slice(0, 2).join(' '));
  const radarData   = AppData.criteriaVectors.map(v => normalizeToFive(m, v.key));

  AppState.radarChartMineral = new Chart(
    document.getElementById('mp-radar-canvas').getContext('2d'),
    {
      type: 'radar',
      data: {
        labels: radarLabels,
        datasets: [{
          label: mineralName,
          data: radarData,
          backgroundColor: col + '1e',
          borderColor: col,
          borderWidth: 1.5,
          pointBackgroundColor: col,
          pointRadius: 2.5,
          pointHoverRadius: 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        layout: { padding: 18 },
        scales: {
          r: {
            min: 0, max: 5,
            ticks: { display: false, stepSize: 1 },
            grid: { color: 'rgba(98,13,60,0.08)' },
            pointLabels: { color: '#6b4020', font: { size: 8, family: 'Hanken Grotesk' }, padding: 4 },
            angleLines: { color: 'rgba(98,13,60,0.06)' }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff', titleColor: '#1a0804',
            bodyColor: '#6b4020', borderColor: '#e4d49c', borderWidth: 1,
            callbacks: {
              label: ctx => {
                const v   = AppData.criteriaVectors[ctx.dataIndex];
                const raw = getVectorValue(m, v.key);
                return ` ${raw !== null ? raw : 'n/a'} / ${v.max}`;
              }
            }
          }
        }
      }
    }
  );

  // Scorecard
  renderMineralScorecard(m);
}

function renderMineralScorecard(m) {
  const container = document.getElementById('mp-scorecard');

  container.innerHTML = AppData.criteriaVectors.map(v => {
    const val  = getVectorValue(m, v.key);
    const pct  = val !== null ? Math.min((val / v.max) * 100, 100) : 0;
    const norm = val !== null ? val / v.max : 0;
    // Green (low risk) → red (high risk) colour
    const hue      = Math.round((1 - norm) * 110);
    const barColor = `hsl(${hue},58%,40%)`;
    const valDisplay = val !== null ? val : '—';

    // Sub-scores (shown inside accordion)
    let subHTML = '';
    if (v.sub && m.vectors[v.key]?.sub) {
      const subs = m.vectors[v.key].sub;
      subHTML = `<div class="sc-subs">${v.sub.map(s => {
        const sv = subs[s.key];
        return `<div class="sc-sub-row">
          <span class="sc-sub-label">${s.name}</span>
          <span class="sc-sub-val">${sv !== undefined ? sv : '—'}<span class="sc-sub-max"> / ${s.max}</span></span>
        </div>`;
      }).join('')}</div>`;
    }

    const rawReason = (m.vectors[v.key]?.reason || '').trim();
    const reasonParas = rawReason
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);
    const reasonHTML = reasonParas.length
      ? `<div class="sc-reason">${reasonParas.map(p => `<p>${p}</p>`).join('')}</div>`
      : '';

    return `
      <div class="sc-row">
        <div class="sc-head" role="button" tabindex="0" onclick="toggleScRow(this)">
          <span class="sc-name">${v.name}</span>
          <span class="sc-score" style="color:${barColor}">${valDisplay}<span class="sc-max"> / ${v.max}</span></span>
          <span class="sc-expand">Why this score?<span class="sc-chev">▾</span></span>
        </div>
        <div class="sc-bar-track">
          <div class="sc-bar-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div>
        </div>
        <div class="sc-body" style="display:none">
          ${subHTML}
          ${reasonHTML}
        </div>
      </div>`;
  }).join('');

  // Listener is attached once in init() via scorecard delegation — nothing to do here
}


/** Toggle a scorecard accordion row. Uses style.display directly — no CSS class conflict possible. */
window.toggleScRow = function(head) {
  const row  = head.closest('.sc-row');
  const body = row && row.querySelector('.sc-body');
  const exp  = head.querySelector('.sc-expand');
  if (!body) return;
  const isHidden = body.style.display === 'none' || body.style.display === '';
  body.style.display = isHidden ? 'block' : 'none';
  if (exp) exp.firstChild.textContent = isHidden ? 'Hide reasoning' : 'Why this score?';
  row.classList.toggle('sc-row--open', isHidden);
};

/* ════════════════════════════════════════════════════════════
   CRITERIA PAGE
   ════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   CRITERIA — complete band data from framework document
   ════════════════════════════════════════════════════════════ */

/* Band colours: Score 1 (low risk/green) → Score 5 (high risk/plum) */
const BAND_BG = ['#edf7ee','#f9f6e3','#fdf3db','#fce6de','#f4e6f0'];
const BAND_FG = ['#1a6b2a','#7a5f00','#b05400','#b91c1c','#620d3c'];

const FAMILY_COLOR = {
  'How much it matters':  '#620d3c',
  'How exposed supply is':'#3d6b7d',
  'Where India stands':   '#2e8b57',
};

/* Complete 5-band definitions for every scoreable dimension */
const COMPLETE_BANDS = {
  demand: [
    {score:1, label:'≤ 500 t/yr', note:'Negligible absolute demand'},
    {score:2, label:'500 – 10,000 t/yr', note:'Modest demand'},
    {score:3, label:'10,000 – 100,000 t/yr', note:'Moderate demand'},
    {score:4, label:'100,000 – 1,000,000 t/yr', note:'High demand'},
    {score:5, label:'> 1,000,000 t/yr', note:'Extremely high demand'},
  ],
  growth: [
    {score:1, label:'Declining', note:'Demand falling — replaced by other materials'},
    {score:2, label:'Flat / stagnant', note:'No growth expected'},
    {score:3, label:'Low growth (1–5% CAGR)', note:'Steady mature industrial uses'},
    {score:4, label:'Moderate growth (6–12% CAGR)', note:'Driven by emerging sectors'},
    {score:5, label:'High growth (>12% CAGR)', note:'Rapid expansion — e.g. EVs'},
  ],
  /* Shared scale for mining and refining sub-scores */
  supplier_sub: [
    {score:1, label:'No country > 30%', note:'Well distributed globally'},
    {score:2, label:'Largest country 30–50%', note:'Moderate concentration'},
    {score:3, label:'Largest country 50–65%', note:'Significant concentration'},
    {score:4, label:'Largest country 65–85%', note:'Highly concentrated'},
    {score:5, label:'Largest country > 85%', note:'Near-monopoly supply'},
  ],
  timeframe: [
    {score:1, label:'> 100 years', note:'Effectively limitless at current consumption'},
    {score:2, label:'50 – 100 years', note:'Abundant; long-term runway'},
    {score:3, label:'30 – 50 years', note:'Substantial but finite'},
    {score:4, label:'15 – 30 years', note:'Significant scarcity pressure emerging'},
    {score:5, label:'< 15 years', note:'Near-term scarcity risk'},
  ],
  diversification: [
    {score:1, label:'HHI < 0.15', note:'Highly distributed — no country > ~25% of reserves'},
    {score:2, label:'HHI 0.15–0.25', note:'Well distributed — top country typically < 35%'},
    {score:3, label:'HHI 0.25–0.40', note:'Moderately concentrated — one country 35–55%'},
    {score:4, label:'HHI 0.40–0.60', note:'Concentrated — one country holds 55–75%'},
    {score:5, label:'HHI > 0.60', note:'Near-monopoly reserve base — one country > 75%'},
  ],
  substitutability: [
    {score:1, label:'Drop-in substitute', note:'Already > 20% market share; commercially deployed by multiple manufacturers'},
    {score:2, label:'10–30% cost/performance penalty', note:'Industry can adapt within 1–2 years; at least one major manufacturer has deployed'},
    {score:3, label:'Significant trade-offs (> 50% cost premium)', note:'3–5 year adaptation; only at pilot scale or limited commercial use'},
    {score:4, label:'Lab-proven only', note:'No commercial-scale alternative; switching requires fundamental product redesign'},
    {score:5, label:'No substitute at any cost', note:'Unique physical/chemical property — no known workaround for primary application'},
  ],
  recyclability: [
    {score:1, label:'> 40% from secondary supply', note:'Mature collection infrastructure; recovery cost competitive with primary'},
    {score:2, label:'20–40% secondary supply', note:'Proven technology for high-concentration scrap; end-of-life limited by logistics'},
    {score:3, label:'5–20% recycled', note:'Technology exists for manufacturing scrap; end-of-life economically marginal'},
    {score:4, label:'< 5% recycled', note:'Technology exists but uneconomic — concentrations too low for cost recovery'},
    {score:5, label:'Effectively 0% recovered', note:'No viable technology, or mineral is chemically consumed/dissipated in use'},
  ],
  extraction_refining: [
    {score:1, label:'Simple, widely accessible', note:'Standard open-pit or dredge mining + physical separation; any industrialised nation can operate'},
    {score:2, label:'Moderately complex', note:'Multi-stage chemical refining; mature technology requiring trained engineers'},
    {score:3, label:'Complex, specialised', note:'Multi-stage hydrometallurgy or solvent extraction; < 20 companies globally have expertise'},
    {score:4, label:'Highly complex (< 15 facilities)', note:'Proprietary/restricted tech; must co-locate with other large-scale operations; near-identical element separation'},
    {score:5, label:'Nation-state level capability', note:'Nuclear-grade separation or equivalent; $100M+ facilities; decade-long licensing barriers'},
  ],
  upcoming_projects: [
    {score:1, label:'Strong pipeline (> 20% new supply)', note:'Major project under construction; first output within 2–3 years; geographically diversified'},
    {score:2, label:'Adequate (10–20%)', note:'Lead projects financed, feasibility complete; first output 3–5 years'},
    {score:3, label:'Thin (5–10%)', note:'Projects at pre-feasibility; realistic output 5–7 years away; execution risk'},
    {score:4, label:'Minimal (< 5%)', note:'Only exploratory-stage projects; any supply 7–10+ years out'},
    {score:5, label:'No pipeline + structural constraint', note:'No projects at any stage AND structural reason supply cannot scale even if prices rise'},
  ],
  import_dependence: [
    {score:1, label:'Self-sufficient (≥ 60% domestic)', note:'Operating mines and/or refineries at commercial scale'},
    {score:2, label:'40–60% domestic', note:'Mostly self-sufficient; imports supplement but don\'t define supply'},
    {score:3, label:'20–40% domestic', note:'Significant base but majority imported; assets undersized relative to demand'},
    {score:4, label:'< 20% domestic', note:'Marginal production; some resources or operations but token relative to demand'},
    {score:5, label:'Zero domestic production', note:'100% import-dependent'},
  ],
  strategic_posture: [
    {score:1, label:'Active secured position', note:'Binding offtakes, equity stakes in foreign assets, or operational JVs delivering material'},
    {score:2, label:'Concrete plans in motion', note:'Exploration blocks auctioned; MOUs/framework agreements signed; KABIL active due diligence; output 3–7 yrs'},
    {score:3, label:'Strategic intent declared', note:'On official critical minerals list; mentioned in policy documents; no specific projects or agreements yet'},
    {score:4, label:'Passive awareness', note:'Acknowledged as important; no KABIL mandate, no exploration blocks, no foreign outreach'},
    {score:5, label:'No awareness or relevance', note:'Not identified as strategic; India is a passive importer of finished goods'},
  ],
  price_volatility: [
    {score:1, label:'Stable (within ± 20% over 5 yrs)', note:'Dominated by long-term contracts; often managed by a single producer; no exchange trading'},
    {score:2, label:'Low (± 20–50%)', note:'Gradual movements driven by transparent factors; mix of contract and spot; liquid market'},
    {score:3, label:'Moderate (± 50–100%)', note:'At least one notable spike or correction; partially opaque market; active procurement management needed'},
    {score:4, label:'High (> ± 100%)', note:'Thin and opaque market; sensitive to single-actor decisions; genuine procurement uncertainty'},
    {score:5, label:'Extreme (> 200% or market breakdown)', note:'Export bans or weaponised supply; price can double overnight; supply cannot be reliably secured'},
  ],
};

/* Sector weights for End-use Applications */
const ENDUSE_SECTORS = [
  {name:'Defence & National Security',         weight:'+1.5', color:'#c42b1e'},
  {name:'Energy Generation & Grid',            weight:'+1.5', color:'#c05b00'},
  {name:'Agriculture & Food Security',         weight:'+0.5', color:'#1e7a2e'},
  {name:'Advanced Semiconductors & Computing', weight:'+1',   color:'#620d3c'},
  {name:'Electrification & Transport',         weight:'+1',   color:'#3d6b7d'},
  {name:'Healthcare & Biomedical',             weight:'+1',   color:'#7d6b9e'},
  {name:'Construction & Heavy Industry',       weight:'+0.5', color:'#6b4020'},
];

const ENDUSE_BREADTH = [
  {n:1,bonus:'+0'},{n:2,bonus:'+0.5'},{n:3,bonus:'+1'},
  {n:4,bonus:'+1.5'},{n:5,bonus:'+2'},{n:6,bonus:'+2.5'},{n:7,bonus:'+3'},
];

function buildScaleHTML(bands) {
  if (!bands?.length) return '';
  return `<div class="crit-scale" style="grid-template-columns:repeat(${bands.length},1fr)">
    ${bands.map((b, i) => {
      const ci = Math.min(i, BAND_BG.length - 1);
      return `<div class="crit-scale-cell" style="background:${BAND_BG[ci]};border-color:${BAND_FG[ci]}28">
        <div class="crit-scale-num" style="color:${BAND_FG[ci]}">${b.score}</div>
        <div class="crit-scale-label" style="color:${BAND_FG[ci]}">${b.label}</div>
        ${b.note ? `<div class="crit-scale-note" style="color:${BAND_FG[ci]}bb">${b.note}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

function buildEndUseHTML(fc) {
  const breadthColors = ENDUSE_BREADTH.map((b, i) => ({
    bg: BAND_BG[Math.min(Math.round(i*4/6), BAND_BG.length-1)],
    fg: BAND_FG[Math.min(Math.round(i*4/6), BAND_FG.length-1)],
    ...b
  }));
  return `<div class="crit-subscales">
    <div class="crit-subscale">
      <div class="crit-subscale-label">
        <span class="crit-subscale-name">Sector presence</span>
        <span class="crit-subscale-max" style="color:${fc}">/ 7 points additive</span>
      </div>
      <div class="crit-sector-grid">
        ${ENDUSE_SECTORS.map(s => `
          <div class="crit-sector-card" style="border-color:${s.color}28;background:${s.color}08">
            <span class="crit-sector-weight" style="color:${s.color}">${s.weight}</span>
            <span class="crit-sector-name">${s.name}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="crit-subscale">
      <div class="crit-subscale-label">
        <span class="crit-subscale-name">Breadth bonus</span>
        <span class="crit-subscale-max" style="color:${fc}">/ 3 points — rewards cross-sector dependency</span>
      </div>
      <div class="crit-scale" style="grid-template-columns:repeat(7,1fr)">
        ${breadthColors.map(b => `
          <div class="crit-scale-cell" style="background:${b.bg};border-color:${b.fg}28">
            <div class="crit-scale-num" style="color:${b.fg};font-size:0.85rem">${b.n} sector${b.n>1?'s':''}</div>
            <div class="crit-scale-label" style="font-size:0.75rem;font-weight:700;color:${b.fg}">${b.bonus}</div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function criteriaScoringHTML(v, fc) {
  switch (v.key) {
    case 'demand':
      return buildScaleHTML(COMPLETE_BANDS.demand);
    case 'growth':
      return buildScaleHTML(COMPLETE_BANDS.growth);

    case 'supplier_concentration':
      return `<div class="crit-subscales">
        ${['Mining concentration','Refining concentration'].map(name => `
          <div class="crit-subscale">
            <div class="crit-subscale-label">
              <span class="crit-subscale-name">${name}</span>
              <span class="crit-subscale-max" style="color:${fc}">/5</span>
            </div>
            ${buildScaleHTML(COMPLETE_BANDS.supplier_sub)}
          </div>`).join('')}
      </div>`;

    case 'reserves':
      return `<div class="crit-subscales">
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Reserve time-frame</span>
            <span class="crit-subscale-max" style="color:${fc}">/5</span>
          </div>
          ${buildScaleHTML(COMPLETE_BANDS.timeframe)}
        </div>
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Reserve diversification</span>
            <span class="crit-subscale-max" style="color:${fc}">/5 — scored by HHI (Herfindahl–Hirschman Index)</span>
          </div>
          <p class="crit-hhi-note">HHI = sum of squared country shares of global reserves. HHI = 1.0 if one country holds 100%; HHI = 0.10 if ten countries each hold 10%. Higher HHI = more concentrated.</p>
          ${buildScaleHTML(COMPLETE_BANDS.diversification)}
        </div>
      </div>`;

    case 'end_use':
      return buildEndUseHTML(fc);

    case 'substitutability_recyclability':
      return `<div class="crit-subscales">
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Substitutability</span>
            <span class="crit-subscale-max" style="color:${fc}">/5</span>
          </div>
          ${buildScaleHTML(COMPLETE_BANDS.substitutability)}
        </div>
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Recyclability</span>
            <span class="crit-subscale-max" style="color:${fc}">/5</span>
          </div>
          ${buildScaleHTML(COMPLETE_BANDS.recyclability)}
        </div>
      </div>`;

    case 'extraction_refining':
      return buildScaleHTML(COMPLETE_BANDS.extraction_refining);
    case 'upcoming_projects':
      return buildScaleHTML(COMPLETE_BANDS.upcoming_projects);

    case 'india_position':
      return `<div class="crit-subscales">
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Import dependence</span>
            <span class="crit-subscale-max" style="color:${fc}">/5</span>
          </div>
          ${buildScaleHTML(COMPLETE_BANDS.import_dependence)}
        </div>
        <div class="crit-subscale">
          <div class="crit-subscale-label">
            <span class="crit-subscale-name">Strategic posture</span>
            <span class="crit-subscale-max" style="color:${fc}">/5</span>
          </div>
          ${buildScaleHTML(COMPLETE_BANDS.strategic_posture)}
        </div>
      </div>`;

    case 'price_volatility':
      return buildScaleHTML(COMPLETE_BANDS.price_volatility);
  }
  return '';
}

function ensureCriteriaDrawer() {
  let overlay = document.getElementById('crit-overlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'crit-overlay';
  overlay.className = 'crit-overlay';
  overlay.innerHTML = `
    <div class="crit-panel" id="crit-panel">
      <button class="crit-close" id="crit-close">✕</button>
      <div class="crit-panel-inner">
        <div class="crit-panel-head">
          <span class="crit-panel-num" id="crit-panel-num"></span>
          <div>
            <h2 id="crit-panel-name"></h2>
            <span id="crit-panel-family"></span>
          </div>
          <span class="crit-panel-max" id="crit-panel-max"></span>
        </div>
        <p class="crit-panel-what" id="crit-panel-what"></p>
        <div id="crit-panel-scoring"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeCriteriaDrawer(); });
  overlay.querySelector('#crit-close').addEventListener('click', closeCriteriaDrawer);
  return overlay;
}

function openCriteriaDrawer(v, idx, fc) {
  const overlay = ensureCriteriaDrawer();
  overlay.style.setProperty('--crit-color', fc);
  overlay.querySelector('#crit-panel-num').textContent = idx + 1;
  overlay.querySelector('#crit-panel-name').textContent = v.name;
  overlay.querySelector('#crit-panel-family').textContent = v.family;
  overlay.querySelector('#crit-panel-family').style.cssText = `color:${fc};background:${fc}12;border-color:${fc}30`;
  overlay.querySelector('#crit-panel-max').textContent = `/${v.max}`;
  overlay.querySelector('#crit-panel-what').textContent = v.what;
  overlay.querySelector('#crit-panel-scoring').innerHTML = criteriaScoringHTML(v, fc);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCriteriaDrawer() {
  document.getElementById('crit-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCriteria() {
  const container = document.getElementById('criteria-vectors-list');
  if (container.dataset.rendered) return;
  container.dataset.rendered = 'true';

  container.innerHTML = `<div class="criteria-picker-grid">
    ${AppData.criteriaVectors.map((v, idx) => {
      const fc = FAMILY_COLOR[v.family] || '#620d3c';
      return `<button class="crit-picker-card" data-idx="${idx}" style="--crit-color:${fc}">
        <div class="crit-picker-top">
          <span class="crit-picker-num">${idx + 1}</span>
          <span class="crit-picker-max">/${v.max}</span>
        </div>
        <h3>${v.name}</h3>
        <span class="crit-picker-family">${v.family}</span>
        <span class="crit-picker-open">View scoring criteria →</span>
      </button>`;
    }).join('')}
  </div>
  <div class="crit-methodology card">
    <h3 class="crit-meth-title">Methodology note</h3>
    <p>Eight of the ten vectors are tied to published quantitative thresholds: tonnes, CAGR bands, market-share percentages, HHI bands, reserve-years, secondary-supply shares, and price-movement percentages. The two qualitative vectors, extraction complexity and strategic posture, are anchored to observable facts (for example, whether a solvent-extraction cascade is required, or whether an offtake has been signed).</p>
    <p>We are open to feedback on how to make this better.</p>
    <div class="crit-shape">
      <div class="crit-shape-text">
        <p><strong>No single composite score.</strong> Copper, germanium and cerium can add up to the same total, yet their profiles look nothing alike. A single composite score is not helpful: it strips the analysis of exactly this nuance.</p>
        <div class="crit-shape-legend">
          <span class="csl-item"><span class="csl-dot" style="background:#620d3c"></span>Copper</span>
          <span class="csl-item"><span class="csl-dot" style="background:#f1a222"></span>Germanium</span>
          <span class="csl-item"><span class="csl-dot" style="background:#3d6b7d"></span>Cerium</span>
        </div>
      </div>
      <div class="crit-shape-chart"><div class="crit-shape-canvas-wrap"><canvas id="crit-shape-canvas"></canvas></div></div>
    </div>
  </div>`;

  container.querySelectorAll('.crit-picker-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = Number(card.dataset.idx);
      const v = AppData.criteriaVectors[idx];
      const fc = FAMILY_COLOR[v.family] || '#620d3c';
      openCriteriaDrawer(v, idx, fc);
    });
  });

  drawCriteriaShapeChart();
}


function drawCriteriaShapeChart() {
  const canvas = document.getElementById('crit-shape-canvas');
  if (!canvas) return;
  if (AppState.radarChartCriteria) { AppState.radarChartCriteria.destroy(); AppState.radarChartCriteria = null; }

  const names = ['Copper', 'Germanium', 'Cerium'];
  const minerals = names.map(getMineralByName).filter(Boolean);
  if (!minerals.length) return;

  const labels = AppData.criteriaVectors.map(v => v.name.split(' ').slice(0, 2).join(' '));
  const datasets = minerals.map((m, i) => {
    const col = COMPARE_COLORS[i] || groupColor(getGroup(m.mineral));
    return {
      label: m.mineral,
      data: AppData.criteriaVectors.map(v => normalizeToFive(m, v.key)),
      backgroundColor: col + '16',
      borderColor: col,
      borderWidth: 1.6,
      pointBackgroundColor: col,
      pointRadius: 2,
      pointHoverRadius: 4,
    };
  });

  AppState.radarChartCriteria = new Chart(canvas.getContext('2d'), {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      layout: { padding: 10 },
      scales: {
        r: {
          min: 0, max: 5,
          ticks: { display: false, stepSize: 1 },
          grid: { color: 'rgba(98,13,60,0.08)' },
          pointLabels: { color: '#6b4020', font: { size: 8, family: 'Hanken Grotesk' }, padding: 3 },
          angleLines: { color: 'rgba(98,13,60,0.06)' }
        }
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════════════════
   COMPARE PAGE
   ════════════════════════════════════════════════════════════ */

function renderCompare() {
  const sel = AppState.compareSelections;

  // Sync select values
  ['a', 'b', 'c'].forEach(slot => {
    const el = document.getElementById(`compare-${slot}`);
    if (el.value !== (sel[slot] || '')) el.value = sel[slot] || '';
  });

  const selected = ['a', 'b', 'c']
    .map(k => sel[k])
    .filter(Boolean)
    .map(getMineralByName)
    .filter(Boolean);

  const empty   = document.getElementById('compare-empty');
  const content = document.getElementById('compare-content');

  if (selected.length < 2) {
    empty.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  content.classList.remove('hidden');

  // Radar
  if (AppState.radarChartCompare) { AppState.radarChartCompare.destroy(); AppState.radarChartCompare = null; }

  const labels   = AppData.criteriaVectors.map(v => v.name.split(' ').slice(0, 2).join(' '));
  const datasets = selected.map((m, i) => {
    const col = COMPARE_COLORS[i] || groupColor(getGroup(m.mineral));
    return {
      label: m.mineral,
      data: AppData.criteriaVectors.map(v => normalizeToFive(m, v.key)),
      backgroundColor: col + '1e',
      borderColor: col,
      borderWidth: 1.5,
      pointBackgroundColor: col,
      pointRadius: 2.5, pointHoverRadius: 4,
    };
  });

  AppState.radarChartCompare = new Chart(
    document.getElementById('compare-radar-canvas').getContext('2d'),
    {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: {
          r: {
            min: 0, max: 5,
            ticks: { display: false },
            grid: { color: 'rgba(98,13,60,0.08)' },
            pointLabels: { color: '#6b4020', font: { size: 8, family: 'Hanken Grotesk' } },
            angleLines: { color: 'rgba(98,13,60,0.06)' }
          }
        },
        plugins: {
          legend: { labels: { color: '#1a0804', font: { size: 11, family: 'Hanken Grotesk' }, boxWidth: 12, padding: 14 } },
          tooltip: {
            backgroundColor: '#fff', titleColor: '#1a0804',
            bodyColor: '#6b4020', borderColor: '#e4d49c', borderWidth: 1,
            callbacks: { label: ctx => {
              const v   = AppData.criteriaVectors[ctx.dataIndex];
              const raw = getVectorValue(selected[ctx.datasetIndex], v.key);
              return ` ${selected[ctx.datasetIndex].mineral}: ${raw ?? 'n/a'} / ${v.max}`;
            }}
          }
        }
      }
    }
  );

  // Table
  const table = document.getElementById('compare-table');
  let tableHTML = `<thead><tr><th>Vector</th>${selected.map(m => `<th style="text-align:center">${m.mineral}</th>`).join('')}</tr></thead><tbody>`;
  AppData.criteriaVectors.forEach(v => {
    const vals  = selected.map(m => getVectorValue(m, v.key));
    const normed = vals.map(val => val !== null ? val / v.max : 0);
    tableHTML += `<tr><td class="compare-vec-label">${v.name} <span class="compare-max">/${v.max}</span></td>`;
    vals.forEach((val, i) => {
      const col = `hsl(${Math.round((1 - normed[i]) * 90)},60%,42%)`;
      tableHTML += `<td style="color:${col};font-weight:600;text-align:center;">${val ?? '—'}</td>`;
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody>';
  table.innerHTML = tableHTML;
}

/* ════════════════════════════════════════════════════════════
   GROUPS PAGE
   ════════════════════════════════════════════════════════════ */

/* Rows of the group-average matrix: [label, accessor, scale max]. */
const GROUP_MATRIX_ROWS = [
  ['Current Global Demand',             m => m.vectors.demand?.score, 5],
  ['Projected Demand Growth',           m => m.vectors.growth?.score, 5],
  ['Mining Supplier Diversity',         m => m.vectors.supplier_concentration?.sub?.mining_diversity, 5],
  ['Refining Supplier Diversity',       m => m.vectors.supplier_concentration?.sub?.refining_diversity, 5],
  ['Global Reserves (time-frame)',      m => m.vectors.reserves?.sub?.timeframe, 5],
  ['Global Reserves (diversification)', m => m.vectors.reserves?.sub?.diversification, 5],
  ['End-use Applications (composite)',  m => m.vectors.end_use?.composite, 10],
  ['Substitutability',                  m => m.vectors.substitutability_recyclability?.sub?.substitutability, 5],
  ['Recyclability',                     m => m.vectors.substitutability_recyclability?.sub?.recyclability, 5],
  ['Extraction & Refining',             m => m.vectors.extraction_refining?.score, 5],
  ['Upcoming Projects',                 m => m.vectors.upcoming_projects?.score, 5],
  ["India's Position (import dep.)",    m => m.vectors.india_position?.sub?.import_dependence, 5],
  ["India's Position (strat. posture)", m => m.vectors.india_position?.sub?.strategic_posture, 5],
  ['Price Volatility',                  m => m.vectors.price_volatility?.score, 5],
];

/* Average sub-score per group, as an interactive matrix. Highest in each row
   is filled with the group's colour; other cells get a faint magnitude bar. */
function renderGroupsMatrix() {
  const host = document.getElementById('groups-matrix');
  if (!host || host.dataset.rendered) return;
  host.dataset.rendered = 'true';

  const groups  = AppData.groups.filter(g => g.id !== 0).sort((a, b) => a.id - b.id);
  const members = groups.map(g => AppData.minerals.filter(m => getGroup(m.mineral) === g.id));
  const avg = arr => {
    const vals = arr.filter(v => v != null && !isNaN(v));
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  let html = `<div class="gmx"><table class="gmx-table"><thead><tr>
    <th class="gmx-rowhead">Vector / sub-score</th>
    ${groups.map(g => `<th class="gmx-colhead" data-col="${g.id}" style="--gc:${g.color}" title="${g.name}">
        <span class="gmx-gnum" style="color:${g.color}">Group ${g.id}</span>
        <span class="gmx-gname">${g.name}</span>
      </th>`).join('')}
  </tr></thead><tbody>`;

  GROUP_MATRIX_ROWS.forEach(([label, get, max]) => {
    const cellAvgs = members.map(ms => avg(ms.map(get)));
    const rowMax = Math.max(...cellAvgs.filter(v => v != null));
    html += `<tr><td class="gmx-label">${label}</td>`;
    cellAvgs.forEach((v, i) => {
      const g = groups[i];
      if (v == null) { html += `<td class="gmx-cell" data-col="${g.id}">—</td>`; return; }
      const isMax = Math.abs(v - rowMax) < 0.005;
      // Highlight each row's max with a soft group-tinted band + bold number.
      const dark = colorLuminance(g.color) <= 150;
      const style = isMax ? `background:${g.color}33;color:${dark ? g.color : '#1a0804'}` : '';
      html += `<td class="gmx-cell${isMax ? ' gmx-max' : ''}" data-col="${g.id}" style="${style}">
        <span class="gmx-val">${v.toFixed(2)}</span>
      </td>`;
    });
    html += `</tr>`;
  });
  host.innerHTML = html + `</tbody></table></div>`;

  // Column hover: spotlight one group, dim the rest
  const table = host.querySelector('.gmx-table');
  const clear = () => {
    table.classList.remove('gmx-dimmed');
    table.querySelectorAll('.gmx-hot').forEach(x => x.classList.remove('gmx-hot'));
  };
  table.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-col]');
    if (!el) return;
    clear();
    table.classList.add('gmx-dimmed');
    table.querySelectorAll(`[data-col="${el.dataset.col}"]`).forEach(x => x.classList.add('gmx-hot'));
  });
  table.addEventListener('mouseleave', clear);

  // Click a group header to jump to its detail card
  table.querySelectorAll('.gmx-colhead').forEach(th =>
    th.addEventListener('click', () => {
      document.querySelector(`.group-detail-card[data-gid="${th.dataset.col}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    })
  );
}

function renderGroups() {
  const list = document.getElementById('groups-detail-list');
  if (list.dataset.rendered) return;
  list.dataset.rendered = 'true';

  // Order: 1-6 then 0
  const ordered = [...AppData.groups].sort((a, b) => {
    if (a.id === 0) return 1; if (b.id === 0) return -1; return a.id - b.id;
  });

  const mainGroups = ordered.filter(g => g.id !== 0);
  const outlier = ordered.find(g => g.id === 0);

  const cardHTML = g => {
    const members = AppData.minerals.filter(m => getGroup(m.mineral) === g.id);
    const desc = GROUP_DESCRIPTIONS[g.id] || {};
    return `
      <button class="group-picker-card" data-gid="${g.id}" style="--gcolor:${g.color}">
        <div class="gpc-topline">
          <span class="gpc-badge">${g.id === 0 ? 'Outlier' : `Group ${g.id}`}</span>
          <span class="gpc-count">${members.length} mineral${members.length === 1 ? '' : 's'}</span>
        </div>
        <h2 class="gpc-name">${g.name}</h2>
        ${desc.tagline ? `<p class="gpc-tagline">${desc.tagline}</p>` : ''}
        <div class="gpc-members">${members.map(m =>
          `<span class="gpc-member" data-mineral="${m.mineral}">${m.mineral}</span>`
        ).join('')}</div>
        <span class="gpc-open">View characterisation + policy →</span>
      </button>`;
  };

  list.innerHTML = `
    <div class="groups-picker-grid">
      ${mainGroups.map(cardHTML).join('')}
    </div>
    ${outlier ? `<div class="groups-outlier-picker">${cardHTML(outlier)}</div>` : ''}`;

  list.addEventListener('click', e => {
    const mineral = e.target.closest('.gpc-member');
    if (mineral) {
      e.stopPropagation();
      navigate('mineral', mineral.dataset.mineral);
      return;
    }
    const card = e.target.closest('.group-picker-card');
    if (card) openGroupModal(card.dataset.gid, null, 'center');
  });

  // "Why distinct" section
  const why = document.getElementById('groups-why');
  why.innerHTML = `
    <div class="card groups-prose-card">
      <h2 class="groups-section-title">Why the groups are distinct</h2>
      <p>The six groups are reasonably distinct on three grounds.</p>
      <p><strong>First, is the binding constraint volume or vulnerability,</strong> whether a mineral matters because of how much is consumed or because of how exposed its supply is. Group 1 answers volume. Every other group answers vulnerability, and consists of minerals consumed in far smaller quantities.</p>
      <p><strong>Second, where the supply-chain constraint sits.</strong> For Group 6 it sits nowhere in particular; the vulnerability is diffuse. For Groups 2, 3, 4 and 5 it sits at the refining stage, but for different reasons: in Group 2 the reserves are concentrated too; in Group 3 the reserves are concentrated but recycling provides an escape; in Groups 4 and 5 the reserves are not the problem at all.</p>
      <p><strong>Third, whether the constraint is currently active.</strong> Groups 4 and 5 are both abundant-reserve, refining-monopoly minerals, but Group 5's demand is large and rising and its chokepoint is widening, while Group 4's demand is small and flat and its monopoly sits unexercised. Group 2's monopoly, by contrast, is being used right now.</p>
    </div>`;

  // Methodology section
  const meth = document.getElementById('groups-methodology');
  meth.innerHTML = `
    <div class="card groups-prose-card">
      <h2 class="groups-section-title">Grouping Methodology</h2>
      <h3 class="groups-sub-title">Inputs</h3>
      <p>Each mineral is represented by its fifteen scores: the two sub-scores of each two-part vector and the single score of each of the other five. Composite roll-ups are not used as inputs, since they would double-count their constituents. Because the vectors are measured on different scales, each was standardised before distances were computed, so that no vector influences the grouping merely by having a wider range.</p>
      <h3 class="groups-sub-title">Clustering</h3>
      <p>We sorted the minerals into groups based on how similar their profiles were. Instead of guessing how many groups we needed upfront, we used agglomerative hierarchical clustering with Ward's linkage, a method that builds a "family tree" of the minerals step by step. It naturally pairs up the most similar minerals first, creating neat, well-balanced groups, and lets us read the data from both a big-picture and a fine-grained view.</p>
      <h3 class="groups-sub-title">How many groups</h3>
      <p>The clustering tree was examined at cuts from three to nine groups. <strong>Stability:</strong> the six-group solution is robust, the same groups persist when the tree is cut at five, six and seven, with only edge members reassigned. <strong>Interpretability:</strong> at six groups, every cluster corresponds to a profile that can be described in supply-chain terms.</p>
      <h3 class="groups-sub-title">A few manual tweaks</h3>
      <p>The statistical output was treated as a prior rather than a verdict. A group brings together minerals that call for the same response from India, so where a mineral sat near a boundary its placement was settled on that basis: scandium, for example, sits with the rising-demand processing group rather than with the other rare earths, and promethium is treated as an outlier.</p>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   RESIZE HANDLING
   ════════════════════════════════════════════════════════════ */

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    // Canvas radars redraw on navigation; nothing layout-critical depends on resize.
  }, 180);
});

/* ════════════════════════════════════════════════════════════
   GUIDED TOUR (experimental)
   ════════════════════════════════════════════════════════════ */

const TOUR_STEPS = [
  { page: 'overview', target: '#pt-grid', icon: '01', kicker: 'Start with the list', title: 'India calls 51 elements critical',
    text: "India's critical minerals list is broad. We do a mineral-by-mineral analysis to group these 51 minerals into six groups that can help inform policy choices." },
  { page: 'methodology', target: '.criteria-picker-grid', icon: '02', kicker: 'Open the method', title: 'How we score each mineral',
    text: "We score each mineral across ten separate questions: demand, supply concentration, substitutes, processing, India's position, and more. We never add them into a single composite score." },
  { page: 'mineral', mineral: 'Copper', target: '.mp-body', icon: '03', kicker: 'Inspect one mineral', title: 'Every score has reasoning',
    text: "On a mineral page, the radar shows how that mineral performs across the ten questions. Each score can expand to show the reasoning, and the Group & policy button connects the mineral to the wider response." },
  { page: 'groups', target: '.groups-picker-grid', icon: '04', kicker: 'Move from data to policy', title: 'Similar bottlenecks sit together',
    text: "The groups are a practical way to read the list. Open any card to see the shared constraint and the policy choices for India." },
  { page: 'overview', target: '.lists-chart-card', icon: '05', kicker: 'See the wider pattern', title: 'The lists keep growing',
    text: "Other countries show the same drift: more minerals, broader lists, less prioritisation. This framework, and our whole attempt, is to make India's list more useful, not simply longer." },
];
let tourIdx = -1, tourCard = null, tourWelcome = null, tourVeil = null;

function buildTourWelcome() {
  if (tourWelcome) return;
  tourWelcome = document.createElement('div');
  tourWelcome.className = 'tour-welcome';
  tourWelcome.innerHTML = `
    <div class="tw-card">
      <div class="tw-rail" aria-hidden="true">
        <span>51</span>
        <small>minerals</small>
      </div>
      <div class="tw-mark">Guided tour</div>
      <h2>A quick way into the framework.</h2>
      <p>In about a minute, this tour will walk you through the key things to focus on.</p>
      <div class="tw-actions">
        <button class="tw-skip">Skip for now</button>
        <button class="tw-start">Start the tour →</button>
      </div>
    </div>`;
  document.body.appendChild(tourWelcome);
  tourWelcome.querySelector('.tw-skip').addEventListener('click', dismissTourWelcome);
  tourWelcome.querySelector('.tw-start').addEventListener('click', () => {
    hideTourWelcome();
    startTour();
  });
  tourWelcome.addEventListener('click', e => {
    if (e.target === tourWelcome) dismissTourWelcome();
  });
}
function showTourWelcome(opts = {}) {
  buildTourWelcome();
  if (opts.manual) localStorage.removeItem('critminTourSeen');
  tourWelcome.classList.add('open');
  document.body.classList.add('tour-welcome-open');
}
function hideTourWelcome() {
  if (tourWelcome) tourWelcome.classList.remove('open');
  document.body.classList.remove('tour-welcome-open');
}
function dismissTourWelcome() {
  localStorage.setItem('critminTourSeen', '1');
  hideTourWelcome();
}

function buildTourCard() {
  if (tourCard) return;
  tourVeil = document.createElement('div');
  tourVeil.className = 'tour-veil';
  document.body.appendChild(tourVeil);

  tourCard = document.createElement('div');
  tourCard.className = 'tour-card';
  tourCard.innerHTML = `
    <button class="tour-close" aria-label="Close tour">×</button>
    <div class="tour-head">
      <span class="tour-icon"></span>
      <div class="tour-meta">
        <span class="tour-count"></span>
        <span class="tour-kicker"></span>
      </div>
    </div>
    <div class="tour-title"></div>
    <div class="tour-text"></div>
    <div class="tour-progress"><span></span></div>
    <div class="tour-actions">
      <button class="tour-skip">Skip tour</button>
      <div class="right">
        <button class="tour-prev">← Back</button>
        <button class="tour-next">Next →</button>
      </div>
    </div>`;
  document.body.appendChild(tourCard);
  tourCard.querySelector('.tour-close').addEventListener('click', endTour);
  tourCard.querySelector('.tour-skip').addEventListener('click', endTour);
  tourCard.querySelector('.tour-prev').addEventListener('click', () => tourShow(tourIdx - 1));
  tourCard.querySelector('.tour-next').addEventListener('click', () => {
    if (tourIdx >= TOUR_STEPS.length - 1) endTour(); else tourShow(tourIdx + 1);
  });
  document.addEventListener('keydown', e => {
    if (tourIdx < 0) return;
    if (e.key === 'Escape') endTour();
    else if (e.key === 'ArrowRight') { if (tourIdx < TOUR_STEPS.length - 1) tourShow(tourIdx + 1); }
    else if (e.key === 'ArrowLeft')  { if (tourIdx > 0) tourShow(tourIdx - 1); }
  });
}
function clearTourSpot() {
  document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot'));
}
function startTour() {
  localStorage.removeItem('critminTourSeen');
  buildTourCard();
  document.body.classList.add('tour-active');
  if (tourVeil) tourVeil.classList.add('open');
  tourShow(0);
}
function positionTourCard() {
  if (!tourCard) return;
  tourCard.style.left = '50%';
  tourCard.style.top = 'auto';
  tourCard.style.right = 'auto';
  tourCard.style.bottom = '18px';
  tourCard.style.transform = 'translateX(-50%)';
  tourCard.style.width = `${Math.min(760, Math.round(window.innerWidth * 0.92))}px`;
}

function tourShow(i) {
  tourIdx = Math.max(0, Math.min(TOUR_STEPS.length - 1, i));
  const s = TOUR_STEPS[tourIdx];
  clearTourSpot();
  closeGroupModal();
  if (s.page === 'mineral') navigate('mineral', s.mineral); else navigate(s.page);
  tourCard.style.display = 'block';
  document.body.classList.add('tour-active');
  if (tourVeil) tourVeil.classList.add('open');
  setTimeout(() => {
    const t = s.target && document.querySelector(s.target);
    if (t) {
      t.classList.add('tour-spot');
      t.scrollIntoView({ behavior: 'smooth', block: t.offsetHeight > window.innerHeight * 0.72 ? 'start' : 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    tourCard.querySelector('.tour-icon').textContent = s.icon || String(tourIdx + 1).padStart(2, '0');
    tourCard.querySelector('.tour-count').textContent = `Step ${tourIdx + 1} of ${TOUR_STEPS.length}`;
    tourCard.querySelector('.tour-kicker').textContent = s.kicker || '';
    tourCard.querySelector('.tour-title').textContent = s.title;
    tourCard.querySelector('.tour-text').textContent = s.text;
    tourCard.querySelector('.tour-prev').disabled = tourIdx === 0;
    tourCard.querySelector('.tour-next').textContent = tourIdx === TOUR_STEPS.length - 1 ? 'Finish tour' : 'Next →';
    tourCard.querySelector('.tour-progress span').style.width = `${((tourIdx + 1) / TOUR_STEPS.length) * 100}%`;
    setTimeout(() => positionTourCard(), 180);
  }, 160);
}
function endTour() {
  hideTourWelcome();
  localStorage.setItem('critminTourSeen', '1');
  clearTourSpot();
  if (tourCard) tourCard.style.display = 'none';
  if (tourVeil) tourVeil.classList.remove('open');
  document.body.classList.remove('tour-active');
  document.body.style.overflow = '';
  tourIdx = -1;
}
window.addEventListener('resize', () => {
  if (tourIdx >= 0) positionTourCard();
});

/* ════════════════════════════════════════════════════════════
   BOOTSTRAP
   ════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', loadData);
