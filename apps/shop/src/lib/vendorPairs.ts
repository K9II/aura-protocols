import { products } from "@/data/products";
import { comparisons } from "@/data/comparisons";
import { vendorId } from "@/lib/affiliate";

export type VendorPair = {
  vendorA: string;
  vendorB: string;
  slug: string;
  sharedProducts: { slug: string; name: string }[];
};

function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

const curatedKeys = new Set(comparisons.map((c) => pairKey(c.vendorA, c.vendorB)));

export function getVendorPairs(): VendorPair[] {
  const vendorNames = [...new Set(products.flatMap((p) => p.vendors.map((v) => v.vendor)))];
  const pairs: VendorPair[] = [];

  for (let i = 0; i < vendorNames.length; i++) {
    for (let j = i + 1; j < vendorNames.length; j++) {
      const [nameA, nameB] = [vendorNames[i], vendorNames[j]].sort((x, y) =>
        vendorId(x).localeCompare(vendorId(y))
      );

      if (curatedKeys.has(pairKey(nameA, nameB))) continue;

      const sharedProducts = products
        .filter((p) => {
          const names = new Set(p.vendors.map((v) => v.vendor));
          return names.has(nameA) && names.has(nameB);
        })
        .map((p) => ({ slug: p.slug, name: p.name }));

      if (sharedProducts.length === 0) continue;

      pairs.push({
        vendorA: nameA,
        vendorB: nameB,
        slug: `${vendorId(nameA)}-vs-${vendorId(nameB)}`,
        sharedProducts,
      });
    }
  }

  return pairs;
}
