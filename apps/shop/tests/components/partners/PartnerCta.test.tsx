import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PartnerCta from "@/components/partners/PartnerCta";

describe("PartnerCta", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("offers Apply to visitors who aren't partners", async () => {
    const fetchMock = vi.fn(async () => Response.json({ owner: false, partner: false }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PartnerCta className="s-atc" />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/me/owner", expect.objectContaining({ cache: "no-store" })));
    expect(screen.getByRole("link", { name: "Apply to partner →" })).toHaveAttribute("href", "/partners/apply");
  });

  it("sends a partner to their dashboard", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ owner: false, partner: true })));
    render(<PartnerCta className="s-atc" />);
    const link = await screen.findByRole("link", { name: "Open your dashboard →" });
    expect(link).toHaveAttribute("href", "/partners");
    expect(link).toHaveClass("s-atc");
  });

  it("keeps Apply when the check fails", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("offline"); });
    vi.stubGlobal("fetch", fetchMock);
    render(<PartnerCta />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.getByRole("link", { name: "Apply to partner →" })).toBeInTheDocument();
  });
});
