import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/store/gate/scenes.generated", () => ({ DESK_SCENES: ["<svg class=\"scene\"></svg>", "<svg class=\"scene\"></svg>", "<svg class=\"scene\"></svg>"], PHONE_STRIP: "<svg class=\"scene\"></svg>", PHONE_MINI: "<svg class=\"scene\"></svg>" }));
const { gateSignInAction, gateSignUpAction, resendVerifyAction, signOutAction } = vi.hoisted(() => ({
  gateSignInAction: vi.fn(), gateSignUpAction: vi.fn(), resendVerifyAction: vi.fn(), signOutAction: vi.fn(),
}));
vi.mock("@/app/auth/gate-actions", () => ({ gateSignInAction, gateSignUpAction, resendVerifyAction }));
vi.mock("@/app/auth/actions", () => ({ signOutAction }));
vi.mock("@/components/AuraLockup", () => ({ default: () => <span>Aura</span> }));

const fetchMock = vi.fn();
const respond = (body: unknown, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });
function routes(me: unknown, lookup: unknown = { next: "create" }, lookupStatus = 200) {
  fetchMock.mockImplementation((url: string) => (url === "/api/me/gate" ? respond(me) : respond(lookup, lookupStatus)));
}
async function settle(ms = 4100) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }

describe("AccountGate", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    pathname = "/";
    for (const f of [fetchMock, gateSignInAction, gateSignUpAction, resendVerifyAction, signOutAction]) f.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.useRealTimers(); });

  it("shows step 1 to an anonymous visitor after 3.5 s, not before", async () => {
    routes({ state: "anon" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    // The status check resolves on microtasks; let it land (gate mounted off-screen) before moving the clock.
    await waitFor(() => expect(document.querySelector(".ag")).not.toBeNull());
    await settle(3000);
    expect(document.querySelector(".ag.in")).toBeNull();
    // Before entry: inert (no Tab stops) and no modal dialog hiding the page.
    expect(document.querySelector(".ag")).toHaveAttribute("inert");
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
    await settle(1100);
    expect(document.querySelector(".ag.in")).not.toBeNull();
    expect(document.querySelector(".ag")).not.toHaveAttribute("inert");
    expect(screen.getByRole("dialog", { name: /New accounts save 15%/ })).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(screen.getByPlaceholderText("you@institution.org"));
    // Focus that escapes to the page is pulled back in on the next Tab.
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(document.querySelector(".ag")!.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole("heading", { name: /New accounts save 15%/ })).toBeInTheDocument();
  });

  it("never shows for a signed-in account", async () => {
    routes({ state: "ok" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
  });

  it("re-checks on navigation: signed in on /sign-in, then /account shows no gate", async () => {
    pathname = "/sign-in";
    routes({ state: "anon" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    const { rerender } = render(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
    routes({ state: "ok" });
    pathname = "/account";
    rerender(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/me/gate", expect.anything());
  });

  it("re-checks on navigation: signed out, the next page gates after 3.5 s", async () => {
    routes({ state: "ok" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    const { rerender } = render(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
    routes({ state: "anon" });
    pathname = "/products";
    rerender(<AccountGate />);
    await waitFor(() => expect(document.querySelector(".ag")).not.toBeNull());
    await settle(3000);
    expect(document.querySelector(".ag.in")).toBeNull();
    await settle(1100);
    expect(document.querySelector(".ag.in")).not.toBeNull();
  });

  it("a shown gate stays shown (no flicker) while an anon visitor's status is re-checked", async () => {
    routes({ state: "anon" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    const { rerender } = render(<AccountGate />);
    await waitFor(() => expect(document.querySelector(".ag")).not.toBeNull());
    await settle();
    expect(document.querySelector(".ag.in")).not.toBeNull();
    pathname = "/products";
    rerender(<AccountGate />);
    expect(document.querySelector(".ag.in")).not.toBeNull();
    await settle(50);
    expect(document.querySelector(".ag.in")).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("never shows on an exempt page", async () => {
    pathname = "/terms";
    routes({ state: "anon" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
  });

  it("fails closed: a failed status check shows the gate", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    expect(screen.getByRole("heading", { name: /New accounts save 15%/ })).toBeInTheDocument();
  });

  it("branches a known email to sign-in and a new one to create-account", async () => {
    routes({ state: "anon" }, { next: "sign-in" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    fireEvent.change(screen.getByPlaceholderText("you@institution.org"), { target: { value: "Jane@Lab.org" } });
    fireEvent.click(screen.getByRole("button", { name: /Get access/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Welcome back." })).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/gate/lookup", expect.objectContaining({ body: JSON.stringify({ email: "jane@lab.org" }) }));
    fireEvent.click(screen.getByRole("button", { name: /Use a different email/ }));
    routes({ state: "anon" }, { next: "create" });
    fireEvent.change(screen.getByPlaceholderText("you@institution.org"), { target: { value: "new@lab.org" } });
    fireEvent.click(screen.getByRole("button", { name: /Get access/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /create your account/ })).toBeInTheDocument());
  });

  it("explains a rate-limited lookup", async () => {
    routes({ state: "anon" }, { error: "x" }, 429);
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    fireEvent.change(screen.getByPlaceholderText("you@institution.org"), { target: { value: "a@b.co" } });
    fireEvent.click(screen.getByRole("button", { name: /Get access/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Too many tries/));
  });

  it("create account needs the one agreement box, shows the marketing notice, and moves to verify when required", async () => {
    routes({ state: "anon" }, { next: "create" });
    gateSignUpAction.mockResolvedValue({ ok: true, verifyRequired: true });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    fireEvent.change(screen.getByPlaceholderText("you@institution.org"), { target: { value: "new@lab.org" } });
    fireEvent.click(screen.getByRole("button", { name: /Get access/ }));
    await waitFor(() => screen.getByLabelText(/Full name/));
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Jane Rivera" } });
    fireEvent.change(screen.getByLabelText(/Choose a password/), { target: { value: "correct horse battery" } });
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
    expect(gateSignUpAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/agree/i);
    fireEvent.click(screen.getByLabelText(/I am 21 or older/));
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByText(/update you on promotions, research news, and new lots and SKUs — unsubscribe anytime\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Confirm your email/ })).toBeInTheDocument());
    expect(gateSignUpAction).toHaveBeenCalledWith({ email: "new@lab.org", fullName: "Jane Rivera", password: "correct horse battery", agreed: true });
  });

  it("opens straight at the verify step for a flagged account", async () => {
    routes({ state: "verify", email: "j@lab.org" });
    resendVerifyAction.mockResolvedValue({ ok: true });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await waitFor(() => expect(document.querySelector(".ag")).not.toBeNull());
    await settle();
    expect(screen.getByText(/We sent a link to j@lab.org/)).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Resend the link/ }));
    fireEvent.click(screen.getByRole("button", { name: /Resend the link/ }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Sent/));
  });

  it("verify step: sign out calls the action, then reloads the home page as anon", async () => {
    routes({ state: "verify", email: "j@lab.org" });
    // The real action redirects; the router rejects its promise with a digest-bearing error.
    const redirectErr = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/;307;" });
    signOutAction.mockRejectedValue(redirectErr);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(signOutAction.mock.invocationCallOrder[0]).toBeLessThan(assign.mock.invocationCallOrder[0]);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("verify step: a non-redirect sign-out failure is logged but still navigates home", async () => {
    routes({ state: "verify", email: "j@lab.org" });
    signOutAction.mockRejectedValue(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: /Sign out/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(errorSpy).toHaveBeenCalledWith("[gate] sign-out failed", expect.any(Error));
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("appears at once (no delay) with reduced motion", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    routes({ state: "anon" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle(50);
    expect(document.querySelector(".ag.rv")).not.toBeNull();
    vi.unstubAllGlobals();
  });
});
