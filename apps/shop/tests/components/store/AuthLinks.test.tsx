import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getSession = vi.fn();
const unsubscribe = vi.fn();
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe } } }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));
vi.mock("@/app/auth/actions", () => ({ signOutAction: vi.fn() }));
import AuthLinks from "@/components/store/AuthLinks";

describe("AuthLinks", () => {
  beforeEach(() => { getSession.mockReset(); unsubscribe.mockReset(); onAuthStateChange.mockClear(); });

  it("shows Sign in when signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("shows Account and Sign out when signed in", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("adds an Admin link for the owner account", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const fetchMock = vi.fn(async () => Response.json({ owner: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin/orders");
    expect(fetchMock).toHaveBeenCalledWith("/api/me/owner", expect.objectContaining({ cache: "no-store" }));
    vi.unstubAllGlobals();
  });

  it("shows no Admin link for other customers, or when the owner check fails", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u2" } } } });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ owner: false })));
    const { unmount } = render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Account" })).toBeInTheDocument();
    await Promise.resolve();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    unmount();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Account" })).toBeInTheDocument();
    await Promise.resolve();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    vi.unstubAllGlobals();
  });

  it("leaves no subscription when unmounted immediately after render", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { unmount } = render(<AuthLinks />);
    unmount();
    // Let the deferred microtask (if it still ran) settle before asserting.
    await Promise.resolve();
    await Promise.resolve();
    if (onAuthStateChange.mock.calls.length > 0) {
      expect(unsubscribe).toHaveBeenCalled();
    } else {
      expect(onAuthStateChange).not.toHaveBeenCalled();
    }
  });
});
