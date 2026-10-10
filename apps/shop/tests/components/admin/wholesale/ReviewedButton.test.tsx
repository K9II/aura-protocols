import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/admin/wholesale/actions", () => ({ markWholesaleReviewedAction: vi.fn() }));

describe("ReviewedButton", () => {
  it("posts the customer id with a Reviewed button", async () => {
    const { default: ReviewedButton } = await import("@/components/admin/wholesale/ReviewedButton");
    const { container } = render(<ReviewedButton customerId="c1" name="Dana Reyes" />);
    expect(screen.getByRole("button", { name: "Mark Dana Reyes reviewed" }).textContent).toBe("Reviewed");
    expect((container.querySelector("input[name=customerId]") as HTMLInputElement).value).toBe("c1");
  });
});
