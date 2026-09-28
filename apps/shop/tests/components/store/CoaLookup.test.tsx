import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoaLookup, { type LotRow } from "@/components/store/CoaLookup";

const rows: LotRow[] = [
  { lot: "AP-0001", name: "BPC-157", slug: "bpc-157", purityPct: 99.6, method: "HPLC", testedOn: "2026-09-01", coaFile: "/coa/AP-0001.pdf" },
  { lot: "AP-0002", name: "TB-500", slug: "tb-500", purityPct: 99.2, method: "HPLC+MS", testedOn: "2026-09-03", coaFile: "" },
];

describe("CoaLookup", () => {
  it("finds a lot case-insensitively and links its certificate", () => {
    render(<CoaLookup rows={rows} />);
    fireEvent.change(screen.getByLabelText(/lot number/i), { target: { value: "ap-0001" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByText("BPC-157")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open certificate/i })).toHaveAttribute("href", "/coa/AP-0001.pdf");
  });

  it("says when the certificate file is not uploaded yet", () => {
    render(<CoaLookup rows={rows} />);
    fireEvent.change(screen.getByLabelText(/lot number/i), { target: { value: "AP-0002" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByText(/certificate file is being uploaded/i)).toBeInTheDocument();
  });

  it("reports an unknown lot", () => {
    render(<CoaLookup rows={rows} />);
    fireEvent.change(screen.getByLabelText(/lot number/i), { target: { value: "XX-1" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByText(/no lot “XX-1”/i)).toBeInTheDocument();
  });

  it("marks the lot input required", () => {
    render(<CoaLookup rows={rows} />);
    expect(screen.getByLabelText(/lot number/i)).toBeRequired();
  });

  it("does not show a result when submitted blank", () => {
    render(<CoaLookup rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.queryByText(/no lot/i)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("announces the result region via role=status", () => {
    render(<CoaLookup rows={rows} />);
    fireEvent.change(screen.getByLabelText(/lot number/i), { target: { value: "AP-0001" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toContainElement(screen.getByText("BPC-157"));
  });
});
