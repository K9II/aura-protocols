import { describe, it, expect } from "vitest";
import {
  routeByVendor,
  type RailItem,
  type VendorGroup,
} from "@/lib/recommend/vendor-router";
import type { Product, ProductVendor } from "@/data/products";

type TbdGroup = Extract<VendorGroup, { kind: "tbd" }>;
const isTbd = (g: VendorGroup): g is TbdGroup => g.kind === "tbd";

function product(
  id: string,
  vendors: ProductVendor[],
  category = "Recovery",
): Product {
  return {
    id,
    name: id.toUpperCase(),
    slug: id,
    category,
    description: "",
    benefits: [],
    vendors,
    featured: false,
  };
}

function item(slug: string, category = "Recovery"): RailItem {
  return { slug, name: slug.toUpperCase(), category };
}

describe("routeByVendor", () => {
  it("1 vendor covers all 4 items → 1 live group, 4 items", () => {
    const items: RailItem[] = [item("p1"), item("p2"), item("p3"), item("p4")];
    const catalog: Product[] = [
      product("p1", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p2", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p3", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p4", [{ vendor: "A", url: "https://a", commission: "10%" }]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe("live");
    expect(groups[0].vendor).toBe("A");
    expect(groups[0].items).toHaveLength(4);
  });

  it("4 items split 2/2 across 2 vendors → 2 live groups", () => {
    const items: RailItem[] = [item("p1"), item("p2"), item("p3"), item("p4")];
    const catalog: Product[] = [
      product("p1", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p2", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p3", [{ vendor: "B", url: "https://b", commission: "10%" }]),
      product("p4", [{ vendor: "B", url: "https://b", commission: "10%" }]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.kind === "live")).toBe(true);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(2);
  });

  it("4 items with no vendor overlap → 4 single-item live groups", () => {
    const items: RailItem[] = [item("p1"), item("p2"), item("p3"), item("p4")];
    const catalog: Product[] = [
      product("p1", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p2", [{ vendor: "B", url: "https://b", commission: "10%" }]),
      product("p3", [{ vendor: "C", url: "https://c", commission: "10%" }]),
      product("p4", [{ vendor: "D", url: "https://d", commission: "10%" }]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(4);
    expect(groups.every((g) => g.items.length === 1)).toBe(true);
  });

  it("items with no catalog entry → TBD groups one per category", () => {
    const items: RailItem[] = [
      item("p1", "Recovery"),
      item("unknown-vitamin", "Vitamins"),
      item("unknown-protein", "Protein"),
    ];
    const catalog: Product[] = [
      product("p1", [{ vendor: "A", url: "https://a", commission: "10%" }]),
    ];
    const groups = routeByVendor(items, catalog);
    const live = groups.filter((g) => g.kind === "live");
    const tbd = groups.filter(isTbd);
    expect(live).toHaveLength(1);
    expect(live[0].vendor).toBe("A");
    expect(tbd).toHaveLength(2);
    expect(tbd.map((g) => g.category).sort()).toEqual(["Protein", "Vitamins"]);
  });

  it("catalog product with empty vendors[] → item lands in TBD", () => {
    const items: RailItem[] = [item("p1", "Wellness")];
    const catalog: Product[] = [product("p1", [], "Wellness")];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(1);
    const only = groups[0];
    if (!isTbd(only)) throw new Error("expected TBD group");
    expect(only.category).toBe("Wellness");
  });

  it("each item is assigned exactly once across all groups", () => {
    const items: RailItem[] = [item("p1"), item("p2"), item("p3")];
    const catalog: Product[] = [
      product("p1", [
        { vendor: "A", url: "https://a", commission: "10%" },
        { vendor: "B", url: "https://b", commission: "10%" },
      ]),
      product("p2", [{ vendor: "A", url: "https://a", commission: "10%" }]),
      product("p3", [{ vendor: "B", url: "https://b", commission: "10%" }]),
    ];
    const groups = routeByVendor(items, catalog);
    const assigned = groups.flatMap((g) => g.items.map((i) => i.slug)).sort();
    expect(assigned).toEqual(["p1", "p2", "p3"]);
  });

  it("commission tiebreaker fires only when coverage is equal", () => {
    const items: RailItem[] = [item("p1"), item("p2")];
    const catalog: Product[] = [
      product("p1", [
        { vendor: "Low", url: "https://low", commission: "5%" },
        { vendor: "High", url: "https://high", commission: "20%" },
      ]),
      product("p2", [
        { vendor: "Low", url: "https://low", commission: "5%" },
        { vendor: "High", url: "https://high", commission: "20%" },
      ]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(1);
    expect(groups[0].vendor).toBe("High");
  });

  it("coverage beats commission (router prioritizes registrations saved)", () => {
    const items: RailItem[] = [item("p1"), item("p2")];
    const catalog: Product[] = [
      product("p1", [
        { vendor: "Coverage", url: "https://c", commission: "5%" },
        { vendor: "HighFee", url: "https://h", commission: "50%" },
      ]),
      product("p2", [
        { vendor: "Coverage", url: "https://c", commission: "5%" },
      ]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(1);
    expect(groups[0].vendor).toBe("Coverage");
    expect(groups[0].items).toHaveLength(2);
  });

  it("'TBD' commission string parses as 0 for tiebreak", () => {
    const items: RailItem[] = [item("p1")];
    const catalog: Product[] = [
      product("p1", [
        { vendor: "TBDOnly", url: "https://tbd", commission: "TBD" },
        { vendor: "Paid", url: "https://paid", commission: "10%" },
      ]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(1);
    expect(groups[0].vendor).toBe("Paid");
  });

  it("live groups returned sorted by item count DESC, TBD groups last", () => {
    const items: RailItem[] = [
      item("p1"),
      item("p2"),
      item("p3"),
      item("unknown", "Vitamins"),
    ];
    const catalog: Product[] = [
      product("p1", [{ vendor: "Big", url: "https://big", commission: "10%" }]),
      product("p2", [{ vendor: "Big", url: "https://big", commission: "10%" }]),
      product("p3", [
        { vendor: "Small", url: "https://small", commission: "10%" },
      ]),
    ];
    const groups = routeByVendor(items, catalog);
    expect(groups).toHaveLength(3);
    expect(groups[0].vendor).toBe("Big");
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].vendor).toBe("Small");
    expect(groups[1].items).toHaveLength(1);
    expect(groups[2].kind).toBe("tbd");
  });

  it("empty item list → empty result", () => {
    expect(routeByVendor([], [])).toEqual([]);
  });
});
