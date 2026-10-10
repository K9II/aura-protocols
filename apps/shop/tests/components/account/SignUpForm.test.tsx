import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/app/auth/actions", () => ({ signUpAction: vi.fn(), signInAction: vi.fn() }));
import SignUpForm from "@/components/account/SignUpForm";

describe("SignUpForm", () => {
  it("asks for one combined agreement (unticked, required), shows the marketing notice, and carries the next path", () => {
    const { container } = render(<SignUpForm next="/checkout" />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).not.toBeChecked();
    const agree = screen.getByRole("checkbox", { name: /I am 21 or older/i });
    expect(agree).toHaveAttribute("name", "agree");
    expect(agree).toBeRequired();
    expect(screen.getByText(/update you on promotions, research news, and new lots\/SKUs as they’re released — unsubscribe anytime\./)).toBeInTheDocument();
    expect(container.querySelector('input[name="emailOptIn"]')).toBeNull();
    for (const n of ["age21", "ruo", "dispute"]) expect(container.querySelector(`input[name="${n}"]`)).toBeNull();
    expect(container.querySelector('input[name="next"]')).toHaveValue("/checkout");
    expect(screen.getByLabelText("Password")).toHaveAttribute("minlength", "10");
  });

  it("the password has a Show / Hide toggle", () => {
    render(<SignUpForm next="/account" />);
    const pw = screen.getByLabelText("Password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(pw).toHaveAttribute("type", "text");
  });
});
