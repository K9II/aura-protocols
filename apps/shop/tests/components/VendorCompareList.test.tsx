import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VendorCompareList from "@/components/VendorCompareList";

const twoVendors = [
  { vendor: "Limitless Life Nootropics", url: "https://limitlesslifenootropics.com/x", commission: "15%" },
  { vendor: "Swiss Chems", url: "https://swisschems.is/x", commission: "20%" },
];

const fiveVendors = [
  ...twoVendors,
  { vendor: "Apollo Peptide Sciences", url: "https://apollopeptidesciences.com/x", commission: "20%" },
  { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/x", commission: "15%" },
  { vendor: "Main Peptides", url: "https://mainpeptides.com/x", commission: "10%" },
];

describe("VendorCompareList", () => {
  it("renders no checkboxes or comparison UI", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();
  });

  it("renders a Buy Direct link for every vendor", () => {
    render(<VendorCompareList vendors={twoVendors} productSlug="bpc-157" />);
    expect(screen.getByText(/Buy Direct from Limitless Life Nootropics/)).toBeInTheDocument();
    expect(screen.getByText(/Buy Direct from Swiss Chems/)).toBeInTheDocument();
  });

  it("never renders a dollar sign, the word commission, or affiliate/tracking language", () => {
    const { container } = render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(container.textContent).not.toMatch(/\$|commission/i);
    expect(container.textContent).not.toMatch(/affiliate|click tracking|deep-link/i);
  });
});
