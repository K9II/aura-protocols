import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/components/store/gate/scenes.generated", () => ({ DESK_SCENES: ["<svg class=\"scene\"></svg>", "<svg class=\"scene\"></svg>", "<svg class=\"scene\"></svg>"], PHONE_STRIP: "<svg class=\"scene\"></svg>", PHONE_MINI: "<svg class=\"scene\"></svg>" }));
const gateSignInAction = vi.fn(), gateSignUpAction = vi.fn(), resendVerifyAction = vi.fn();
vi.mock("@/app/auth/gate-actions", () => ({ gateSignInAction, gateSignUpAction, resendVerifyAction }));
vi.mock("@/app/auth/actions", () => ({ signOutAction: vi.fn() }));
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
    for (const f of [fetchMock, gateSignInAction, gateSignUpAction, resendVerifyAction]) f.mockReset();
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
    await settle(1100);
    expect(document.querySelector(".ag.in")).not.toBeNull();
    expect(screen.getByRole("heading", { name: /New accounts save 15%/ })).toBeInTheDocument();
  });

  it("never shows for a signed-in account", async () => {
    routes({ state: "ok" });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    expect(document.querySelector(".ag")).toBeNull();
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

  it("create account needs the agreement, sends the opt-in, and moves to verify when required", async () => {
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
    fireEvent.click(screen.getByLabelText(/Email me promotions, research news and new lots\./));
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Confirm your email/ })).toBeInTheDocument());
    expect(gateSignUpAction).toHaveBeenCalledWith({ email: "new@lab.org", fullName: "Jane Rivera", password: "correct horse battery", agreed: true, optIn: true });
  });

  it("opens straight at the verify step for a flagged account", async () => {
    routes({ state: "verify", email: "j@lab.org" });
    resendVerifyAction.mockResolvedValue({ ok: true });
    const { default: AccountGate } = await import("@/components/store/gate/AccountGate");
    render(<AccountGate />);
    await settle();
    expect(screen.getByText(/We sent a link to j@lab.org/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Resend the link/ }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/Sent/));
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
