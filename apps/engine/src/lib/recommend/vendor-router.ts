import type { Product } from "@/data/products";

export interface RailItem {
  slug: string;
  name: string;
  dose?: string;
  category: string;
}

export interface VendorGroupLive {
  kind: "live";
  vendor: string;
  url: string;
  items: RailItem[];
}

export interface VendorGroupTbd {
  kind: "tbd";
  vendor: null;
  url: null;
  items: RailItem[];
  category: string;
}

export type VendorGroup = VendorGroupLive | VendorGroupTbd;

function parseCommission(raw: string): number {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

interface VendorCandidate {
  vendor: string;
  url: string;
  commission: number;
}

/**
 * Greedy set-cover that minimizes the number of vendor accounts a user
 * must register with to fulfill the stack. Coverage first; commission
 * is the tiebreaker only when coverage is equal.
 */
export function routeByVendor(
  items: RailItem[],
  catalog: Product[],
): VendorGroup[] {
  if (items.length === 0) return [];

  const catalogBySlug = new Map<string, Product>();
  for (const p of catalog) catalogBySlug.set(p.slug, p);

  const routable: RailItem[] = [];
  const tbdItems: RailItem[] = [];
  const itemCandidates = new Map<string, VendorCandidate[]>();

  for (const it of items) {
    const product = catalogBySlug.get(it.slug);
    if (product && product.vendors.length > 0) {
      routable.push(it);
      itemCandidates.set(
        it.slug,
        product.vendors.map((v) => ({
          vendor: v.vendor,
          url: v.url,
          commission: parseCommission(v.commission),
        })),
      );
    } else {
      tbdItems.push(it);
    }
  }

  const slugToItem = new Map(routable.map((i) => [i.slug, i]));
  const remaining = new Set(routable.map((i) => i.slug));
  const liveGroups: VendorGroupLive[] = [];

  while (remaining.size > 0) {
    const tally = new Map<
      string,
      { count: number; commission: number; url: string }
    >();
    for (const slug of remaining) {
      for (const c of itemCandidates.get(slug)!) {
        const cur = tally.get(c.vendor);
        if (cur) {
          cur.count += 1;
          if (c.commission > cur.commission) cur.commission = c.commission;
        } else {
          tally.set(c.vendor, {
            count: 1,
            commission: c.commission,
            url: c.url,
          });
        }
      }
    }

    if (tally.size === 0) break;

    let best: {
      vendor: string;
      count: number;
      commission: number;
      url: string;
    } | null = null;
    for (const [vendor, info] of tally) {
      if (
        best === null ||
        info.count > best.count ||
        (info.count === best.count && info.commission > best.commission)
      ) {
        best = { vendor, ...info };
      }
    }

    if (!best) break;

    const assignedSlugs: string[] = [];
    for (const slug of remaining) {
      if (itemCandidates.get(slug)!.some((c) => c.vendor === best.vendor)) {
        assignedSlugs.push(slug);
      }
    }

    liveGroups.push({
      kind: "live",
      vendor: best.vendor,
      url: best.url,
      items: assignedSlugs.map((s) => slugToItem.get(s)!),
    });

    for (const s of assignedSlugs) remaining.delete(s);
  }

  liveGroups.sort((a, b) => b.items.length - a.items.length);

  const tbdByCategory = new Map<string, RailItem[]>();
  for (const it of tbdItems) {
    const list = tbdByCategory.get(it.category) ?? [];
    list.push(it);
    tbdByCategory.set(it.category, list);
  }
  const tbdGroups: VendorGroupTbd[] = Array.from(tbdByCategory.entries()).map(
    ([category, list]) => ({
      kind: "tbd",
      vendor: null,
      url: null,
      items: list,
      category,
    }),
  );

  return [...liveGroups, ...tbdGroups];
}
