// Seeded LCG for the holiday SVG generators: the same seed always draws the
// same picture, so server output is stable. Pure.
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
