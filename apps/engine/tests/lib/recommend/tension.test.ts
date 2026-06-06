import { describe, it, expect } from "vitest";
import { TensionSchema } from "@/lib/recommend/schema";

describe("TensionSchema", () => {
  it("accepts a valid tension", () => {
    const parsed = TensionSchema.safeParse({
      id: "overreaching",
      severity: "high",
      drivers: ["strain_high", "recovery_low"],
      implication: "Recovery capacity is lagging training load.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown id", () => {
    const parsed = TensionSchema.safeParse({
      id: "perimenopause",
      severity: "watch",
      drivers: [],
      implication: "x",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown severity", () => {
    const parsed = TensionSchema.safeParse({
      id: "overreaching",
      severity: "critical",
      drivers: [],
      implication: "x",
    });
    expect(parsed.success).toBe(false);
  });
});

import { detectTensions } from "@/lib/recommend/tension";
import type { BiometricSnapshot } from "@/lib/terra/schema";
import type { BiometricTrends, TrendMetric } from "@/lib/recommend/schema";
import type { ProfileContext } from "@/lib/profile/schema";

const FLAT: TrendMetric = { current: null, mean7d: null, delta7d: null, direction: "flat" };

function trends(overrides: Partial<BiometricTrends> = {}): BiometricTrends {
  return { hrv: { ...FLAT }, rhr: { ...FLAT }, sleep: { ...FLAT }, recovery: { ...FLAT }, ...overrides };
}

function snap(overrides: Partial<BiometricSnapshot> = {}): BiometricSnapshot {
  return { source: "MANUAL", capturedAt: "2026-06-06T07:00:00Z", ...overrides } as BiometricSnapshot;
}

function profile(overrides: Partial<ProfileContext> = {}): ProfileContext {
  return overrides as ProfileContext;
}

describe("detectTensions — overreaching", () => {
  it("does not fire on clean data", () => {
    expect(detectTensions([snap()], trends(), profile())).toEqual([]);
  });

  it("fires at 'watch' on a single soft signal", () => {
    const t = detectTensions([snap()], trends({ recovery: { ...FLAT, current: 40 } }), profile());
    expect(t).toHaveLength(1);
    expect(t[0].id).toBe("overreaching");
    expect(t[0].severity).toBe("watch");
    expect(t[0].drivers).toContain("recovery_low");
  });

  it("fires at 'elevated' on two drivers", () => {
    const t = detectTensions(
      [snap({ strain: 16 })],
      trends({ recovery: { ...FLAT, current: 40 } }),
      profile(),
    );
    expect(t[0].severity).toBe("elevated");
  });

  it("fires at 'high' on three+ drivers", () => {
    const t = detectTensions(
      [snap({ strain: 16, sleepHrvRmssdMs: 25 })],
      trends({ recovery: { ...FLAT, current: 40 }, hrv: { ...FLAT, direction: "down" }, rhr: { ...FLAT, direction: "up" } }),
      profile(),
    );
    expect(t[0].severity).toBe("high");
  });
});

describe("detectTensions — hormonal_shift", () => {
  it("does NOT fire without the menopause gate, even with biometric signals", () => {
    const t = detectTensions(
      [snap({ fshMiuMl: 40, skinTempDeltaC: 0.6 })],
      trends({ sleep: { ...FLAT, direction: "down" } }),
      profile({ menopause_status: "pre" }),
    );
    expect(t.find((x) => x.id === "hormonal_shift")).toBeUndefined();
  });

  it("fires at 'watch' on the gate alone (neutral biometrics)", () => {
    const t = detectTensions([snap()], trends(), profile({ menopause_status: "peri" }));
    const h = t.find((x) => x.id === "hormonal_shift");
    expect(h?.severity).toBe("watch");
    expect(h?.drivers).toEqual(["endocrine_transition_reported"]);
  });

  it("escalates to 'high' on gate + three biometric drivers", () => {
    const t = detectTensions(
      [snap({ fshMiuMl: 40, e3gNgMl: 2, skinTempDeltaC: 0.6 })],
      trends({ sleep: { ...FLAT, direction: "down" } }),
      profile({ menopause_status: "post" }),
    );
    const h = t.find((x) => x.id === "hormonal_shift");
    expect(h?.severity).toBe("high");
  });
});

describe("detectTensions — metabolic_rebound", () => {
  it("does NOT fire without the recently_stopped gate", () => {
    const t = detectTensions(
      [snap({ proteinG: 40 })],
      trends({ weight: { ...FLAT, direction: "up" } }),
      profile({ glp1_status: "never" }),
    );
    expect(t.find((x) => x.id === "metabolic_rebound")).toBeUndefined();
  });

  it("fires at 'watch' on the gate alone", () => {
    const t = detectTensions([snap()], trends(), profile({ glp1_status: "recently_stopped" }));
    const m = t.find((x) => x.id === "metabolic_rebound");
    expect(m?.severity).toBe("watch");
    expect(m?.drivers).toEqual(["post_intervention_window"]);
  });

  it("escalates to 'high' on gate + three biometric drivers", () => {
    const t = detectTensions(
      [snap({ proteinG: 40, strain: 3 })],
      trends({ weight: { ...FLAT, direction: "up" } }),
      profile({ glp1_status: "recently_stopped" }),
    );
    const m = t.find((x) => x.id === "metabolic_rebound");
    expect(m?.severity).toBe("high");
  });
});
