import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ receiveLotAction: vi.fn(async () => null), coaUploadAction: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: vi.fn() }) } }) }));
import ReceiveLotDialog from "@/components/admin/catalog/ReceiveLotDialog";

// jsdom has no showModal; open = attribute is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

describe("ReceiveLotDialog", () => {
  const open = () => { render(<ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" />); fireEvent.click(screen.getByRole("button", { name: /Receive a lot/ })); };

  it("shows Discrepancy and requires a note when counts differ, with the sellable sum", () => {
    open();
    fireEvent.change(screen.getByLabelText(/Ordered/), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/^Counted/), { target: { value: "196" } });
    fireEvent.change(screen.getByLabelText(/^Damaged/), { target: { value: "2" } });
    expect(screen.getByText("Discrepancy")).toBeInTheDocument();
    expect(screen.getByLabelText(/What happened/)).toBeRequired();
    expect(screen.getByText("194")).toBeInTheDocument();
  });

  it("Save and put live is disabled until a certificate is attached", () => {
    open();
    expect(screen.getByRole("button", { name: "Save and put live" })).toBeDisabled();
  });

  it("warns below the site's purity claim", () => {
    open();
    fireEvent.change(screen.getByLabelText(/Purity/), { target: { value: "98.5" } });
    expect(screen.getByText("Below the 99% shown on the site.")).toBeInTheDocument();
  });

  it("scopes field ids so two dialogs on one page don't collide", () => {
    render(<>
      <ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" />
      <ReceiveLotDialog slug="bpc-157" variantId="20mg" title="BPC-157 20 mg" />
    </>);
    const [open10, open20] = screen.getAllByRole("button", { name: /Receive a lot/ });
    fireEvent.click(open10);
    fireEvent.click(open20);
    const lotInputs = screen.getAllByLabelText("Lot number");
    expect(lotInputs).toHaveLength(2);
    fireEvent.change(lotInputs[0], { target: { value: "AAA-1" } });
    fireEvent.change(lotInputs[1], { target: { value: "BBB-2" } });
    expect(lotInputs[0]).toHaveValue("AAA-1");
    expect(lotInputs[1]).toHaveValue("BBB-2");
  });
});
