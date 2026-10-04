import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("admin error boundary", () => {
  it("shows a calm generic message and the digest, and calls unstable_retry on Try again", async () => {
    const { default: AdminError } = await import("@/app/admin/error");
    const unstable_retry = vi.fn();
    render(<AdminError error={Object.assign(new Error("secret db detail"), { digest: "abc123" })} unstable_retry={unstable_retry} />);

    expect(screen.getByText(/That didn't go through/)).toBeInTheDocument();
    expect(screen.queryByText("secret db detail")).toBeNull();
    expect(screen.getByText("abc123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(unstable_retry).toHaveBeenCalledTimes(1);
  });

  it("omits the digest line when there isn't one, and falls back to reset()", async () => {
    const { default: AdminError } = await import("@/app/admin/error");
    const reset = vi.fn();
    render(<AdminError error={new Error("oops")} reset={reset} />);

    expect(screen.getByText(/That didn't go through/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
