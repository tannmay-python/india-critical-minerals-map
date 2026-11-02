// Map encoding in one place: colour = supply-chain stage (five bands), fill = status, shape = kind.
// Colour never carries status: solid = operating, licensed or held; open ring = in progress;
// faded = annulled, stalled, closed, lost or withdrawn. Circles are projects or sites, squares
// auction blocks, diamonds demand sites (cell plants, fabs), drawn in ink because they are context.
//
// The five hues were picked by search and pass the dataviz palette validator on ALL pairs (on a
// map any two markers can sit side by side) against the white land surface, 2 Nov 2026:
// colour-blind worst pair dE 8.3 (target 8), normal vision 17.6 (floor 15), each hue >= 3:1.
export type Band = "upstream" | "process" | "make" | "recycle" | "research";

export const BANDS: { id: Band; label: string; short: string; color: string }[] = [
  { id: "upstream", label: "Exploration and mining", short: "Explore, mine", color: "#b8860b" },
  { id: "process", label: "Processing and refining", short: "Refine", color: "#c8362b" },
  { id: "make", label: "Materials and magnets", short: "Materials, magnets", color: "#3366cc" },
  { id: "recycle", label: "Recycling", short: "Recycle", color: "#0f9b6e" },
  { id: "research", label: "Research", short: "Research", color: "#9c3d9c" },
];
export const BAND_COLOR = Object.fromEntries(BANDS.map((b) => [b.id, b.color])) as Record<Band, string>;
export const DEMAND_COLOR = "#4a3f38";

const STAGE_BAND: Record<string, Band> = {
  Exploration: "upstream", Mining: "upstream", Beneficiation: "upstream",
  Refining: "process", "Policy infrastructure": "process",
  Materials: "make", Magnets: "make",
  Recycling: "recycle", "R&D": "research",
};
export const bandOfStage = (stage: string): Band => STAGE_BAND[stage] ?? "upstream";
