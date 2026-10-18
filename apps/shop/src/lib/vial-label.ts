// The product page's turning vial wears the store's vial label with the back of the real
// label added: the UPC turned to run up the vial, then the QR code to the lot's certificate.
// Layout follows the label design proof (option 2, 2026-10-17: a 1.85 in label, so a strip
// of bare glass at the back shows the powder). Units: 80 = 1 in of label.
// Pure data; no imports, safe on server and client.

export const LABEL = {
  width: 148,      // 1.85 in
  height: 80,      // 1 in
  frontEnd: 70,    // the class-colour rules run over the front panel…
  rightStart: 106, // …and over the QR panel, never across the barcode
  upcX: 74,        // left edge of the bars
  upcDigitsX: 101.6,
  qrX: 110.5,      // QR panel: code, then LOT and SCAN FOR CERTIFICATE under it
  qrY: 7.5,
  qrSize: 32,      // 0.40 in
} as const;

// PLACEHOLDER: the label proof's example UPC-A (0 85001 23456 2), drawn exactly as the proof
// does. Each strength gets its own GS1 UPC before launch; the release check fails until then.
export const UPC_IS_PLACEHOLDER = true;
// Bars, top to bottom: [y, height, guard]. Guard bars run 2.4 units longer, as on the proof.
export const EXAMPLE_UPC_BARS: ReadonlyArray<readonly [number, number, 0 | 1]> = [
  [9, 0.653, 1], [10.305, 0.653, 1], [12.916, 1.305, 1], [14.874, 0.653, 1], [16.179, 1.305, 0], [18.137, 1.958, 0],
  [20.747, 1.305, 0], [24.011, 0.653, 0], [26.621, 1.305, 0], [28.579, 0.653, 0], [31.189, 1.305, 0], [33.147, 0.653, 0],
  [35.105, 1.305, 0], [37.716, 0.653, 0], [39.021, 0.653, 1], [40.326, 0.653, 1], [41.632, 1.305, 0], [43.589, 1.305, 0],
  [46.2, 0.653, 0], [49.463, 0.653, 0], [50.768, 0.653, 0], [52.074, 1.958, 0], [55.337, 0.653, 0], [57.295, 1.958, 0],
  [59.905, 0.653, 0], [61.211, 0.653, 0], [64.474, 1.305, 1], [66.432, 1.305, 1], [69.042, 0.653, 1], [70.347, 0.653, 1],
];
// The human-readable digits beside the bars: [text, y of its centre].
export const EXAMPLE_UPC_DIGITS: ReadonlyArray<readonly [string, number]> = [["0", 5.8], ["85001", 26.95], ["23456", 55.01], ["2", 74.2]];
