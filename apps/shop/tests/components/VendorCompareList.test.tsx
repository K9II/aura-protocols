import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VendorCompareList from "@/components/VendorCompareList";

const twoVendors = [
  { vendor: "Ignite Peptides", url: "https://ignitepeptides.com/x", commission: "15%" },
  { vendor: "Mile High Compounds", url: "https://milehighcompounds.is/x", commission: "20%" },
];

const fiveVendors = [
  ...twoVendors,
  { vendor: "American Peptides", url: "https://www.americanpeptides.us/x", commission: "20%" },
  { vendor: "PSPeptides", url: "https://pspeptides.com/x", commission: "18%" },
  { vendor: "Peak Lab Peptides", url: "https://peaklabpeptides.com/x", commission: "15%" },
];

describe("VendorCompareList", () => {
  it("renders no checkboxes or comparison UI", () => {
    render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(screen.queryAllByRole("checkbox").length).toBe(0);
    expect(screen.queryByText(/Comparing \d Vendors/)).toBeNull();
  });

  it("renders a Buy Direct link for every vendor", () => {
    render(<VendorCompareList vendors={twoVendors} productSlug="bpc-157" />);
    expect(screen.getByText(/Buy Direct from Ignite Peptides/)).toBeInTheDocument();
    expect(screen.getByText(/Buy Direct from Mile High Compounds/)).toBeInTheDocument();
  });

  it("never renders a dollar sign, the word commission, or affiliate/tracking language", () => {
    const { container } = render(<VendorCompareList vendors={fiveVendors} productSlug="bpc-157" />);
    expect(container.textContent).not.toMatch(/\$|commission/i);
    expect(container.textContent).not.toMatch(/affiliate|click tracking|deep-link/i);
  });
});
