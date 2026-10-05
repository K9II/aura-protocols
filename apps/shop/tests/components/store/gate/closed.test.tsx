import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("@/app/auth/gate-actions", () => ({ gateSignInAction: vi.fn(), gateSignUpAction: vi.fn(), resendVerifyAction: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({ signOutAction: vi.fn() }));
vi.mock("@/components/AuraLockup", () => ({ default: () => null }));
import GateSteps from "@/components/store/gate/GateSteps";

describe("gate closed step", () => {
  it("says the account is closed and how to reach support", () => {
    render(<GateSteps variant="a" step="closed" email="" onStep={() => {}} onEmail={() => {}} onDone={() => {}} />);
    expect(screen.getByRole("heading", { name: /This account is closed/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "support@auraprotocols.com" })).toHaveAttribute("href", "mailto:support@auraprotocols.com");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
