import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NEW_ACCOUNT_PCT } from "@/lib/account/offer";

const getAccountState = vi.fn();
vi.mock("@/lib/dal", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/dal")>()), getAccountState }));
vi.mock("@/app/auth/google-actions", () => ({ startGoogleAction: vi.fn() }));
vi.mock("@/components/account/SignInForm", () => ({ default: ({ next }: { next: string }) => <div>sign-in-form {next}</div> }));
vi.mock("@/components/account/SignUpForm", () => ({ default: () => <div>sign-up-form</div> }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

const page = async (sp: Record<string, string>) => {
  const { default: SignInPage } = await import("@/app/sign-in/page");
  return SignInPage({ searchParams: Promise.resolve(sp) });
};
const anon = { customer: null, blocked: false, unfinished: false };

describe("/sign-in", () => {
  beforeEach(() => { vi.resetModules(); getAccountState.mockReset(); getAccountState.mockResolvedValue(anon); });

  it("one Continue with Google above both forms, then 'or use email'", async () => {
    const { container } = render(await page({ next: "/checkout" }));
    expect(screen.getByText("New or returning")).toBeInTheDocument();
    const google = screen.getByRole("button", { name: "Continue with Google" });
    expect(screen.getAllByRole("button", { name: "Continue with Google" })).toHaveLength(1);
    expect(container.querySelector<HTMLInputElement>('form.g-signin-form input[name="next"]')!.value).toBe("/checkout");
    const divider = screen.getByText("or use email");
    const forms = screen.getByText("sign-in-form /checkout");
    expect(google.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(forms) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("sign-up-form")).toBeInTheDocument();
  });

  it("layout B: Google + both forms one above the other in the left column, the offer panel on the right", async () => {
    const { container } = render(await page({ next: "/checkout" }));
    const grid = container.querySelector(".s-signin-grid")!;
    expect(grid.children).toHaveLength(2);
    const [col, offer] = [...grid.children];
    expect(col).toHaveClass("s-signin-col");
    expect(offer).toBe(screen.getByRole("complementary", { name: "Welcome offer" }));
    expect(offer.querySelector(".s-offer-num")!.textContent).toBe(String(NEW_ACCOUNT_PCT));
    expect(col).toContainElement(screen.getByRole("button", { name: "Continue with Google" }));
    const forms = col.querySelector(".s-signin-forms")!;
    expect(forms.textContent).toBe("sign-in-form /checkoutsign-up-form");
    expect(screen.getAllByRole("complementary", { name: "Welcome offer" })).toHaveLength(1);
  });

  it("an error stays at the top, above the grid", async () => {
    const { container } = render(await page({ error: "google" }));
    const alert = screen.getByRole("alert");
    expect(alert.compareDocumentPosition(container.querySelector(".s-signin-grid")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("explains a Google failure", async () => {
    render(await page({ error: "google" }));
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't sign you in with Google — please try again, or use your email below.");
  });

  it("closed account message", async () => {
    render(await page({ error: "closed" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/This account is closed/);
  });

  it("keeps the dead-link message", async () => {
    render(await page({ error: "link" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/That link has expired/);
  });

  it("unknown error keys show nothing", async () => {
    render(await page({ error: "constructor" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a signed-in customer goes to next; an unfinished Google user goes to finish their account", async () => {
    getAccountState.mockResolvedValueOnce({ customer: { id: "u1" }, blocked: false, unfinished: false });
    await expect(page({ next: "/checkout" })).rejects.toThrow("REDIRECT:/checkout");
    getAccountState.mockResolvedValueOnce({ customer: null, blocked: false, unfinished: true });
    await expect(page({ next: "/checkout" })).rejects.toThrow("REDIRECT:/finish-account?next=%2Fcheckout");
  });
});
