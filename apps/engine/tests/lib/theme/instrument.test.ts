import { describe, it, expect } from "vitest";
import { SIG, SEVERITY_INK } from "@/lib/theme/instrument";

describe("instrument palette", () => {
  it("maps the five semantic meanings to muted paper-readable hex", () => {
    expect(SIG.bio).toBe("#2F6E6B");
    expect(SIG.llm).toBe("#6A4C74");
    expect(SIG.alert).toBe("#A32B1F");
    expect(SIG.ok).toBe("#5B7A47");
    expect(SIG.warn).toBe("#9C6B24");
  });
  it("exposes paper base + line tokens", () => {
    expect(SIG.paper).toBe("#EDE9E0");
    expect(SIG.paperDeep).toBe("#E2DCCC");
    expect(SIG.ink).toBe("#1C1A15");
    expect(SIG.line).toBe("#C9C2AE");
  });
  it("has no neon literals left in the palette values", () => {
    const banned = ["#00d4ff", "#8b5cf6", "#fb7185", "#34d399", "#fbbf24", "#04060f"];
    const all = JSON.stringify({ SIG, SEVERITY_INK }).toLowerCase();
    for (const b of banned) expect(all).not.toContain(b);
  });
  it("maps tension severity to ochre/terracotta/specimen", () => {
    expect(SEVERITY_INK.watch).toBe("#9C6B24");
    expect(SEVERITY_INK.elevated).toBe("#B4622E");
    expect(SEVERITY_INK.high).toBe("#A32B1F");
  });
});
