import { describe, it, expect } from "vitest";
import { shipAddressSchema } from "@/lib/ship-address";

const ok = { name: "Jane Rivera", line1: "1200 Research Pkwy", line2: "", city: "Austin", state: "tx", zip: "78701" };

describe("shipAddressSchema", () => {
  it("accepts a US address, upper-cases the state and blanks line2 to null", () => {
    expect(shipAddressSchema.parse(ok)).toEqual({ ...ok, state: "TX", line2: null });
  });
  it("rejects unknown states, bad ZIPs and missing fields", () => {
    expect(shipAddressSchema.safeParse({ ...ok, state: "ZZ" }).success).toBe(false);
    expect(shipAddressSchema.safeParse({ ...ok, zip: "7870" }).success).toBe(false);
    expect(shipAddressSchema.safeParse({ ...ok, zip: "78701-1234" }).success).toBe(true);
    expect(shipAddressSchema.safeParse({ ...ok, city: "" }).success).toBe(false);
  });
});
