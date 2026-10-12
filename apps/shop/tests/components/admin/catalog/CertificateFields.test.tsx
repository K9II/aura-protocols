import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
vi.mock("@/app/admin/catalog/actions", () => ({ coaUploadAction: vi.fn() }));
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
