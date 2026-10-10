import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { catalogEventLine } from "@/components/admin/catalog/eventLine";
import type { CatalogEvent } from "@/lib/catalog-ops/data";

const price = (note: string | null) => ({
  id: "e1", kind: "price_changed", lotNumber: null, actorName: "Alvester", created_at: "2026-10-09T18:00:00Z",
  before: { price_cents: 5900 }, after: { price_cents: 7900 }, reason: null, note, source: "manual",
  variant_id: "10mg", lot_id: null, actor_id: "owner",
}) as unknown as CatalogEvent;

const text = (e: CatalogEvent) => render(<p>{catalogEventLine(e, () => "10 mg")}</p>).container.textContent;

describe("catalogEventLine price_changed", () => {
  it("marks a price sent from AIOS", () => {
    expect(text(price("Sent from AIOS"))).toBe("Alvester changed 10 mg price $59.00 → $79.00 · from AIOS");
  });
  it("a Catalog edit has no mark", () => {
    expect(text(price(null))).toBe("Alvester changed 10 mg price $59.00 → $79.00");
  });
});
