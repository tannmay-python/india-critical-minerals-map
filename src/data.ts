// Loads the JSON that scripts/build-data.py writes to public/data and derives what the UI needs.
import type { Entity, Mineral, Stage, StatusGroup } from "./lib/types";

export interface Meta { built: string; entities: number; open_questions?: number }

export interface Dataset {
  entities: Entity[];
  byId: Map<string, Entity>;
  minerals: Mineral[];
  stages: Stage[];
  meta: Meta;
}

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return (await r.json()) as T;
}

export async function loadData(): Promise<Dataset> {
  const [entities, minerals, stages, meta] = await Promise.all([
    getJSON<Entity[]>("data/entities.json"),
    getJSON<Mineral[]>("data/minerals.json"),
    getJSON<Stage[]>("data/stages.json"),
    getJSON<Meta>("data/meta.json"),
  ]);
  return { entities, byId: new Map(entities.map((e) => [e.id, e])), minerals, stages, meta };
}

const LAYER_STAGE: Record<string, string> = {
  blocks: "Exploration", mines: "Mining", processing: "Refining", materials: "Materials",
  magnets: "Magnets", recycling: "Recycling", rnd: "R&D", demand: "Cells & Devices",
};

/** The stage a marker is coloured by: the one that matches its layer, else its first stage. */
export function primaryStage(e: Entity): string {
  const s = LAYER_STAGE[e.layer];
  return s && e.stages.includes(s) ? s : e.stages[0] ?? "Exploration";
}

export type View = "india" | "abroad";

export const GROUP_LABEL: Record<View, Record<StatusGroup, string>> = {
  india: { active: "Operating or licensed", pipeline: "In progress", inactive: "Annulled, stalled or closed" },
  abroad: { active: "Operating or held", pipeline: "In progress", inactive: "Lost, withdrawn or stalled" },
};
export const GROUP_ORDER: StatusGroup[] = ["active", "pipeline", "inactive"];

/** Mineral names a record answers to: its own tags, plus members of any umbrella tag it carries. */
export function mineralKeys(e: Entity, umbrellas: Map<string, string[]>): Set<string> {
  const out = new Set<string>([...e.minerals, ...(e.minerals_expanded ?? [])]);
  for (const m of e.minerals) for (const x of umbrellas.get(m) ?? []) out.add(x);
  return out;
}
