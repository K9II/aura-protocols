import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CartProvider } from "@/components/store/CartProvider";
import SiteSearch from "@/components/store/SiteSearch";
import { liveFixture, LOT } from "../../helpers/live-catalog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function open() {
  render(<CartProvider catalog={liveFixture()}><SiteSearch /></CartProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Search the catalog" }));
  return screen.getByRole("dialog", { name: "Search Aura Protocols" });
}
const box = () => screen.getByLabelText(/search compounds/i);
const type = (v: string) => fireEvent.change(box(), { target: { value: v } });

describe("SiteSearch", () => {
  beforeEach(() => { window.localStorage.clear(); push.mockClear(); });

  it("opens from the nav button with the box focused, and shows suggestions", () => {
    const dialog = open();
    expect(box()).toHaveFocus();
    expect(within(dialog).getByRole("button", { name: "BPC-157" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /Blends\s*3/ })).toBeInTheDocument();
  });

  it("opens with the / key and closes with Escape", () => {
    render(<CartProvider catalog={liveFixture()}><SiteSearch /></CartProvider>);
    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists matches as you type and previews the highlighted vial with its name", () => {
    const dialog = open();
    type("wolverine");
    const row = within(dialog).getByRole("link", { name: /^Wolverine \(BPC-157 \/ TB-500\)Blends/ });
    expect(row).toHaveAttribute("href", "/products/bpc-157-tb-500-blend");
    expect(within(dialog).getByRole("img", { name: /^Wolverine .* vial$/ })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "View Wolverine (BPC-157 / TB-500)" })).toBeInTheDocument();
  });

  it("moves the preview with the arrow keys and opens the highlighted row on Enter", () => {
    open();
    type("bpc");
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    expect(screen.getByRole("img", { name: /^Wolverine / })).toBeInTheDocument();
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/products/bpc-157-tb-500-blend");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("browses a class inside the panel, links to it in the Shop, and drops it with Backspace", () => {
    const dialog = open();
    fireEvent.click(within(dialog).getByRole("button", { name: /Peptide Fragments/ }));
    expect(within(dialog).getByText(/Peptide Fragments · 4 compounds/)).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "See all Peptide Fragments in the Shop →" }))
      .toHaveAttribute("href", "/products?cat=Peptide%20Fragments");
    type("kpv");
    expect(within(dialog).getByText(/1 match in Peptide Fragments/)).toBeInTheDocument();
    type("");
    fireEvent.keyDown(box(), { key: "Backspace" });
    expect(within(dialog).getByText("Popular searches")).toBeInTheDocument();
  });

  it("offers a COA lookup for a lot number", () => {
    const dialog = open();
    type(LOT.lot);
    expect(within(dialog).getByRole("link", { name: new RegExp(`Lot ${LOT.lot}`) })).toHaveAttribute("href", `/coa/${LOT.lot}`);
  });

  it("says when nothing matches", () => {
    const dialog = open();
    type("zzzz");
    expect(within(dialog).getByText(/Nothing matches “zzzz”/)).toBeInTheDocument();
  });
});
