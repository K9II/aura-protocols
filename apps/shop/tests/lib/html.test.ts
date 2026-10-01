import { describe, it, expect } from "vitest";
import { usd } from "@/lib/html";

describe("usd", () => {
  it("formats cents with two decimals", () => {
    expect(usd(0)).toBe("$0.00");
    expect(usd(4410)).toBe("$44.10");
  });

  it("groups thousands", () => {
    expect(usd(1500000)).toBe("$15,000.00");
    expect(usd(1482360)).toBe("$14,823.60");
  });

  it("keeps the sign after the dollar sign", () => {
    expect(usd(-1764)).toBe("$-17.64");
  });
});
