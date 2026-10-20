import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// The free-shipping threshold lives in lib/cart.ts. Pages must render the
// constant, never a hard-coded amount, so a threshold change can't drift.
const SRC = join(__dirname, "..", "..", "src");
// The product page's shipping line is the first stamp (TrustRow) in the buy panel, 2026-10-19.
// The FAQ (moved off the home page 2026-10-14) answers "How fast do you ship?".
const FILES = ["app/faq/page.tsx", "components/store/TrustRow.tsx"];

describe("free-shipping copy", () => {
  it.each(FILES)("%s has no hard-coded threshold and uses the constant", (rel) => {
    const source = readFileSync(join(SRC, rel), "utf8");
    expect(source).not.toMatch(/\$200\b/);
    expect(source).toContain("FREE_SHIPPING_THRESHOLD_USD");
  });
});
