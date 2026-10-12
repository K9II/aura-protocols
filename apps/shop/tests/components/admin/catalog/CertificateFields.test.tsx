import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
const { coaUploadAction, readCertificateAction, saveLabAction, uploadToSignedUrl } = vi.hoisted(() => ({
  coaUploadAction: vi.fn(), readCertificateAction: vi.fn(), saveLabAction: vi.fn(), uploadToSignedUrl: vi.fn(async () => ({ error: null })),
}));
vi.mock("@/app/admin/catalog/actions", () => ({ coaUploadAction, readCertificateAction }));
vi.mock("@/app/admin/catalog/settings/actions", () => ({ saveLabAction }));
// jsdom has no showModal/close (the Add lab dialog).
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }) }));
import CertificateFields, { EMPTY_CERT } from "@/components/admin/catalog/CertificateFields";

const labs = [{ id: "v", name: "Vanguard Laboratory", city: "Olympia, WA", verify_url_template: "https://verifiedbyvanguard.com/verify/{report}" }];

describe("CertificateFields", () => {
  it("shows the measured % of the label and the verify link preview", () => {
    render(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg" labs={labs} initial={{ ...EMPTY_CERT, labId: "v", reportNumber: "VGD-24109", measured: "10.42" }} />);
    expect(screen.getByText(/of 10 mg on the label · 104%/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /verifiedbyvanguard\.com\/verify\/VGD-24109/ })).toHaveAttribute("href", "https://verifiedbyvanguard.com/verify/VGD-24109");
  });
  it("the owner picks the result; a failed test is flagged but never changes it", () => {
    render(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg" labs={labs} initial={EMPTY_CERT} />);
    const result = () => (document.querySelector('input[name="result"]') as HTMLInputElement).value;
    expect(result()).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Result: Pass" }));
    expect(result()).toBe("pass");
    fireEvent.click(screen.getByRole("button", { name: "Endotoxin: Fail" }));
    expect((document.querySelector('input[name="test_endotoxin"]') as HTMLInputElement).value).toBe("fail");
    expect(result()).toBe("pass");
    expect(screen.getByRole("button", { name: "Result: Pass" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Endotoxin failed on this report. Review it, then set the Result.");
  });
  it("can be marked Failed with no failed test", () => {
    render(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg" labs={labs} initial={EMPTY_CERT} />);
    fireEvent.click(screen.getByRole("button", { name: "Result: Failed" }));
    expect((document.querySelector('input[name="result"]') as HTMLInputElement).value).toBe("fail");
    expect(screen.getByLabelText(/what failed/i)).toBeRequired();
  });
  it("shows the chosen lab's verify hint under the Verify code field", () => {
    render(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg"
      labs={[{ ...labs[0], verify_hint: "The certificate ID from the QR code." }]}
      initial={{ ...EMPTY_CERT, labId: "v" }} />);
    expect(screen.getByText("The certificate ID from the QR code.")).toBeInTheDocument();
  });
});

const READING = {
  lab_name: "Vanguard Laboratory", lab_city: "Olympia, WA", report_number: "VGD-24109", verify_code: null,
  tested_on: "2026-10-05", purity_pct: 99.47, method: "HPLC", measured_mg: 10.42,
  identity: "pass", endotoxin: "pass", sterility: null, heavy_metals: null, fentanyl: null,
  product_name: "Tirzepatide", strength_label: "10 mg", batch: "N8326",
};
const attach = async () => {
  coaUploadAction.mockResolvedValue({ path: "AP-1105/1700000000000.pdf", token: "t" });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["%PDF"], "c.pdf", { type: "application/pdf" });
  await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
};
const setup = (extra: Partial<Parameters<typeof CertificateFields>[0]> = {}) =>
  render(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg" labs={labs} initial={EMPTY_CERT} productNames={["Tirzepatide"]} canAddLab {...extra} />);
// The "from PDF" mark sits inside the label, so filled fields are found by a label prefix.
const report = () => screen.getByLabelText(/^Report number/) as HTMLInputElement;

describe("CertificateFields auto-fill", () => {
  beforeEach(() => { coaUploadAction.mockReset(); readCertificateAction.mockReset(); });

  it("puts the PDF row first", () => {
    setup();
    const file = document.querySelector('input[type="file"]')!;
    const lab = screen.getByLabelText("Lab");
    expect(file.compareDocumentPosition(lab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Attach it first. The store reads it and fills in what it finds.")).toBeInTheDocument();
  });

  it("reads after upload, fills empty fields with marks, never Result", async () => {
    readCertificateAction.mockResolvedValue({ reading: READING });
    setup();
    await attach();
    expect(readCertificateAction).toHaveBeenCalledWith("AP-1105", "AP-1105/1700000000000.pdf");
    await screen.findByText("Filled 8 fields from the PDF. Check each one.");
    expect(report().value).toBe("VGD-24109");
    expect((screen.getByLabelText(/^Lab/) as HTMLSelectElement).value).toBe("v");
    expect((document.querySelector('input[name="result"]') as HTMLInputElement).value).toBe("");
    expect(screen.getAllByText("from PDF")).toHaveLength(8);
    expect(screen.queryByText("Attach it first. The store reads it and fills in what it finds.")).toBeNull();
  });

  it("editing a filled field removes its mark", async () => {
    readCertificateAction.mockResolvedValue({ reading: READING });
    setup();
    await attach();
    await screen.findByText(/Filled 8 fields/);
    fireEvent.change(report(), { target: { value: "VGD-1" } });
    expect(screen.getAllByText("from PDF")).toHaveLength(7);
  });

  it("keeps what the owner typed while it read", async () => {
    let resolve!: (v: unknown) => void;
    readCertificateAction.mockReturnValue(new Promise((r) => { resolve = r; }));
    setup();
    await attach();
    expect(screen.getByText(/Reading the PDF/)).toBeInTheDocument();
    fireEvent.change(report(), { target: { value: "MINE-1" } });
    await act(async () => { resolve({ reading: READING }); });
    expect(report().value).toBe("MINE-1");
    await screen.findByText("Filled 7 fields from the PDF. Check each one.");
  });

  it("unknown lab: note + Add lab (owner only)", async () => {
    readCertificateAction.mockResolvedValue({ reading: { ...READING, lab_name: "Kestrel Analytical", lab_city: "Austin, TX" } });
    const { unmount } = setup();
    await attach();
    expect(await screen.findByText(/This report is from/)).toHaveTextContent("This report is from Kestrel Analytical, Austin, TX. It isn't in your labs list.");
    expect(screen.getByRole("button", { name: /add lab/i })).toBeInTheDocument();
    unmount();
    setup({ canAddLab: false });
    await attach();
    await screen.findByText(/This report is from/);
    expect(screen.queryByRole("button", { name: /add lab/i })).toBeNull();
  });

  it("picks a lab added from the note once the labs list includes it", async () => {
    readCertificateAction.mockResolvedValue({ reading: { ...READING, lab_name: "Kestrel Analytical", lab_city: "Austin, TX" } });
    saveLabAction.mockResolvedValue({ ok: "Lab added.", name: "Kestrel Analytical" });
    const { rerender } = setup();
    await attach();
    await screen.findByText(/This report is from/);
    const form = document.body.querySelector("dialog form") as HTMLFormElement;
    await act(async () => { fireEvent.submit(form); });
    const kestrel = { id: "k", name: "Kestrel Analytical", city: "Austin, TX", verify_url_template: null };
    rerender(<CertificateFields idSuffix="t" lotNumber="AP-1105" strength="10 mg" labs={[...labs, kestrel]} initial={EMPTY_CERT} productNames={["Tirzepatide"]} canAddLab />);
    expect((screen.getByLabelText(/^Lab/) as HTMLSelectElement).value).toBe("k");
    expect(screen.queryByText(/This report is from/)).toBeNull();
  });

  it("wrong product/strength warning above Result", async () => {
    readCertificateAction.mockResolvedValue({ reading: { ...READING, product_name: "Tirzepatide", strength_label: "30 mg" } });
    setup({ productNames: ["MOTS-c"], lotNumber: "AP-1107" });
    coaUploadAction.mockResolvedValue({ path: "AP-1107/1700000000000.pdf", token: "t" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await act(async () => { fireEvent.change(input, { target: { files: [new File(["%PDF"], "c.pdf", { type: "application/pdf" })] } }); });
    expect(await screen.findByText(/This report is for Tirzepatide 30 mg, batch N8326/)).toBeInTheDocument();
  });

  it("failure: says to type it in, form still works", async () => {
    readCertificateAction.mockResolvedValue({ error: "unread" });
    setup();
    await attach();
    expect(await screen.findByText("Couldn't read this PDF. Fill it in by hand.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Result: Pass" }));
    expect((document.querySelector('input[name="result"]') as HTMLInputElement).value).toBe("pass");
  });

  it("a thrown read is treated as unread", async () => {
    readCertificateAction.mockRejectedValue(new Error("network"));
    setup();
    await attach();
    expect(await screen.findByText("Couldn't read this PDF. Fill it in by hand.")).toBeInTheDocument();
  });

  it("an answer for an earlier PDF is ignored after Replace", async () => {
    let first!: (v: unknown) => void;
    readCertificateAction.mockReturnValueOnce(new Promise((r) => { first = r; })).mockResolvedValueOnce({ error: "unread" });
    setup();
    await attach();
    await attach();
    await screen.findByText(/Couldn't read this PDF/);
    await act(async () => { first({ reading: READING }); });
    expect(report().value).toBe("");
  });
});
