import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NEW_ACCOUNT_PCT, OFFER_DAYS_TEXT } from "@/lib/account/offer";
import { MARKETING_NOTICE } from "@/lib/gate-shared";

const getAccountState = vi.fn(), getUnfinishedUser = vi.fn();
vi.mock("@/lib/dal", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/dal")>()), getAccountState, getUnfinishedUser }));
vi.mock("@/app/finish-account/actions", () => ({ finishAccountAction: vi.fn() }));
vi.mock("@/app/auth/actions", () => ({ signOutToSignInAction: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

const page = async (sp: Record<string, string>) => {
  const { default: FinishAccountPage } = await import("@/app/finish-account/page");
  return FinishAccountPage({ searchParams: Promise.resolve(sp) });
};
const unfinished = { customer: null, blocked: false, unfinished: true };
const dana = { id: "g1", email: "dana.whitfield@gmail.com", suggestedName: "Dana Whitfield", viaGoogle: true };

describe("/finish-account", () => {
  beforeEach(() => {
    vi.resetModules(); getAccountState.mockReset(); getUnfinishedUser.mockReset();
    getAccountState.mockResolvedValue(unfinished); getUnfinishedUser.mockResolvedValue(dana);
  });

  it("matches the mock: Ink offer panel beside the form, Google box with Not you?, name from Google, the same agreement and notice", async () => {
    const { container } = render(await page({ next: "/products" }));
    expect(screen.getByText("One last step")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finish your account." })).toBeInTheDocument();
    // The Ink offer panel replaces the old one-line offer, beside the form column.
    expect(container.textContent).not.toContain("New accounts save");
    const offer = screen.getByRole("complementary", { name: "Welcome offer" });
    expect(offer.querySelector(".s-offer-num")!.textContent).toBe(String(NEW_ACCOUNT_PCT));
    expect(offer.textContent).toContain(`placed within ${OFFER_DAYS_TEXT}.`);
    const grid = container.querySelector(".s-finish-grid")!;
    expect(grid.children).toHaveLength(2);
    expect(grid.children[0]).toHaveClass("s-finish-col");
    expect(grid.children[0].querySelector("h1")).not.toBeNull();
    expect(grid.children[1]).toBe(offer);
    expect(container.textContent).toContain("Signed in with Google as dana.whitfield@gmail.com");
    expect(screen.getByRole("button", { name: "Not you?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveValue("Dana Whitfield");
    expect(screen.getByLabelText("Organization (optional)")).toHaveValue("");
    const agree = screen.getByRole("checkbox", { name: /I am 21 or older/ });
    expect(agree).toHaveAttribute("name", "agree");
    expect(agree).toBeRequired();
    expect(agree).not.toBeChecked();
    expect(screen.getByText(MARKETING_NOTICE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Finish creating account/ })).toBeInTheDocument();
    expect(screen.getByText("Google has already confirmed your email, so you can order right away.")).toBeInTheDocument();
    expect(container.querySelector<HTMLInputElement>('input[name="next"]')!.value).toBe("/products");
    expect(container.querySelectorAll("form form")).toHaveLength(0);
  });

  it("a non-Google unfinished user gets no finish form — only sign out and create the account with email", async () => {
    getUnfinishedUser.mockResolvedValue({ ...dana, viaGoogle: false });
    const { container } = render(await page({}));
    expect(container.textContent).toContain("Signed in as dana.whitfield@gmail.com");
    expect(container.textContent).not.toContain("Google");
    expect(screen.queryByLabelText("Full name")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Finish creating account/ })).toBeNull();
    expect(screen.getByText(/create your account with your email/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
  });

  it("finished → next; blocked → closed; signed out → sign-in", async () => {
    getAccountState.mockResolvedValueOnce({ customer: { id: "g1" }, blocked: false, unfinished: false });
    await expect(page({ next: "/products" })).rejects.toThrow("REDIRECT:/products");
    getAccountState.mockResolvedValueOnce({ customer: null, blocked: true, unfinished: false });
    await expect(page({ next: "/products" })).rejects.toThrow("REDIRECT:/sign-in?error=closed");
    getAccountState.mockResolvedValueOnce({ customer: null, blocked: false, unfinished: false });
    getUnfinishedUser.mockResolvedValueOnce(null);
    await expect(page({ next: "/products" })).rejects.toThrow("REDIRECT:/sign-in?next=%2Fproducts");
  });
});
