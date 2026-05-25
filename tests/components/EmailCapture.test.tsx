import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import EmailCapture from "@/components/EmailCapture";
import { LEAD_MAGNET } from "@/lib/constants";

describe("EmailCapture", () => {
  it("renders the lead magnet title and injects the Beehiiv loader script with the configured form id", async () => {
    const { container } = render(<EmailCapture />);
    expect(screen.getByText(LEAD_MAGNET.title)).toBeInTheDocument();
    const script = container.querySelector(
      `script[data-beehiiv-form="${LEAD_MAGNET.beehiivFormId}"]`,
    ) as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toContain(LEAD_MAGNET.beehiivLoaderSrc);
  });
});
