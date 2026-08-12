import { describe, it, expect } from "vitest";
import { biometricSnapshotToRow } from "@/lib/terra/snapshot-row";

describe("biometricSnapshotToRow", () => {
  it("maps camelCase snapshot fields to snake_case db columns", () => {
    const row = biometricSnapshotToRow("u1", {
      source: "DEV_SIM",
      capturedAt: "2026-08-01T00:00:00Z",
      metricDate: "2026-08-01",
      hrvMs: 42,
      recoveryScore: 55,
      glucoseAvgMgdl: 96,
      weightKg: 80,
    });
    expect(row.user_id).toBe("u1");
    expect(row.source).toBe("DEV_SIM");
    expect(row.hrv_ms).toBe(42);
    expect(row.recovery_score).toBe(55);
    expect(row.glucose_avg_mgdl).toBe(96);
    expect(row.metric_date).toBe("2026-08-01");
    expect(row.weight_kg).toBe(80);
  });

  it("defaults metric_date from capturedAt and nulls missing metrics", () => {
    const row = biometricSnapshotToRow("u1", { source: "MANUAL", capturedAt: "2026-08-02T12:00:00Z" });
    expect(row.metric_date).toBe("2026-08-02");
    expect(row.hrv_ms).toBeNull();
    expect(row.protein_g).toBeNull();
  });
});
