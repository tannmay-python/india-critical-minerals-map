// Shapes of the JSON emitted by scripts/build-data.py. Keep in sync with that script.
export type Precision = "exact" | "site" | "town" | "district" | "state";
export type StatusGroup = "active" | "pipeline" | "inactive";
export type Confidence = "high" | "medium" | "low";

export interface Source {
  id: string; url: string; title: string; publisher: string; tier: "T1" | "T2" | "T3" | "T4" | "T5";
  date: string | null; archive_url: string | null; supports: string[];
}
export interface Milestone { date: string; event: string; source_id?: string }
export interface Quantity { value: number | string | null; unit: string | null; basis?: string | null; phase?: string | null }
export interface AuctionOffer {
  tranche: string; nit_date: string | null; outcome: string; outcome_date: string | null;
  annulment_reason: string | null; preferred_bidder: string | null; final_offer_pct: number | null;
  reserve_price: string | number | null;
}

export interface Entity {
  id: string; name: string; aliases: string[]; layer: string; stages: string[];
  minerals: string[]; minerals_expanded: string[]; commodity_as_stated: string | null; products: string[];
  operator: string | null; operator_type: string | null;
  owners: { entity: string; stake_pct: number | null }[];
  partners: { name: string; country?: string; role?: string }[];
  location: { address: string | null; village_or_town: string | null; district: string | null; state: string | null; country: string | null; precision: Precision };
  lat: number | null; lon: number | null; has_geometry: boolean;
  status: string; status_group: StatusGroup; status_as_of: string; status_detail: string | null;
  capacity?: { planned?: Quantity; installed?: Quantity } | null;
  investment?: { amount: number | string | null; currency: string | null; basis: string | null } | null;
  feedstock: string | null; feedstock_detail: string | null;
  schemes: string[]; scheme_status: Record<string, string>;
  dates: Record<string, string | null>;
  milestones: Milestone[];
  narrative: { significance?: string; what_it_does?: string; why_it_matters?: string };
  related: string[]; see_also: string[]; confidence: Confidence; last_verified: string; notes: string | null;
  sources: Source[];
  dashboard_links: { name: string; url: string }[];
  slippage_months: number | null; stalled_flag: boolean;
  block_lag_months: { pb_to_lease: number | null; lease_to_production: number | null } | null;
  block?: { concession_type: string; auction_route: string; area_sq_km: number | null; exploration_stage: string | null;
    resources?: { mineral: string; quantity: number | string | null; unit: string | null; grade: string | null; category: string | null }[] };
  auction?: { history: AuctionOffer[]; loi_date: string | null; licence_or_lease_executed: string | null; production_started: string | null };
  overseas?: { host_country: string; host_region: string | null; indian_entities: string[]; stake_pct: number | null; deal_type: string;
    india_link: { city: string; lat: number; lon: number } };
  rnd?: { institution_type: string; programmes: string[]; focus: string[]; funding?: { amount: number | null; currency: string | null; funder: string | null } };
  demand?: { product: string; capacity_gwh: number | null; inputs: string[] };
}

export interface Mineral {
  name: string; symbol: string | null; dashboard_group: { id: number; label: string; color: string } | null;
  family: "REE" | "PGE" | null; synonyms: string[]; dashboard_url: string | null;
  umbrella?: boolean; members?: string[];
  lists: { goi_critical_2023: boolean; mmdr_part_d: boolean };
}

export interface Stage { id: string; order: number; color: { light: string; dark: string }; glyph: "circle" | "square" | "diamond"; description: string }
