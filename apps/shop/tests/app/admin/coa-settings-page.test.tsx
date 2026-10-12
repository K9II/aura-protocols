import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ownerStaff } from "../../helpers/staff";

vi.mock("@/lib/dal", () => ({ requirePermission: async () => ownerStaff() }));

const LABS = [
  { id: "lab1", name: "Vanguard Laboratory", city: "Olympia, WA", verify_url_template: "https://verifiedbyvanguard.com/verify/{report}", verify_hint: "The certificate ID from the QR code.", iso17025: true, active: true, certificates: 3 },
  { id: "lab2", name: "Freedom Diagnostics", city: "Franklin, TN", verify_url_template: "https://coas.freedomdiagnosticstesting.com/{report}.pdf", verify_hint: null, iso17025: false, active: true, certificates: 4 },
  { id: "lab3", name: "Not recorded", city: null, verify_url_template: null, verify_hint: null, iso17025: false, active: false, certificates: 2 },
];
const cert = (x: Partial<{ result: "pass" | "fail"; lot_id: string }> = {}) => ({
  id: "c1", lot_id: "lot1", lab_id: "lab1", report_number: "R1", verify_code: null, tested_on: "2026-10-01", coa_path: "a.pdf",
  purity_pct: 99.4, method: "HPLC+MS", measured_mg: null, identity: "pass", endotoxin: "pass", sterility: "not_tested",
  heavy_metals: "not_tested", fentanyl: "not_tested", result: "pass", note: null, correction_note: null, corrected_at: null, created_at: "2026-10-01T00:00:00Z",
  lab: { name: "Vanguard Laboratory", city: "Olympia, WA", iso17025: true, verify_url_template: null },
  ...x,
});
vi.mock("@/lib/coa/data", () => ({
  coaSettings: async () => ({ showAll: false, showMeasured: false }),
  listLabs: async () => LABS,
  allPublicCertRows: async () => [cert(), cert({ lot_id: "lot1", result: "fail" })],
}));

import CoaSettingsPage from "@/app/admin/catalog/settings/page";

describe("/admin/catalog/settings", () => {
  it("renders the heading", async () => {
    render(await CoaSettingsPage());
    expect(screen.getByRole("heading", { name: "COA settings" })).toBeInTheDocument();
  });

  it("two switches, both off", async () => {
    render(await CoaSettingsPage());
    const showAll = screen.getByRole("switch", { name: "Show every certificate" });
    const showMeasured = screen.getByRole("switch", { name: "Show measured amount" });
    expect(showAll).toHaveAttribute("aria-checked", "false");
    expect(showMeasured).toHaveAttribute("aria-checked", "false");
  });

  it("lab rows show Yes/No ISO chips and certificate counts", async () => {
    render(await CoaSettingsPage());
    expect(screen.getByText("Vanguard Laboratory")).toBeInTheDocument();
    const vanguardRow = screen.getByText("Vanguard Laboratory").closest("tr")!;
    expect(vanguardRow).toHaveTextContent("Yes");
    expect(vanguardRow).toHaveTextContent("3");
    const freedomRow = screen.getByText("Freedom Diagnostics").closest("tr")!;
    expect(freedomRow).toHaveTextContent("No");
    expect(freedomRow).toHaveTextContent("4");
  });

  it("the inactive lab row shows it's inactive", async () => {
    render(await CoaSettingsPage());
    const row = screen.getByText("Not recorded").closest("tr")!;
    expect(row).toHaveTextContent(/inactive/i);
  });

  it("'Not recorded' is a placeholder — no verify link, no Edit, and never an Activate button", async () => {
    render(await CoaSettingsPage());
    const row = screen.getByText("Not recorded").closest("tr")!;
    expect(row).toHaveTextContent("—");
    expect(within(row).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Activate" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("the callout never claims a certificate or result itself is accredited", async () => {
    render(await CoaSettingsPage());
    expect(screen.getByText(/never that a certificate or result is accredited/)).toBeInTheDocument();
  });
});
