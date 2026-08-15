import { describe, it, expect } from "vitest";
import { fetchCatalog, parseMoney, pickFromPrice } from "@/lib/telehealth/catalog";

const CIALIS = {
  id: "c6016e64", name: "Cialis", image: "https://x/img.png",
  intakeUrl: "https://medical.leguprecovery.com/start-online-visit/ed?partner_id=RFMLPVN1",
  price1Month: "$549.00", price3Month: "$0.00", price6Month: "$0.00",
  details: "Not available in South Carolina",
};
const ENCLO = {
  id: "694759f6", name: "Enclomiphene", image: "https://x/e.png",
  intakeUrl: "https://meds.leguprecovery.com/start/Enclomiphene?partner_id=RFMLPVN1",
  price1Month: "$224.00", price3Month: "$189.00", price6Month: "$0.00",
  details: "Available Nationwide",
};

function fakeFetch(body: unknown, status = 200): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("parseMoney", () => {
  it("parses a dollar string to a number", () => { expect(parseMoney("$549.00")).toBe(549); });
  it("treats $0.00 as zero", () => { expect(parseMoney("$0.00")).toBe(0); });
});

describe("pickFromPrice", () => {
  it("returns the cheapest purchasable term, ignoring $0.00 terms", () => {
    expect(pickFromPrice(ENCLO)).toEqual({ months: 3, amount: 189 });
  });
  it("returns null when no term is purchasable", () => {
    expect(pickFromPrice({ price1Month: "$0.00", price3Month: "$0.00", price6Month: "$0.00" })).toBeNull();
  });
});

describe("fetchCatalog", () => {
  it("normalizes products and passes intakeUrl through unchanged (multi-domain)", async () => {
    const res = await fetchCatalog("all-products", "RFMLPVN1", fakeFetch({ products: [CIALIS, ENCLO], count: 2 }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.products[0].intakeUrl).toBe(CIALIS.intakeUrl);
    expect(res.products[1].intakeUrl).toContain("meds.leguprecovery.com");
    expect(res.products[0].fromPrice).toEqual({ months: 1, amount: 549 });
  });

  it("treats a 200 empty response as ok with zero products (NOT an error)", async () => {
    const res = await fetchCatalog("wellness", "RFMLPVN1", fakeFetch({ products: [], count: 0 }));
    expect(res).toEqual({ ok: true, products: [] });
  });

  it("returns ok:false with the status on an HTTP error", async () => {
    const res = await fetchCatalog("wellness", "RFMLPVN1", fakeFetch({}, 500));
    expect(res).toEqual({ ok: false, status: 500 });
  });
});
