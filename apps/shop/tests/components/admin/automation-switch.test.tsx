import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/app/admin/email/actions", () => ({ setAutomationAction: vi.fn() }));
import AutomationSwitch from "@/components/admin/email/AutomationSwitch";

describe("AutomationSwitch", () => {
  it("On shows a Pause dialog with what happens", () => {
    render(<AutomationSwitch automation="cart" label="Cart reminders" paused={false} />);
    expect(screen.getByRole("button", { name: "Pause Cart reminders" })).toBeInTheDocument();
    expect(screen.getByText(/reminders that came due while paused are skipped, not sent late/)).toBeInTheDocument();
  });
  it("Paused offers Turn back on", () => {
    render(<AutomationSwitch automation="welcome" label="Welcome series" paused />);
    expect(screen.getByRole("button", { name: "Turn Welcome series back on" })).toBeInTheDocument();
    expect(screen.getByText(/one file at a time/)).toBeInTheDocument();
  });
});
