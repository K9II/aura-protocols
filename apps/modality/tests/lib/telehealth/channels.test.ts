import { describe, it, expect } from "vitest";
import { subForUtm, channelLabel, DIRECT_SUB } from "@/lib/telehealth/channels";

describe("subForUtm", () => {
  it("maps known utm_source values, case-insensitive", () => {
    expect(subForUtm("instagram")).toBe(4);
    expect(subForUtm("IG")).toBe(4);
    expect(subForUtm(" Blog ")).toBe(3);
    expect(subForUtm("engine")).toBe(7);
  });
  it("defaults unknown/missing sources to Direct/Other (2)", () => {
    expect(subForUtm("pinterest")).toBe(DIRECT_SUB);
    expect(subForUtm(null)).toBe(2);
    expect(subForUtm("")).toBe(2);
  });
});

describe("channelLabel", () => {
  it("returns the channel label for a sub", () => {
    expect(channelLabel(4)).toBe("Instagram");
    expect(channelLabel(2)).toBe("Direct / Other");
  });
  it("falls back to 'sub N' for unknown subs", () => {
    expect(channelLabel(99)).toBe("sub 99");
  });
});
