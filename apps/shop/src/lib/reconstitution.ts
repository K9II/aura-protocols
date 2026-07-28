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

  // Even split across the fewest injections that each fit the syringe,
  // rather than filling the syringe and dumping the remainder into an
  // uneven final shot.
  const injections = totalUnits > syringeMax ? Math.ceil(totalUnits / syringeMax) : 1;
  const unitsPerInjection = totalUnits / injections;

  return { valid: true, concentration, totalUnits, injections, unitsPerInjection, dosesPerVial };
}
