import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EntryGate from "@/components/store/EntryGate";
import { TERMS_VERSION } from "@/lib/gate-shared";

const mockUsePathname = vi.fn<() => string>(() => "/");
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

function setCookie(v: string) {
  Object.defineProperty(document, "cookie", { value: v, writable: true, configurable: true });
}

describe("EntryGate", () => {
  beforeEach(() => {
    setCookie("");
    mockUsePathname.mockReturnValue("/");
  });
  afterEach(() => vi.restoreAllMocks());

  it("stays hidden on the /terms policy page it links to", () => {
    mockUsePathname.mockReturnValue("/terms");
    render(<EntryGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("still shows on / with no cookie", async () => {
    mockUsePathname.mockReturnValue("/");
    render(<EntryGate />);
    expect(await screen.findByRole("dialog", { name: /research use only/i })).toBeInTheDocument();
  });

  it("shows the gate to a first-time visitor", async () => {
    render(<EntryGate />);
    expect(await screen.findByRole("dialog", { name: /research use only/i })).toBeInTheDocument();
  });

  it("opts the gate form out of browser form-state restore", async () => {
    render(<EntryGate />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("autocomplete")).toBe("off");
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
  });

  it("stays hidden when the current terms-version hint cookie is present", () => {
    setCookie(`aura_gate_v=${TERMS_VERSION}`);
    render(<EntryGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays hidden for search crawlers", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Googlebot/2.1");
    render(<EntryGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps Enter disabled until all three boxes are ticked, and asks for no email", async () => {
    render(<EntryGate />);
    const enter = await screen.findByRole("button", { name: /enter site/i });
    expect(enter).toBeDisabled();
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]); fireEvent.click(boxes[1]);
    expect(enter).toBeDisabled();
    fireEvent.click(boxes[2]);
    expect(enter).toBeEnabled();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
  });

  it("closes on success and shows an error on failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "x" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<EntryGate />);
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.click(screen.getByRole("button", { name: /enter site/i }));
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enter site/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/gate", expect.objectContaining({ method: "POST" }));
  });

  it("fails toward showing the gate when reading document.cookie throws", async () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get() {
        throw new Error("cookie access blocked");
      },
    });
    render(<EntryGate />);
    expect(await screen.findByRole("dialog", { name: /research use only/i })).toBeInTheDocument();
  });

  it("moves focus to the first checkbox when shown", async () => {
    render(<EntryGate />);
    const checkboxes = await screen.findAllByRole("checkbox");
    await waitFor(() => expect(checkboxes[0]).toHaveFocus());
  });

  it("traps Tab focus inside the dialog (non-dismissable via Escape)", async () => {
    render(<EntryGate />);
    const checkboxes = await screen.findAllByRole("checkbox");
    await waitFor(() => expect(checkboxes[0]).toHaveFocus());

    const dialog = screen.getByRole("dialog");
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled])',
    );
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(checkboxes[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
