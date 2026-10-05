// Shared catalog shapes. Content (CatalogEntry) is code; the live shapes are
// content merged with the database (lib/catalog-merge.ts). No imports — this
// file is reachable from next.config.ts.

export type StockState = "in" | "low" | "out";
export type PackDiscount = { qty: number; pct: number };

export type Lot = {
  lot: string;
  purityPct: number;
  method: "HPLC" | "HPLC+MS";
  testedOn: string;   // ISO date
  coaFile: string;    // public certificate URL
};
export type PendingLot = { pending: true };

export type Identity = {
  cas?: string;
  formula?: string;
  molecularWeight?: string;
  sequence?: string;
  source?: string;
};

export type VariantContent = { id: string; strength: string };

export type CatalogEntry<C extends string = string> = {
  slug: string;
  name: string;
  description?: string;
  descriptionSource?: string;
  chemicalClass: C;
  identity: Identity;
  components?: string[];
  form: string;
  storage: string;
  vialMl: number;
  variants: VariantContent[];
  packDiscounts: PackDiscount[];
  featured?: boolean;
};

export type LiveVariant = VariantContent & {
  priceUsd: number;
  stock: StockState;
  availableVials: number;
  lot: Lot | PendingLot;   // lot selling now; else the last live lot (sold out); else pending
};

export type LiveCompound<C extends string = string> = Omit<CatalogEntry<C>, "variants"> & { variants: LiveVariant[] };

// Every lot that was ever live — for COA lookup and lot alerts.
export type PublicLot = Lot & {
  slug: string;
  compoundName: string;
  variantId: string;
  strength: string;
  status: "live" | "sold_out" | "retired";
  liveAt: string;
};
