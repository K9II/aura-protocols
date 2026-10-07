import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveFixture } from "../helpers/live-catalog";
import { render, screen, within } from "@testing-library/react";
import ProductPage from "@/app/products/[slug]/page";
import { CartProvider } from "@/components/store/CartProvider";

const { live } = vi.hoisted(() => ({ live: vi.fn() }));
vi.mock("@/lib/catalog-live", () => ({ getLiveCatalogOrNull: live, getLiveCatalog: live }));
vi.mock("@/components/store/MoleculeViewer", () => ({
  default: ({ structure }: { structure: { label: string } }) => <div data-testid="mol">{structure.label}</div>,
}));

async function renderSlug(slug: string) {
  const ui = await ProductPage({ params: Promise.resolve({ slug }) });
  return render(<CartProvider catalog={liveFixture()}>{ui}</CartProvider>);
}

describe("product page", () => {
  beforeEach(() => { live.mockReset(); live.mockResolvedValue({ all: liveFixture(), shown: liveFixture(), lots: [] }); });

  it("fails closed when the live catalog can't be read: Unavailable, no price", async () => {
    live.mockResolvedValue(null);
    const { container } = await renderSlug("bpc-157");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unavailable right now");
    expect(container.textContent).not.toMatch(/\$\d/);
    expect(screen.queryByRole("button", { name: /add to cart/i })).toBeNull();
  });

  it("404s a product the live catalog doesn't show", async () => {
    live.mockResolvedValue({ all: liveFixture(), shown: liveFixture().filter((c) => c.slug !== "bpc-157"), lots: [] });
    await expect(ProductPage({ params: Promise.resolve({ slug: "bpc-157" }) })).rejects.toThrow();
  });

  it("carries the processor's research-only line next to the RUO label", async () => {
    await renderSlug("bpc-157");
    expect(screen.getByText("All products currently listed on this site are for research purposes only.")).toBeInTheDocument();
  });

  it("shows the COA tag and the selected strength's lot", async () => {
    const { container } = await renderSlug("bpc-157");
    expect(container.querySelector(".s-media")).toHaveTextContent("◇ COA on file");
    expect(screen.getByText("BPC-2609-01")).toBeInTheDocument();
  });

  it("orders sections: hero, About this compound, Material & testing, Compound data, Researchers also added", async () => {
    await renderSlug("bpc-157");
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2s).toEqual(["About this compound", "Material & testing", "Compound data", "Researchers also added"]);
  });

  it("About band shows the description, caption, legend and source link", async () => {
    await renderSlug("bpc-157");
    const band = screen.getByRole("heading", { name: "About this compound" }).closest("section")!;
    expect(within(band).getByText(/synthetic pentadecapeptide/)).toBeInTheDocument();
    expect(within(band).getByText("Computed model — one of many shapes this molecule can take.")).toBeInTheDocument();
    expect(within(band).getByText("Carbon")).toBeInTheDocument();
    expect(within(band).getByRole("link", { name: /PubChem CID 9941957/ })).toHaveAttribute("href", "https://pubchem.ncbi.nlm.nih.gov/compound/9941957");
    expect(within(band).getAllByTestId("mol")).toHaveLength(1);
  });

  it("blends show one model per component and say the parts aren't bonded", async () => {
    await renderSlug("bpc-157-tb-500-ghk-cu-kpv");
    expect(screen.getAllByTestId("mol").map((m) => m.textContent)).toEqual(["BPC-157", "TB-500", "GHK-Cu", "KPV"]);
    expect(screen.getByText(/separate molecules, not bonded/)).toBeInTheDocument();
    // pubchem-3d and computed panels share a caption; it appears once.
    expect(screen.getAllByText("Computed model — one of many shapes this molecule can take.")).toHaveLength(1);
  });

  it("GHK-Cu cites the crystal-structure paper and shows copper in the legend", async () => {
    await renderSlug("ghk-cu");
    expect(screen.getByText("Modeled from the published crystal structure (1984).")).toBeInTheDocument();
    expect(screen.getByText("Copper")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crystal structure paper/i })).toHaveAttribute("href", expect.stringContaining("sciencedirect.com"));
  });

  it("lists what to know before ordering, in line with the refund and shipping policies", async () => {
    await renderSlug("bpc-157");
    const box = screen.getByRole("heading", { level: 3, name: "Before ordering" }).parentElement!;
    const items = within(box).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatch(/certificate for this lot/i);
    expect(items[1]).toMatch(/full refund until your order ships/i);
    expect(items[1]).toMatch(/sale is final/i);
    expect(items[2]).toMatch(/within 48 hours of delivery/i);
    expect(items[2]).toMatch(/one replacement/i);
  });
});
