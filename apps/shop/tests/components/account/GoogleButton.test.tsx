import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { startGoogleAction } = vi.hoisted(() => ({ startGoogleAction: vi.fn() }));
vi.mock("@/app/auth/google-actions", () => ({ startGoogleAction }));
import GoogleButton, { OrEmail } from "@/components/account/GoogleButton";

describe("GoogleButton", () => {
  it("is one submit button with Google's label and G mark, carrying the next path", () => {
    const { container } = render(<GoogleButton next="/products" />);
    const button = screen.getByRole("button", { name: "Continue with Google" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("g-signin");
    expect(button.querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(button.querySelectorAll("svg path")).toHaveLength(4);
    expect(container.querySelector<HTMLInputElement>('input[type="hidden"][name="next"]')!.value).toBe("/products");
  });

  it("the divider says 'or use email'", () => {
    render(<OrEmail />);
    expect(screen.getByText("or use email")).toBeInTheDocument();
  });
});
