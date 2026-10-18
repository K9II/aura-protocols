// The product page's turning vial wears the store's vial label with the back of the real
// label added: the UPC turned to run up the vial, then the QR code to the lot's certificate.
// The real label (option 2, 2026-10-17: 1.85 in on a 17 mm vial) covers about 88% of the way
// round, leaving a narrow strip of bare glass at the back. The store's drawn vial is wider than
// the real one, so the website label is laid out longer to cover the same 88%: the front panel
// fills the front, then the barcode, then the QR panel. Units: 80 = the label's height.
// Pure data; no imports, safe on server and client.

export const LABEL = {
  width: 190,      // 88% of the way round the drawn vial (radius 40.4 at 94 units tall)
  height: 80,
  frontEnd: 88,    // the class-colour rules run over the front panel…
  rightStart: 130, // …and over the QR panel, never across the barcode
  upcX: 96,        // left edge of the bars: just past the side, so the front stays clean
  upcDigitsX: 123.6,
  qrX: 140,        // QR panel: code, then LOT and SCAN FOR LOT'S CERTIFICATE OF ANALYSIS under it
  qrY: 7.5,
  qrSize: 32,
} as const;

// The label on the 3D vial: the store label's height (94 of the drawing's 200 units) on a
// cylinder of radius 40.4, so one label unit is 94/80 units round the vial.
export const VIAL_LABEL_HEIGHT = 94;
export const VIAL_LABEL_RADIUS = 40.4;
// How far the vial turns from its front (radians) until the QR code faces out: the turning
// vial eases into a pause there.
export const QR_FACING_TURN = ((LABEL.qrX + LABEL.qrSize / 2 - 40) * (VIAL_LABEL_HEIGHT / 80)) / VIAL_LABEL_RADIUS;

// The turning vial renders at up to 3× pixels: phones are 3×, and below their density the
// label's small type softens.
export const MAX_DPR = 3;

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
