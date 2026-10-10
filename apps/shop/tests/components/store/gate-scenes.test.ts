import { describe, it, expect } from "vitest";
import { DESK_SCENES, PHONE_STRIP, PHONE_MINI } from "@/components/store/gate/scenes.generated";

describe("gate scenes (generated from the approved mock)", () => {
  it("has three desktop scenes and the two phone strips, each one whole <svg>", () => {
    expect(DESK_SCENES).toHaveLength(3);
    for (const s of [...DESK_SCENES, PHONE_STRIP, PHONE_MINI]) {
      expect(s.trimStart().startsWith("<svg class=\"scene")).toBe(true);
      expect(s.trimEnd().endsWith("</svg>")).toBe(true);
    }
    expect(DESK_SCENES[0]).toContain("BPC-157 10 mg vial");
  });
});
