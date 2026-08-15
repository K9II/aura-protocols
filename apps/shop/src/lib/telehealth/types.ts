export type CatalogProduct = {
  id: string;
  name: string;
  imageUrl: string;
  intakeUrl: string;      // passthrough from the API — never reconstructed
  availability: string;   // the API's `details` string
  fromPrice: { months: number; amount: number } | null; // null = no purchasable term
};

export type CatalogResult =
  | { ok: true; products: CatalogProduct[] }
  | { ok: false; status: number };

export type TelehealthEvent = {
  event: "lead.created" | "lead.enriched" | "order.created" | "payout.created" | string;
  payload: unknown;
};
