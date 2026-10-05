import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { DiscountCodeRow } from "@/lib/discounts/rules";

const saveCodeAction = vi.fn();
vi.mock("@/app/admin/discounts/actions", () => ({ saveCodeAction, codeAvailableAction: vi.fn().mockResolvedValue({ ok: true, message: "SPRING20 is available" }) }));

const hidden = (c: HTMLElement, name: string) => c.querySelector<HTMLInputElement>(`input[type=hidden][name="${name}"]`);

const row = (o: Partial<DiscountCodeRow> = {}): DiscountCodeRow => ({
  id: "11111111-1111-4111-8111-111111111111", code: "TENOFF", note: "Fall list", kind: "order_amount", value: 1050,
  stack_on_top: true, free_shipping: false, starts_at: "2030-10-05T06:00:00+00:00", ends_at: "2030-11-01T05:59:00+00:00",
  max_uses: 200, once_per_customer: true, locked_email: "a@b.co", min_order_cents: 15000,
  include_slugs: [], exclude_slugs: [], include_classes: [], exclude_classes: [], status: "active", batch_id: null, created_by: null, created_at: "2030-10-01T00:00:00+00:00",
  ...o,
});

describe("DiscountForm", () => {
  beforeEach(() => { saveCodeAction.mockReset(); });

  it("writes the live summary from the fields", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="single" capPct={30} />);
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "SPRING20" } });
    fireEvent.click(screen.getByRole("radio", { name: /Order %/ }));
    fireEvent.change(screen.getByLabelText("Percent off"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("switch", { name: /Apply on top/ }));
    expect(screen.getByTestId("rule-summary")).toHaveTextContent("SPRING20 takes 20% off the goods total after pack, new-account and partner discounts.");
  });

  it("shows the worst-case basket and warns when the cap trims it", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="single" capPct={30} />);
    fireEvent.click(screen.getByRole("radio", { name: /Order %/ }));
    fireEvent.change(screen.getByLabelText("Percent off"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("switch", { name: /Apply on top/ }));
    expect(screen.getByTestId("worst-case")).toHaveTextContent(/30% off list/);
    expect(screen.getByTestId("worst-case")).toHaveTextContent(/Shipping/);
    expect(screen.getByRole("note")).toHaveTextContent(/30% cap trims it/);
  });

  it("batch mode swaps the code field for prefix and count", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    render(<DiscountForm mode="batch" capPct={30} />);
    expect(screen.queryByLabelText("Code")).toBeNull();
    expect(screen.getByLabelText("Prefix")).toBeInTheDocument();
    expect(screen.getByLabelText("How many")).toBeInTheDocument();
    expect(screen.queryByLabelText("Total uses")).toBeNull();
  });

  it("free shipping posts scope all with no items, even after an empty 'Only these'", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    const { container } = render(<DiscountForm mode="single" capPct={30} />);
    fireEvent.click(screen.getByRole("radio", { name: "Only these" }));
    expect(hidden(container, "scope")!.value).toBe("only");
    fireEvent.click(screen.getByRole("radio", { name: /Free shipping/ }));
    expect(hidden(container, "scope")!.value).toBe("all");
    expect(hidden(container, "scopeItems")!.value).toBe("[]");
  });

  it("says to fix the marked fields when the action returns field errors", async () => {
    saveCodeAction.mockResolvedValue({ fieldErrors: { value: "Use a whole percent from 1 to 100." } });
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    const { container } = render(<DiscountForm mode="single" capPct={30} />);
    await act(async () => { fireEvent.submit(container.querySelector("form")!); });
    expect(await screen.findByText("Fix the fields marked below.")).toBeInTheDocument();
    expect(screen.getByLabelText("Percent off")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Percent off").getAttribute("aria-describedby")).toContain("d-err-value");
  });

  it("prefills an edit: cents → dollars, UTC ISO → Mountain, id and kind as hidden fields", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    const { container } = render(<DiscountForm mode="single" capPct={30} existing={row()} />);
    expect(screen.getByLabelText("Amount off")).toHaveValue(10.5);
    expect(screen.getByLabelText("Minimum order")).toHaveValue(150);
    expect(screen.getByLabelText("Starts")).toHaveValue("2030-10-05T00:00");
    expect(screen.getByLabelText("Ends")).toHaveValue("2030-10-31T23:59");
    expect(screen.getByLabelText("Account email")).toHaveValue("a@b.co");
    expect(hidden(container, "id")!.value).toBe(row().id);
    expect(hidden(container, "kind")!.value).toBe("order_amount");
    expect(hidden(container, "lockEmail")!.value).toBe("on");
    expect(screen.getByLabelText("Code")).toHaveAttribute("readonly");
    expect(screen.getByText("Oct 5 – Oct 31, 2030 (27 days)")).toBeInTheDocument();
  });

  it("a batch edit omits max uses, the email lock and prefix/count", async () => {
    const { default: DiscountForm } = await import("@/components/admin/discounts/DiscountForm");
    const { container } = render(<DiscountForm mode="batch" capPct={30} existing={row({ batch_id: "22222222-2222-4222-8222-222222222222", max_uses: 1 })} />);
    expect(hidden(container, "mode")!.value).toBe("batch");
    expect(hidden(container, "id")).not.toBeNull();
    expect(container.querySelector('[name="maxUses"]')).toBeNull();
    expect(container.querySelector('[name="lockEmail"]')).toBeNull();
    expect(container.querySelector('[name="lockedEmail"]')).toBeNull();
    expect(container.querySelector('[name="prefix"]')).toBeNull();
    expect(container.querySelector('[name="count"]')).toBeNull();
    expect(screen.getByText("Codes are fixed once generated.")).toBeInTheDocument();
  });
});
