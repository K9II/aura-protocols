import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HumanCheck from "@/components/account/HumanCheck";

type Opts = { sitekey: string; action: string; callback: (t: string) => void; "expired-callback": () => void };
const turnstile = { render: vi.fn<(el: HTMLElement, o: Opts) => string>(() => "w1"), reset: vi.fn(), remove: vi.fn() };

describe("HumanCheck", () => {
  beforeEach(() => {
    for (const f of Object.values(turnstile)) f.mockClear();
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "1x00000000000000000000AA");
    (window as unknown as { turnstile?: typeof turnstile }).turnstile = turnstile;
  });
  afterEach(() => { vi.unstubAllEnvs(); delete (window as unknown as { turnstile?: unknown }).turnstile; });

  it("renders the widget for the checkout action and passes tokens up", () => {
    const onToken = vi.fn();
    render(<HumanCheck onToken={onToken} resetKey={0} />);
    const opts = turnstile.render.mock.calls[0][1];
    expect(opts).toMatchObject({ sitekey: "1x00000000000000000000AA", action: "checkout" });
    opts.callback("tok");
    expect(onToken).toHaveBeenLastCalledWith("tok");
    opts["expired-callback"]();
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("uses the compact widget on the smallest phones", () => {
    const mm = vi.fn((q: string) => ({ matches: q === "(max-width: 359px)" }));
    vi.stubGlobal("matchMedia", mm);
    render(<HumanCheck onToken={vi.fn()} resetKey={0} />);
    expect(turnstile.render.mock.calls[0][1]).toMatchObject({ size: "compact" });
    vi.unstubAllGlobals();
  });

  it("a new resetKey clears the token and resets the widget", () => {
    const onToken = vi.fn();
    const { rerender } = render(<HumanCheck onToken={onToken} resetKey={0} />);
    rerender(<HumanCheck onToken={onToken} resetKey={1} />);
    expect(turnstile.reset).toHaveBeenCalledWith("w1");
    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  it("says so when there's no site key", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    render(<HumanCheck onToken={vi.fn()} resetKey={0} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/);
    expect(turnstile.render).not.toHaveBeenCalled();
  });
});
