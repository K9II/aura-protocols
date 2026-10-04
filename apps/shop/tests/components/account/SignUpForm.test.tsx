import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/auth/actions", () => ({ signUpAction: vi.fn(), signInAction: vi.fn() }));
import SignUpForm from "@/components/account/SignUpForm";

describe("SignUpForm", () => {
  it("asks for one combined agreement and an optional email opt-in, unticked, and carries the next path", () => {
    const { container } = render(<SignUpForm next="/checkout" />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
    for (const b of boxes) expect(b).not.toBeChecked();
    const agree = screen.getByRole("checkbox", { name: /I am 21 or older/i });
    expect(agree).toHaveAttribute("name", "agree");
    expect(agree).toBeRequired();
    const optIn = screen.getByRole("checkbox", { name: /Email me promotions, research news and new lots/i });
    expect(optIn).toHaveAttribute("name", "emailOptIn");
    expect(optIn).not.toBeRequired();
    for (const n of ["age21", "ruo", "dispute"]) expect(container.querySelector(`input[name="${n}"]`)).toBeNull();
    expect(container.querySelector('input[name="next"]')).toHaveValue("/checkout");
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("minlength", "10");
  });
});
