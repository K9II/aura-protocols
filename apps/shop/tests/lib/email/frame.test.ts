import { describe, it, expect } from "vitest";
import { PHOTO_VIALS, photoVial } from "@/lib/email/photo-vials";

describe("photo vials", () => {
  it("names each vial from the catalog, nickname alongside the scientific name", () => {
    expect(photoVial("wolverine")).toMatchObject({ name: "BPC-157 / TB-500", designation: "Wolverine", strength: "10 mg", chemicalClass: "Blends", slug: "bpc-157-tb-500-blend" });
    expect(photoVial("nad-plus")).toMatchObject({ name: "NAD+", designation: null, strength: "500 mg" });
    expect(Object.keys(PHOTO_VIALS)).toEqual(["bpc-157", "klow", "nad-plus", "wolverine", "ghk-cu", "glow"]);
  });
});
