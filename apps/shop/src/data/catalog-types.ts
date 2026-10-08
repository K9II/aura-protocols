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

// A strength as stored in Aura Store (catalog_variants): id "30mg", strength "30 mg".
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
  packDiscounts: PackDiscount[];
  featured?: boolean;
  designation?: string;    // APro designation shown with the scientific name ("APro-3 RT")
};

export type LiveVariant = VariantContent & {
  shown: boolean;          // strength shown on the store (LiveCatalog.shown keeps only these)
  priceUsd: number;
  stock: StockState;       // the only stock signal that leaves the server: never send counts to the browser
  lot: Lot | PendingLot;   // lot selling now; else the last live lot (sold out); else pending
  wholesale: boolean;        // sold as a 10-vial kit on /wholesale (catalog_variants.wholesale)
};

export type LiveCompound<C extends string = string> = CatalogEntry<C> & { variants: LiveVariant[] };

// Every lot that was ever live, of shown products only — for COA lookup and lot alerts.
export type PublicLot = Lot & {
  slug: string;
  compoundName: string;
  variantId: string;
  strength: string;
  status: "live" | "sold_out" | "retired";
  liveAt: string;
  onStore: boolean;   // its strength is shown and not archived (lot alerts announce only these)
};
