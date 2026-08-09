import { CATALOG_BASE } from "./config";
import type { CatalogProduct, CatalogResult } from "./types";

type RawPrice = { price1Month?: string; price3Month?: string; price6Month?: string };
type RawProduct = RawPrice & { id: string; name: string; image?: string; intakeUrl: string; details?: string };

export function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Cheapest term whose price is > 0. `$0.00` means the term is not offered. */
export function pickFromPrice(p: RawPrice): { months: number; amount: number } | null {
  const terms = [
    { months: 1, amount: parseMoney(p.price1Month) },
    { months: 3, amount: parseMoney(p.price3Month) },
    { months: 6, amount: parseMoney(p.price6Month) },
  ].filter((t) => t.amount > 0);
  if (terms.length === 0) return null;
  return terms.reduce((lo, t) => (t.amount < lo.amount ? t : lo));
}

function normalizeProduct(raw: RawProduct): CatalogProduct {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image ?? "",
    intakeUrl: raw.intakeUrl, // passthrough — hosts vary (medical./meds.)
    availability: raw.details ?? "",
    fromPrice: pickFromPrice(raw),
  };
}

export async function fetchCatalog(
  category: string,
  partnerId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogResult> {
  const url = `${CATALOG_BASE}/${category}?partner_id=${encodeURIComponent(partnerId)}`;
  const res = await fetchImpl(url, { cache: "no-store" });
  if (!res.ok) return { ok: false, status: res.status };
  const data = (await res.json()) as { products?: RawProduct[] };
  const raw = Array.isArray(data.products) ? data.products : [];
  return { ok: true, products: raw.map(normalizeProduct) };
}
