import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/auth/actions", () => ({ signUpAction: vi.fn(), signInAction: vi.fn() }));
import SignUpForm from "@/components/account/SignUpForm";

describe("SignUpForm", () => {
  it("asks for the three agreements, unticked, and carries the next path", () => {
    const { container } = render(<SignUpForm next="/checkout" />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(3);
    for (const b of boxes) expect(b).not.toBeChecked();
    expect(screen.getByText(/21 years of age or older/i)).toBeInTheDocument();
    expect(container.querySelector('input[name="next"]')).toHaveValue("/checkout");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("minlength", "10");
  });
});
