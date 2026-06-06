import { describe, it, expect } from "vitest";
import { toRow, coalesceRow } from "@/lib/terra/merge";
import { normalizeTerraPayload } from "@/lib/terra/normalize";
import bodyFixture from "../../fixtures/terra/body.json";
import sleepFixture from "../../fixtures/terra/sleep.json";

const USER = "11111111-1111-1111-1111-111111111111";

describe("coalesceRow", () => {
  it("merges a same-day Body row then Sleep row into one row with both", () => {
    const bodyRow = toRow(USER, normalizeTerraPayload("body", bodyFixture, "WITHINGS"));
    const sleepRow = toRow(USER, normalizeTerraPayload("sleep", sleepFixture, "OURA"));
    expect(bodyRow.metric_date).toBe("2026-06-06");
    expect(sleepRow.metric_date).toBe("2026-06-06");

    const merged = coalesceRow(bodyRow, sleepRow);
    expect(merged.weight_kg).toBe(81.4);        // from body
    expect(merged.sleep_hours).toBeCloseTo(7.5, 1); // from sleep
    expect(merged.user_id).toBe(USER);
    expect(merged.metric_date).toBe("2026-06-06");
  });

  it("does not null out an existing column when incoming is null", () => {
    const bodyRow = toRow(USER, normalizeTerraPayload("body", bodyFixture, "WITHINGS"));
    const sleepRow = toRow(USER, normalizeTerraPayload("sleep", sleepFixture, "OURA"));
    const merged = coalesceRow(bodyRow, sleepRow);
    expect(merged.weight_kg).toBe(81.4); // sleep row has weight_kg = null; must not erase
  });

  it("treats a null existing row as the incoming row", () => {
    const sleepRow = toRow(USER, normalizeTerraPayload("sleep", sleepFixture, "OURA"));
    const merged = coalesceRow(null, sleepRow);
    expect(merged.sleep_hours).toBeCloseTo(7.5, 1);
  });
});
