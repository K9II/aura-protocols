import { describe, it, expect } from "vitest";
import { getCommerceAdapter, CHECKOUT_UNAVAILABLE_MESSAGE } from "@/lib/commerce";

describe("commerce adapter", () => {
  it("reports checkout as unavailable until a processor is wired in", async () => {
    const result = await getCommerceAdapter().createCheckout([
      { slug: "bpc-157", variantId: "5mg", packQty: 1, quantity: 1 },
    ]);
    expect(result).toEqual({ kind: "unavailable", message: CHECKOUT_UNAVAILABLE_MESSAGE });
  });
});
