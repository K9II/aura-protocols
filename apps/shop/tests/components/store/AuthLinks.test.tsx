import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const getSession = vi.fn();
const unsubscribe = vi.fn();
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe } } }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));
vi.mock("@/app/auth/actions", () => ({ signOutAction: vi.fn() }));
let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
import AuthLinks from "@/components/store/AuthLinks";
import PhoneMenu from "@/components/store/PhoneMenu";
import { fireEvent } from "@testing-library/react";

describe("AuthLinks", () => {
  beforeEach(() => { getSession.mockReset(); unsubscribe.mockReset(); onAuthStateChange.mockClear(); pathname = "/"; });

  // Sign-in and sign-out run on the server and then move to another page without a
  // full reload, so the header must re-check the session on every page change.
  it("updates after a server-side sign-in or sign-out moves to another page", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    pathname = "/sign-in";
    const { rerender } = render(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();

    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    pathname = "/account";
    rerender(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Account" })).toBeInTheDocument();

    getSession.mockResolvedValue({ data: { session: null } });
    pathname = "/";
    rerender(<AuthLinks />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account" })).toBeNull();
  });

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

  it("phone menu: the store links, then Account and Sign out when signed in", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<PhoneMenu />);
    const btn = screen.getByRole("button", { name: "Menu" });
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    const nav = screen.getByRole("navigation", { name: "Menu" });
    expect([...nav.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")])).toEqual(expect.arrayContaining([
      ["Shop", "/products"], ["COA Lookup", "/coa"], ["Wholesale", "/wholesale"], ["Affiliate Program", "/affiliates"],
    ]));
    expect(await screen.findByRole("link", { name: "Account" })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("phone menu: Sign in when signed out; Escape and a tap outside close it", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<PhoneMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
  });

  it("phone menu: closes when a link takes you to another page", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { rerender } = render(<PhoneMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("navigation", { name: "Menu" })).toBeInTheDocument();
    pathname = "/coa";
    rerender(<PhoneMenu />);
    expect(screen.queryByRole("navigation", { name: "Menu" })).toBeNull();
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
