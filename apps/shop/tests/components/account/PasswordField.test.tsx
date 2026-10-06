import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PasswordField from "@/components/account/PasswordField";

describe("PasswordField", () => {
  it("Show / Hide switches the field between hidden and visible text without submitting", () => {
    render(<form><label htmlFor="pw">Password</label><PasswordField id="pw" autoComplete="current-password" /></form>);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toBeRequired();
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-controls", "pw");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Show");
    fireEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(hide).toHaveTextContent("Hide");
    fireEvent.click(hide);
    expect(input).toHaveAttribute("type", "password");
  });

  it("passes minLength through", () => {
    render(<><label htmlFor="pw2">New password</label><PasswordField id="pw2" autoComplete="new-password" minLength={10} /></>);
    expect(screen.getByLabelText("New password")).toHaveAttribute("minlength", "10");
  });
});
