import { describe, it, expect } from "vitest";
import { groupProducts } from "@/lib/telehealth/groups";
import type { CatalogProduct } from "@/lib/telehealth/types";

function product(name: string, amount: number | null): CatalogProduct {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    imageUrl: "",
    intakeUrl: "https://medical.leguprecovery.com/start-online-visit/x?partner_id=RFMLPVN1",
    availability: "Available Nationwide",
    fromPrice: amount == null ? null : { months: 1, amount },
  };
}

describe("groupProducts", () => {
  it("splits into Compounded and Brand-name groups when a brand-name product is present", () => {
    const products = [
      product("Sublingual Semaglutide", 174),
      product("Ozempic", 1649),
      product("Injectable Lipo-C", 224),
      product("Wegovy", 2599),
    ];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(2);
    expect(groups[0].heading).toBe("Compounded");
    expect(groups[0].products.map((p) => p.name)).toEqual(["Sublingual Semaglutide", "Injectable Lipo-C"]);
    expect(groups[1].heading).toBe("Brand-name");
    expect(groups[1].products.map((p) => p.name)).toEqual(["Ozempic", "Wegovy"]);
  });

  it("returns a single ungrouped list when no brand-name product is present", () => {
    const products = [
      product("Female Estradiol Gel", 249),
      product("Female Estradiol Patch", 224),
      product("Female Estradiol Tablets", 124),
    ];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].heading).toBeNull();
    expect(groups[0].products.map((p) => p.name)).toEqual([
      "Female Estradiol Tablets",
      "Female Estradiol Patch",
      "Female Estradiol Gel",
    ]);
  });

  it("excludes products with no purchasable price", () => {
    const products = [product("Sublingual Semaglutide", 174), product("Discontinued Item", null)];
    const groups = groupProducts(products);
    expect(groups).toHaveLength(1);
    expect(groups[0].products.map((p) => p.name)).toEqual(["Sublingual Semaglutide"]);
  });

  it("sorts each group ascending by price", () => {
    const products = [product("Wegovy", 2599), product("Ozempic", 1649), product("Zepbound", 2299)];
    const groups = groupProducts(products);
    expect(groups[0].products.map((p) => p.name)).toEqual(["Ozempic", "Zepbound", "Wegovy"]);
  });
});
