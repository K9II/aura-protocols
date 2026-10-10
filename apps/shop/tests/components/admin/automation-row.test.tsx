import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AutomationRow from "@/components/admin/email/AutomationRow";

function row(defaultExpanded: boolean) {
  return (
    <table>
      <AutomationRow
        defaultExpanded={defaultExpanded}
        name="Welcome series"
        meta={'"The Paperwork" · 5 files over 10 days'}
        switchSlot={<span>On</span>}
        cells={<><td className="num">3,904</td></>}
        steps={[<tr key="s1"><td>File 01</td></tr>]}
      />
    </table>
  );
}

describe("AutomationRow", () => {
  it("starts expanded when told to, and shows its step rows", () => {
    render(row(true));
    expect(screen.getByRole("button", { name: "Collapse Welcome series" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("File 01")).toBeInTheDocument();
  });

  it("starts collapsed, and the chevron toggles the step rows", () => {
    render(row(false));
    expect(screen.queryByText("File 01")).toBeNull();
    const btn = screen.getByRole("button", { name: "Expand Welcome series" });
    fireEvent.click(btn);
    expect(screen.getByText("File 01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Welcome series" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Collapse Welcome series" }));
    expect(screen.queryByText("File 01")).toBeNull();
  });
});
