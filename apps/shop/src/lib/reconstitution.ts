export type SyringeSize = 30 | 50 | 100;

export type ReconstitutionInput = {
  vialMg: number | null;
  waterMl: number | null;
  doseMg: number | null;
  syringeMax: SyringeSize;
};

export type ReconstitutionResult =
  | { valid: false }
  | {
      valid: true;
      concentration: number; // mg/ml
      totalUnits: number; // full-dose units before any split
      injections: number; // 1 or more
      unitsPerInjection: number; // what's actually drawn on each injection
      dosesPerVial: number;
    };

// U-100 insulin-syringe scale: 100 units = 1ml, the same on 30u/50u/100u barrels.
const UNITS_PER_ML = 100;

// Absorbs ~1e-13-scale float noise; 6+ orders of magnitude below any real
// dosing precision.
const EPSILON_UNITS = 1e-6;

// Real inputs are specified to 1-2 decimals in the UI, so rounding to 6
// decimal places eliminates IEEE-754 float drift (e.g. 9.3 * 100 ===
// 930.0000000000001) without losing any meaningful precision. Only applied
// to values being returned -- never to a value that feeds back into further
// arithmetic, since rounding a non-terminating ratio (e.g. 1/3) early is
// itself lossy and can reintroduce the same class of drift.
function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function calculateReconstitution({
  vialMg,
  waterMl,
  doseMg,
  syringeMax,
}: ReconstitutionInput): ReconstitutionResult {
  const isPositive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;

  if (!isPositive(vialMg) || !isPositive(waterMl) || !isPositive(doseMg)) {
    return { valid: false };
  }

  const concentration = vialMg / waterMl;
  const doseVolumeMl = doseMg / concentration;
  const totalUnits = doseVolumeMl * UNITS_PER_ML;
  const dosesPerVial = vialMg / doseMg;

  // Epsilon-tolerant boundary check: totalUnits can drift by float noise
  // around an exact multiple of syringeMax (e.g. 9.3*100 !== 930 exactly,
  // or a repeating-decimal concentration like 1/3 propagating drift). The
  // epsilon absorbs that noise without needing to round concentration or
  // totalUnits before using them in further arithmetic (rounding those
  // earlier is itself lossy for non-terminating ratios and can reintroduce
  // the same class of bug from a different direction).
  const injections =
    totalUnits > syringeMax + EPSILON_UNITS
      ? Math.ceil((totalUnits - EPSILON_UNITS) / syringeMax)
      : 1;
  const unitsPerInjection = totalUnits / injections;

  return {
    valid: true,
    concentration: round6(concentration),
    totalUnits: round6(totalUnits),
    injections,
    unitsPerInjection: round6(unitsPerInjection),
    dosesPerVial: round6(dosesPerVial),
  };
}
