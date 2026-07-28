import { describe, it, expect } from "vitest";
import { calculateReconstitution } from "@/lib/reconstitution";

describe("calculateReconstitution", () => {
  it("computes concentration, units, and doses per vial for a normal single-injection dose", () => {
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 0.5, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.concentration).toBeCloseTo(2.5, 5);
    expect(result.totalUnits).toBeCloseTo(20, 5);
    expect(result.injections).toBe(1);
    expect(result.unitsPerInjection).toBeCloseTo(20, 5);
    expect(result.dosesPerVial).toBeCloseTo(10, 5);
  });

  it("does not split when units land exactly on the syringe's capacity", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 1.25mg dose needs exactly 0.5ml = 50 units.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 1.25, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(50, 5);
    expect(result.injections).toBe(1);
    expect(result.unitsPerInjection).toBeCloseTo(50, 5);
  });

  it("splits into 2 even injections when a dose needs just over one syringe's capacity", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 2.4mg dose needs 0.96ml = 96 units -> ceil(96/50)=2 -> 48 each.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 2.4, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(96, 5);
    expect(result.injections).toBe(2);
    expect(result.unitsPerInjection).toBeCloseTo(48, 5);
  });

  it("splits into more injections for a large multi-split dose", () => {
    // 5mg / 2ml = 2.5 mg/ml; a 4.5mg dose needs 1.8ml = 180 units -> ceil(180/50)=4 -> 45 each.
    const result = calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 4.5, syringeMax: 50 });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.totalUnits).toBeCloseTo(180, 5);
    expect(result.injections).toBe(4);
    expect(result.unitsPerInjection).toBeCloseTo(45, 5);
  });

  it("returns invalid when any required field is null", () => {
    expect(calculateReconstitution({ vialMg: null, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: null, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: null, syringeMax: 50 })).toEqual({ valid: false });
  });

  it("returns invalid when waterMl is zero, instead of dividing by zero", () => {
    expect(calculateReconstitution({ vialMg: 5, waterMl: 0, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
  });

  it("returns invalid for non-finite or non-positive values", () => {
    expect(calculateReconstitution({ vialMg: NaN, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: -5, waterMl: 2, doseMg: 0.5, syringeMax: 50 })).toEqual({ valid: false });
    expect(calculateReconstitution({ vialMg: 5, waterMl: 2, doseMg: 0, syringeMax: 50 })).toEqual({ valid: false });
  });
});
