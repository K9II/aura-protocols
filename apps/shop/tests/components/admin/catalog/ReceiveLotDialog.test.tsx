import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ receiveLotAction: vi.fn(async () => null), coaUploadAction: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ storage: { from: () => ({ uploadToSignedUrl: vi.fn() }) } }) }));
import ReceiveLotDialog from "@/components/admin/catalog/ReceiveLotDialog";
import { receiveLotAction } from "@/app/admin/catalog/actions";

// jsdom has no showModal; open = attribute is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
// close() fires "close" like a real browser, so the dialog's onClose reset runs.
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };

const labs = [{ id: "v", name: "Vanguard Laboratory", city: "Olympia, WA", verify_url_template: "https://verifiedbyvanguard.com/verify/{report}" }];

describe("ReceiveLotDialog", () => {
  const open = () => { render(<ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" labs={labs} strength="10 mg" />); fireEvent.click(screen.getByRole("button", { name: /Receive a lot/ })); };

  it("shows Discrepancy and requires a note when counts differ, with the sellable sum", () => {
    open();
    fireEvent.change(screen.getByLabelText(/Ordered/), { target: { value: "200" } });
    fireEvent.change(screen.getByLabelText(/^Counted/), { target: { value: "196" } });
    fireEvent.change(screen.getByLabelText(/^Damaged/), { target: { value: "2" } });
    expect(screen.getByText("Discrepancy")).toBeInTheDocument();
    expect(screen.getByLabelText(/What happened/)).toBeRequired();
    expect(screen.getByText("194")).toBeInTheDocument();
  });

  it("Save and put live is disabled until the first certificate is complete", () => {
    open();
    expect(screen.getByRole("button", { name: "Save and put live" })).toBeDisabled();
  });

  it("offers an optional First certificate block with the given labs", () => {
    open();
    expect(screen.getByText(/First certificate/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Vanguard Laboratory/ })).toBeInTheDocument();
  });

  it("scopes field ids so two dialogs on one page don't collide", () => {
    render(<>
      <ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" labs={labs} strength="10 mg" />
      <ReceiveLotDialog slug="bpc-157" variantId="20mg" title="BPC-157 20 mg" labs={labs} strength="20 mg" />
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

  it("editing a draft shows no certificate fields — they're edited on the lot's own rows", () => {
    render(<ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" labs={labs} strength="10 mg"
      draft={{ id: "a", lotNumber: "AP-1", ordered: "200", counted: "200", damaged: "0", note: "", supplier: "", cost: "", testCost: "", freight: "", labels: "" }} />);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(screen.getByText(/Certificates are edited on the lot's certificate rows\./)).toBeInTheDocument();
    expect(screen.queryByText(/First certificate/)).not.toBeInTheDocument();
  });

  it("resets the first certificate's report number after a successful save", async () => {
    (receiveLotAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: "Saved AP-1 as a draft." });
    const { container } = render(<ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" labs={labs} strength="10 mg" />);
    fireEvent.click(screen.getByRole("button", { name: /Receive a lot/ }));
    fireEvent.change(screen.getByLabelText("Lot number"), { target: { value: "AP-1" } });
    fireEvent.change(document.querySelector('input[name="reportNumber"]')!, { target: { value: "VGD-99999" } });
    expect(document.querySelector('input[name="reportNumber"]')).toHaveValue("VGD-99999");
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(document.querySelector('input[name="reportNumber"]')).toHaveValue("");
  });

  describe("closing without saving clears the form", () => {
    const lotBox = () => screen.getByLabelText(/Lot number/) as HTMLInputElement;
    it("Cancel clears what was typed, including the first certificate", () => {
      open();
      fireEvent.change(lotBox(), { target: { value: "DEMO-01" } });
      fireEvent.change(screen.getByLabelText(/Report number/), { target: { value: "VGD-1" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: /Receive a lot/ }));
      expect(lotBox().value).toBe("");
      expect((screen.getByLabelText(/Report number/) as HTMLInputElement).value).toBe("");
    });
    it("the × button and Esc clear it too", () => {
      open();
      fireEvent.change(lotBox(), { target: { value: "DEMO-02" } });
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(lotBox().value).toBe("");
      fireEvent.change(lotBox(), { target: { value: "DEMO-03" } });
      act(() => { (document.querySelector("dialog") as HTMLDialogElement).dispatchEvent(new Event("close")); });
      expect(lotBox().value).toBe("");
    });
    it("editing a draft goes back to the draft's saved values", () => {
      const draft = { id: "d1", lotNumber: "BPC-2610-03", ordered: "200", counted: "196", damaged: "2", note: "Short 4", supplier: "", cost: "", testCost: "", freight: "", labels: "" };
      render(<ReceiveLotDialog slug="bpc-157" variantId="10mg" title="BPC-157 10 mg" labs={labs} strength="10 mg" draft={draft} />);
      fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
      fireEvent.change(screen.getByLabelText(/^Counted/), { target: { value: "150" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect((screen.getByLabelText(/^Counted/) as HTMLInputElement).value).toBe("196");
    });
    it("a close event from a dialog nested inside (e.g. Add lab) does not clear the form", () => {
      open();
      fireEvent.change(lotBox(), { target: { value: "DEMO-04" } });
      const outer = document.querySelector("dialog") as HTMLDialogElement;
      const inner = document.createElement("dialog");
      outer.querySelector("form")!.appendChild(inner);
      act(() => { inner.dispatchEvent(new Event("close", { bubbles: true })); });
      expect(lotBox().value).toBe("DEMO-04");
    });
  });
});
