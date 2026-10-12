import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ saveCertificateAction: vi.fn(async () => null), coaUploadAction: vi.fn() }));
import CertificateDialog from "@/components/admin/catalog/CertificateDialog";
import { saveCertificateAction } from "@/app/admin/catalog/actions";

// jsdom has no showModal; open = attribute is enough for these tests.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };

const labs = [{ id: "v", name: "Vanguard Laboratory", city: "Olympia, WA", verify_url_template: "https://verifiedbyvanguard.com/verify/{report}" }];

describe("CertificateDialog", () => {
  it("renders the + Add certificate trigger and, on a live lot, warns the certificate can't change", () => {
    render(<CertificateDialog lotId="l1" lotNumber="AP-1105" title="Tirzepatide 10 mg · lot AP-1105" strength="10 mg" labs={labs} lotLive />);
    fireEvent.click(screen.getByRole("button", { name: "Add certificate" }));
    expect(screen.getByText(/This lot is live — once added, the certificate can't be changed, only given a correction note\./)).toBeInTheDocument();
  });

  it("on a draft lot, says it was logged by the owner now", () => {
    render(<CertificateDialog lotId="l1" lotNumber="AP-1112" title="Tirzepatide 10 mg · lot AP-1112" strength="10 mg" labs={labs} lotLive={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Add certificate" }));
    expect(screen.getByText("Logged as added by you, now")).toBeInTheDocument();
  });

  it("edit mode shows Edit certificate in the title and a hidden certId", () => {
    render(<CertificateDialog lotId="l1" lotNumber="AP-1105" title="Tirzepatide 10 mg · lot AP-1105" strength="10 mg" labs={labs} lotLive
      cert={{ id: "c1", draft: { labId: "v", reportNumber: "VGD-24109", verifyCode: "", testedOn: "2026-10-05", purity: "99.47", method: "HPLC+MS", measured: "", coaPath: "VGD.pdf", certNote: "", result: "pass",
        tests: { identity: "pass", endotoxin: "pass", sterility: "not_tested", heavy_metals: "not_tested", fentanyl: "not_tested" } } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByText(/Edit certificate · Tirzepatide 10 mg · lot AP-1105/)).toBeInTheDocument();
    expect(document.querySelector('input[name="certId"]')).toHaveValue("c1");
  });

  it("resets the report number after a successful save, instead of leaving the submitted value stuck", async () => {
    (saveCertificateAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: "Certificate added." });
    const { container } = render(<CertificateDialog lotId="l1" lotNumber="AP-1105" title="Tirzepatide 10 mg · lot AP-1105" strength="10 mg" labs={labs} lotLive={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Add certificate" }));
    fireEvent.change(document.querySelector('input[name="reportNumber"]')!, { target: { value: "VGD-99999" } });
    expect(document.querySelector('input[name="reportNumber"]')).toHaveValue("VGD-99999");
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(document.querySelector('input[name="reportNumber"]')).toHaveValue("");
  });
});
