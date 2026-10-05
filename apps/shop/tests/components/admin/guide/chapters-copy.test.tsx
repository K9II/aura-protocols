import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { findViolations } from "../../../../scripts/compliance-scan.mjs";
import { SECTIONS } from "@/components/admin/guide/chapters";
import StartHere from "@/components/admin/guide/StartHere";
import Discounts from "@/components/admin/guide/Discounts";
import Orders from "@/components/admin/guide/Orders";
import Customers from "@/components/admin/guide/Customers";
import Catalog from "@/components/admin/guide/Catalog";
import Partners from "@/components/admin/guide/Partners";
import Payouts from "@/components/admin/guide/Payouts";

const all = (capPct = 35) => render(<><StartHere /><Discounts capPct={capPct} /><Orders /><Customers /><Catalog /><Partners /><Payouts /></>);

describe("Guide chapters", () => {
  it("each chapter has its heading and all three sections, with anchors", () => {
    const { container } = all();
    for (const id of ["start", "discounts", "orders", "customers", "catalog", "partners", "payouts"]) {
      expect(container.querySelector(`section#${id}`)).not.toBeNull();
      for (const s of SECTIONS) expect(container.querySelector(`#${id}-${s.key} > h3`)?.textContent).toBe(s.title);
    }
  });

  it("passes the compliance scan's banned-word rules", () => {
    const { container } = all();
    expect(findViolations(container.textContent ?? "")).toEqual([]);
  });

  it("states the live store-wide maximum, not a hard-coded one", () => {
    all(40);
    expect(screen.getAllByText(/40%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/35%/)).toBeNull();
  });

  it("explains a trimmed example when the maximum is below the code", () => {
    const { container } = all(20);
    expect(container.textContent).toMatch(/over the 20% maximum, so checkout trims it and shows "capped at 20%"/);
  });

  it("never quotes a partner commission rate", () => {
    const { container } = all();
    expect(container.textContent).not.toMatch(/commission[^.]*\d+%/i);
  });
});
