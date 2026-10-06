import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { OFFER_DAYS_TEXT, OFFER_PCT_TEXT } from "@/lib/account/offer";
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

  it("matches the mock: offer line, Google box with Not you?, name from Google, the same agreement and notice", async () => {
    const { container } = render(await page({ next: "/products" }));
    expect(screen.getByText("One last step")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Finish your account." })).toBeInTheDocument();
    expect(container.textContent).toContain(`New accounts save ${OFFER_PCT_TEXT} on a first order placed within ${OFFER_DAYS_TEXT}.`);
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

  it("a non-Google unfinished user isn't told Google confirmed anything", async () => {
    getUnfinishedUser.mockResolvedValue({ ...dana, viaGoogle: false });
    const { container } = render(await page({}));
    expect(container.textContent).toContain("Signed in as dana.whitfield@gmail.com");
    expect(container.textContent).not.toContain("Google");
    expect(screen.getByText(/email a link to confirm your address/)).toBeInTheDocument();
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
