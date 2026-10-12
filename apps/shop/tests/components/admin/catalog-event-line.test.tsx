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

const certEvent = (kind: string, extra: Partial<CatalogEvent> = {}) => ({
  id: "e2", kind, lotNumber: "AP-1105", actorName: "Alvester", created_at: "2026-10-09T18:00:00Z",
  before: null, after: null, reason: null, note: null, source: "manual",
  variant_id: "10mg", lot_id: "lot1", actor_id: "owner", ...extra,
}) as unknown as CatalogEvent;

describe("catalogEventLine certificate events", () => {
  it("certificate_added names the report and shows Pass", () => {
    expect(text(certEvent("certificate_added", { after: { lab: "v", report: "VGD-24109", result: "pass" } })))
      .toBe("Alvester added certificate VGD-24109 to AP-1105 · Pass");
  });
  it("certificate_added shows Failed", () => {
    expect(text(certEvent("certificate_added", { after: { lab: "v", report: "VGD-24110", result: "fail" } })))
      .toBe("Alvester added certificate VGD-24110 to AP-1105 · Failed");
  });
  it("certificate_edited names the report", () => {
    expect(text(certEvent("certificate_edited", { after: { report: "VGD-24109" } })))
      .toBe("Alvester edited certificate VGD-24109 on AP-1105");
  });
  it("certificate_deleted names the report", () => {
    expect(text(certEvent("certificate_deleted", { before: { report: "VGD-24109" } })))
      .toBe("Alvester deleted certificate VGD-24109 from AP-1105");
  });
  it("certificate_corrected shows the correction note", () => {
    expect(text(certEvent("certificate_corrected", { before: { correction: null }, after: { correction: "Report number was mistyped." } })))
      .toBe('Alvester added a correction to certificate on AP-1105 : "Report number was mistyped."');
  });
});
