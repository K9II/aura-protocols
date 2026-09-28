import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EntryGate from "@/components/store/EntryGate";
import { TERMS_VERSION } from "@/lib/gate-shared";

function setCookie(v: string) {
  Object.defineProperty(document, "cookie", { value: v, writable: true, configurable: true });
}

describe("EntryGate", () => {
  beforeEach(() => setCookie(""));
  afterEach(() => vi.restoreAllMocks());

  it("shows the gate to a first-time visitor", async () => {
    render(<EntryGate />);
    expect(await screen.findByRole("dialog", { name: /research use only/i })).toBeInTheDocument();
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

  it("keeps Enter disabled until all three boxes and an email are provided", async () => {
    render(<EntryGate />);
    const enter = await screen.findByRole("button", { name: /enter site/i });
    expect(enter).toBeDisabled();
    for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
    expect(enter).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "lab@example.com" } });
    expect(enter).toBeEnabled();
  });

  it("closes on success and shows an error on failure", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "x" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    render(<EntryGate />);
    for (const box of await screen.findAllByRole("checkbox")) fireEvent.click(box);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "lab@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /enter site/i }));
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enter site/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/gate", expect.objectContaining({ method: "POST" }));
  });
});
